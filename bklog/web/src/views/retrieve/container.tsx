/*
 * Tencent is pleased to support the open source community by making
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) available.
 *
 * Copyright (C) 2021 THL A29 Limited, a Tencent company.  All rights reserved.
 *
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) is licensed under the MIT License.
 *
 * License for 蓝鲸智云PaaS平台 (BlueKing PaaS):
 *
 * ---------------------------------------------------
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 * documentation files (the "Software"), to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
 * to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of
 * the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
 * THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
 * CONTRACT, TORT OR OTHERWISE, ARISING FROM OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

import { defineComponent, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router/composables';

import { generateIframeSrcdoc, validateResources } from './helper';

/**
 * Vue2 挂载容器组件
 * 使用 iframe 做隔离，加载 @blueking/log-web 包中的 Vue2 应用
 * iframe 中的 location 直接代理父级的 location，保证 URL 一致
 */
export default defineComponent({
  name: 'Vue2Container',
  setup() {
    const route = useRoute();
    const router = useRouter();

    const iframeRef = ref<HTMLIFrameElement | null>(null);
    const loading = ref(true);
    const error = ref<string | null>(null);
    let messageHandler: ((_evt: MessageEvent) => void) | null = null;

    // 解析 hash 中的查询参数
    const parseHashQuery = (hash: string) => {
      const query: Record<string, string> = {};
      if (!hash) {
        return query;
      }

      const hashParts = hash.split('?');
      if (hashParts.length > 1) {
        const queryString = hashParts[1];
        const params = new URLSearchParams(queryString);
        for (const [key, value] of params) {
          query[key] = value;
        }
      }
      return query;
    };

    // 同步 hash 到 iframe（仅在初始化时使用）
    const syncHashToIframe = (iframeWindow: Window, hash: string) => {
      const iframeWin = iframeWindow as any;
      if (!iframeWin.updateHashRoute) {
        return;
      }

      const hashPath = hash.startsWith('#') ? hash.substring(1) : hash;
      const query = parseHashQuery(hash);

      iframeWin.updateHashRoute({
        hash: hashPath,
        path: hashPath.split('?')[0],
        query,
        state: window.history.state,
      });
    };

    // 初始化 iframe
    const initIframe = async () => {
      try {
        // 先验证资源是否存在
        loading.value = true;
        error.value = null;

        const validation = await validateResources();
        if (!validation.valid) {
          loading.value = false;
          error.value = validation.error || '资源验证失败';
          return;
        }

        if (!iframeRef.value) {
          return;
        }

        // 生成 srcdoc 内容
        const srcdoc = generateIframeSrcdoc(process.env.NODE_ENV !== 'production');

        // 使用 srcdoc 模式
        iframeRef.value.srcdoc = srcdoc;

        // 设置消息监听和初始化同步
        const setupIframeSync = (iframeWindow: Window) => {
          let hashSynced = false;
          const MAX_RETRY_COUNT = 50; // 最大重试次数（5秒）
          const RETRY_INTERVAL = 100; // 重试间隔（100ms）
          let retryCount = 0;

          // 尝试同步 hash 到 iframe
          const trySyncHash = () => {
            const iframeWin = iframeWindow as any;
            if (iframeWin.updateHashRoute) {
              const currentHash = route.hash;

              if (currentHash) {
                syncHashToIframe(iframeWindow, currentHash);
              }
              hashSynced = true;
              return true;
            }
            return false;
          };

          // 轮询检查 updateHashRoute 是否可用
          const pollForUpdateHashRoute = () => {
            if (hashSynced) {
              return;
            }

            if (trySyncHash()) {
              return;
            }

            retryCount += 1;
            if (retryCount < MAX_RETRY_COUNT) {
              setTimeout(pollForUpdateHashRoute, RETRY_INTERVAL);
            }
          };

          // 监听来自 iframe 的消息
          messageHandler = (evt: MessageEvent) => {
            // 验证消息来源是否是 iframe 窗口，且消息包含正确的 source 标识
            const isFromIframe = evt.source === iframeWindow;
            const hasValidSource = evt.data?.source === 'vue2-container';

            // 处理来自 iframe 的消息
            if (isFromIframe && hasValidSource) {
              if (evt.data.type === 'vue2-app-loaded') {
                loading.value = false;
                error.value = null;
                // Vue2 应用已完全加载，此时 updateHashRoute 应该已经可用
                // 立即尝试同步 hash，如果失败则启动轮询
                if (!hashSynced) {
                  if (!trySyncHash()) {
                    // 如果立即同步失败，启动轮询（作为备用方案）
                    pollForUpdateHashRoute();
                  }
                }
              }

              if (evt.data.type === 'vue2-app-error') {
                loading.value = false;
                error.value = evt.data.error || '加载失败';
              }

              if (evt.data.type === 'sync-route-params') {
                const { swtichVersion, query, params } = evt.data.payload;

                router
                  .replace({
                    query: { ...route.query, ...(query || {}) },
                    params: { ...route.params, ...(params || {}) },
                  })
                  .then(() => {
                    if (swtichVersion) {
                      localStorage.setItem('retrieve_version', 'v3');
                      window.location.reload();
                    }
                  });
              }
            }
          };

          window.addEventListener('message', messageHandler);

          // 启动轮询检查（作为备用方案，如果消息机制失败）
          // 如果收到 'vue2-app-loaded' 消息，会在消息处理中同步 hash
          pollForUpdateHashRoute();
        };

        // 等待 iframe 加载后设置初始同步
        iframeRef.value.onload = () => {
          const iframeWindow = iframeRef.value?.contentWindow;
          if (iframeWindow) {
            setupIframeSync(iframeWindow);
          }
          loading.value = false;
        };
      } catch (err: any) {
        loading.value = false;
        error.value = err.message || '初始化失败';
      }
    };

    watch(
      () => [route.query.spaceUid, route.query.bizId],
      ([spaceUid, bkBizId], [oldSpaceUid, oldBkBizId]) => {
        if (spaceUid !== oldSpaceUid || bkBizId !== oldBkBizId) {
          const iframeWindow = iframeRef.value?.contentWindow;
          // 转发消息到 iframe
          iframeWindow?.postMessage(
            {
              type: 'update-route-params',
              payload: { spaceUid, bkBizId },
            },
            '*',
          );
        }
      },
    );

    onMounted(() => {
      void initIframe();
    });

    onUnmounted(() => {
      // 清理事件监听器
      if (messageHandler) {
        window.removeEventListener('message', messageHandler);
        messageHandler = null;
      }
    });

    return () => (
      <div
        class='vue2-container'
        style='width: 100%; height: 100%; position: relative;'
      >
        {loading.value && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f5f6fa',
              zIndex: 10,
            }}
          >
            <div style={{ fontSize: '14px', color: '#63656e' }}>加载中...</div>
          </div>
        )}
        {error.value && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f5f6fa',
              zIndex: 10,
            }}
          >
            <div style={{ fontSize: '14px', color: '#ea3636' }}>加载失败: {error.value}</div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: loading.value || error.value ? 'none' : 'block',
          }}
          // 安全警告：同时使用 allow-scripts 和 allow-same-origin 会绕过沙箱保护
          // 当前实现需要这两个权限的原因：
          // 1. allow-scripts: 必需，用于运行 Vue2 应用
          // 2. allow-same-origin: 必需，用于访问 window.parent.location 实现 location 代理
          // 安全缓解措施：
          // - iframe 内容通过 srcdoc 注入，完全由父页面控制
          // - iframe 和父页面来自同一 origin（同源策略）
          // - 未来可以考虑移除 allow-same-origin，改用 postMessage 通信机制
          sandbox='allow-same-origin allow-scripts allow-forms allow-popups allow-modals'
        />
      </div>
    );
  },
});
