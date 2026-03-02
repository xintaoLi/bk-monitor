/**
 * head-nav.tsx - 顶部导航组件（Vue3 TSX）
 * 对齐原 src/global/head-navi/index.tsx 功能：
 * - 顶部菜单导航（检索/管理/仪表盘/监控）
 * - 空间/业务切换
 * - 用户信息（语言切换、退出登录）
 * - 全局设置入口
 * - 外部版适配
 */

import { computed, defineComponent, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useAppStore } from '@/stores/app';
import type { SpaceItem, MenuItem } from '@/types';
import './head-nav.scss';

// 顶部菜单定义
const TOP_MENUS = [
  { id: 'retrieve', name: '检索', icon: 'log-icon icon-retrieve' },
  { id: 'manage', name: '管理', icon: 'log-icon icon-manage' },
  { id: 'dashboard', name: '仪表盘', icon: 'log-icon icon-dashboard' },
];

export default defineComponent({
  name: 'HeadNav',
  setup() {
    const route = useRoute();
    const router = useRouter();
    const { t } = useI18n();
    const appStore = useAppStore();

    const {
      mySpaceList,
      spaceUid,
      bkBizId,
      userMeta,
      topMenu,
      isExternal,
      externalMenu,
    } = storeToRefs(appStore);

    // 空间选择搜索关键词
    const spaceSearchKeyword = ref('');
    const spaceDropdownVisible = ref(false);
    const userDropdownVisible = ref(false);

    // 当前激活的顶部菜单
    const activeTopMenuId = computed(() => {
      const matched = route.matched;
      for (const menu of TOP_MENUS) {
        if (matched.some((r) => String(r.name)?.startsWith(menu.id) || r.meta?.navId === menu.id)) {
          return menu.id;
        }
      }
      return '';
    });

    // 过滤后的空间列表
    const filteredSpaceList = computed(() => {
      const keyword = spaceSearchKeyword.value.toLowerCase();
      if (!keyword) return mySpaceList.value;
      return mySpaceList.value.filter(
        (item) =>
          item.space_name.toLowerCase().includes(keyword) ||
          String(item.bk_biz_id).includes(keyword) ||
          item.space_uid.toLowerCase().includes(keyword),
      );
    });

    // 当前空间名称
    const currentSpaceName = computed(() => {
      const space = mySpaceList.value.find((item) => item.space_uid === spaceUid.value);
      return space?.space_name || spaceUid.value || '-';
    });

    // 可见的顶部菜单（外部版过滤）
    const visibleMenus = computed(() => {
      if (!isExternal.value) return TOP_MENUS;
      return TOP_MENUS.filter((menu) => externalMenu.value.includes(menu.id));
    });

    // 切换顶部菜单
    function handleMenuClick(menuId: string) {
      router.push({
        name: menuId,
        query: { spaceUid: spaceUid.value, bizId: String(bkBizId.value) },
      });
    }

    // 切换空间
    function handleSpaceChange(space: SpaceItem) {
      spaceDropdownVisible.value = false;
      spaceSearchKeyword.value = '';

      const query = {
        ...route.query,
        spaceUid: space.space_uid,
        bizId: String(space.bk_biz_id),
      };

      appStore.updateSpace(space.space_uid, space.bk_biz_id);

      // 刷新当前页面
      router.push({
        name: String(route.name || 'retrieve'),
        query,
      });
    }

    // 切换语言
    function handleLanguageChange(lang: string) {
      document.cookie = `blueking_language=${lang}; path=/`;
      window.location.reload();
    }

    // 退出登录
    function handleLogout() {
      const loginUrl = window.LOGIN_SERVICE_URL || window.BK_LOGIN_URL;
      if (loginUrl) {
        window.location.href = `${loginUrl}?c_url=${encodeURIComponent(window.location.href)}`;
      }
    }

    // 打开全局设置
    function handleOpenGlobalSetting() {
      appStore.openGlobalSetting();
    }

    return () => (
      <header class='head-nav'>
        {/* Logo */}
        <div class='head-nav__logo'>
          <img src='/static/dist/img/new-logo.svg' alt='logo' class='logo-img' />
          <span class='logo-title'>{t('日志平台')}</span>
        </div>

        {/* 顶部菜单 */}
        <nav class='head-nav__menu'>
          {visibleMenus.value.map((menu) => (
            <div
              key={menu.id}
              class={['menu-item', activeTopMenuId.value === menu.id && 'is-active']}
              onClick={() => handleMenuClick(menu.id)}
            >
              <i class={menu.icon} />
              <span>{t(menu.name)}</span>
            </div>
          ))}
        </nav>

        {/* 右侧操作区 */}
        <div class='head-nav__right'>
          {/* 空间/业务选择 */}
          <div class='space-selector'>
            <div
              class='space-selector__trigger'
              onClick={() => (spaceDropdownVisible.value = !spaceDropdownVisible.value)}
            >
              <span class='space-name'>{currentSpaceName.value}</span>
              <i class='t-icon t-icon-chevron-down' />
            </div>

            {spaceDropdownVisible.value && (
              <div class='space-selector__dropdown'>
                <div class='dropdown-search'>
                  <input
                    v-model={spaceSearchKeyword.value}
                    placeholder={t('搜索空间')}
                    class='search-input'
                    onClick={(e: Event) => e.stopPropagation()}
                  />
                </div>
                <ul class='space-list'>
                  {filteredSpaceList.value.map((space) => (
                    <li
                      key={space.space_uid}
                      class={['space-item', space.space_uid === spaceUid.value && 'is-active']}
                      onClick={() => handleSpaceChange(space)}
                    >
                      <span class='space-item__name'>{space.space_name}</span>
                      <span class='space-item__uid'>{space.space_uid}</span>
                    </li>
                  ))}
                  {!filteredSpaceList.value.length && (
                    <li class='space-item space-item--empty'>{t('暂无数据')}</li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* 全局设置 */}
          <div class='head-nav__icon-btn' title={t('全局设置')} onClick={handleOpenGlobalSetting}>
            <i class='t-icon t-icon-setting' />
          </div>

          {/* 用户信息 */}
          <div class='user-info'>
            <div
              class='user-info__trigger'
              onClick={() => (userDropdownVisible.value = !userDropdownVisible.value)}
            >
              <i class='t-icon t-icon-user-circle' />
              <span class='username'>{userMeta.value.username}</span>
            </div>
            {userDropdownVisible.value && (
              <div class='user-info__dropdown'>
                <div class='dropdown-item' onClick={() => handleLanguageChange('zh-cn')}>
                  中文
                </div>
                <div class='dropdown-item' onClick={() => handleLanguageChange('en')}>
                  English
                </div>
                <div class='dropdown-divider' />
                <div class='dropdown-item dropdown-item--danger' onClick={handleLogout}>
                  {t('退出登录')}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    );
  },
});
