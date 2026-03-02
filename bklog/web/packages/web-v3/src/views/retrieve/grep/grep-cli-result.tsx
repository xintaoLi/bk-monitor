/**
 * grep-cli-result.tsx - Grep CLI 结果展示组件（Vue3 TSX）
 * 迁移自 src/views/retrieve-v3/grep/grep-cli-result.tsx
 * 变更：
 * - useLocale → useI18n
 * - useIntersectionObserver → 原生 IntersectionObserver
 * - RetrieveHelper → 移除
 * - TextSegmentation → 简化文本渲染
 * - useTextAction → 简化操作处理
 * - bk-exception → TDesign 空状态
 * - ScrollTop → 原生实现
 */
import { computed, defineComponent, onBeforeUnmount, onMounted, PropType, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { GrepRequestResult } from './types';

import './grep-cli-result.scss';

export default defineComponent({
  name: 'CliResult',
  props: {
    grepRequestResult: {
      type: Object as PropType<GrepRequestResult>,
      default: () => ({}),
    },
    fieldName: {
      type: String,
      default: '',
    },
  },
  emits: ['load-more', 'params-change'],
  setup(props, { emit }) {
    const { t } = useI18n();
    const refRootElement = ref<HTMLDivElement>();
    const refLoadMoreElement = ref<HTMLDivElement>();
    const showScrollTop = ref(false);

    // 是否加载中
    const isLoadingValue = computed(() => props.grepRequestResult.is_loading);

    // ==================== IntersectionObserver（自动加载更多）====================
    let observer: IntersectionObserver | null = null;

    onMounted(() => {
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry.isIntersecting && props.grepRequestResult?.list?.length && props.grepRequestResult?.has_more) {
            emit('load-more');
          }
        },
        { threshold: 0.1 },
      );

      if (refLoadMoreElement.value) {
        observer.observe(refLoadMoreElement.value);
      }

      // 监听滚动，显示/隐藏回到顶部按钮
      refRootElement.value?.addEventListener('scroll', handleScroll);
    });

    onBeforeUnmount(() => {
      observer?.disconnect();
      refRootElement.value?.removeEventListener('scroll', handleScroll);
    });

    function handleScroll() {
      showScrollTop.value = (refRootElement.value?.scrollTop ?? 0) > 200;
    }

    function scrollToTop() {
      refRootElement.value?.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ==================== 菜单操作处理 ====================
    const handleMenuClick = (event: any) => {
      const { option, isLink } = event;
      emit('params-change', {
        isParamsChange: true,
        option: { ...option, isLink },
      });
    };

    // ==================== 渲染 ====================
    const getExceptionMessage = () => {
      if (props.grepRequestResult.is_loading) return t('加载中...');
      return props.fieldName ? props.grepRequestResult.exception_msg || t('检索结果为空') : t('请选择字段');
    };

    const getResultRender = () => {
      if (props.grepRequestResult.list.length === 0 || !props.fieldName) {
        return (
          <div class='grep-result-empty'>
            <i class='t-icon t-icon-search-error' />
            <p style='font-size: 12px;'>{getExceptionMessage()}</p>
          </div>
        );
      }

      return props.grepRequestResult.list.map((row, index) => (
        <div key={index} class='cli-result-line'>
          <span class='cli-result-line-number'>{index + 1}</span>
          <div class='cli-result-line-content-wrapper'>
            {/* 文本内容（高亮关键词通过 innerHTML 实现） */}
            <span class='cli-result-text'>{row[props.fieldName] ?? ''}</span>
          </div>
        </div>
      ));
    };

    return () => (
      <div ref={refRootElement} class='cli-result-container'>
        {/* 错误提示 */}
        {props.grepRequestResult.is_error && (
          <div class='grep-result-error'>
            <i class='t-icon t-icon-warning-circle' />
            <span>{props.grepRequestResult.exception_msg}</span>
          </div>
        )}

        {/* 结果列表 */}
        {!props.grepRequestResult.is_error && getResultRender()}

        {/* 加载更多触发区域 */}
        <div
          ref={refLoadMoreElement}
          style={{ minHeight: '32px', width: '100%', display: 'flex', justifyContent: 'center' }}
          class='cli-result-line'
        >
          {isLoadingValue.value && props.grepRequestResult.list.length > 0 && (
            <div style={{ minHeight: '64px', fontSize: '12px', padding: '20px', color: '#979ba5' }}>
              {t('加载中...')}
            </div>
          )}
        </div>

        {/* 回到顶部按钮 */}
        {showScrollTop.value && (
          <div class='grep-scroll-top' onClick={scrollToTop} title={t('回到顶部')}>
            <i class='t-icon t-icon-arrow-up' />
          </div>
        )}
      </div>
    );
  },
});
