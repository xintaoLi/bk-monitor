/**
 * index.tsx - 检索主页面（Vue3 TSX）
 * 对齐原 src/views/retrieve-v3/index.tsx 功能：
 * - 收藏夹面板（左侧）
 * - 搜索栏（顶部）
 * - 工具栏（搜索栏下方）
 * - 搜索结果（主区域）
 * - 加载状态
 */

import { defineComponent } from 'vue';
import { useRetrieveInit } from './composables/use-retrieve-init';
import FavoritePanel from './components/favorite-panel';
import SearchBar from './components/search-bar';
import SearchToolbar from './components/search-toolbar';
import SearchResult from './components/search-result';
import './index.scss';

export default defineComponent({
  name: 'RetrieveView',
  setup() {
    const {
      isPreApiLoaded,
      isFavoriteShown,
      stickyStyle,
      contentStyle,
      isSearchContextStickyTop,
      isSearchResultStickyTop,
      handleSearchBarHeightChange,
      handleTrendGraphHeightChange,
      handleFavoriteWidthChange,
      handleFavoriteShownChange,
    } = useRetrieveInit();

    return () => (
      <div
        class={[
          'retrieve-view',
          isSearchContextStickyTop.value && 'is-sticky-top',
          isSearchResultStickyTop.value && 'is-sticky-top-result',
        ]}
        style={stickyStyle.value}
      >
        {/* 左侧收藏夹面板 */}
        <FavoritePanel
          show={isFavoriteShown.value}
          onWidthChange={handleFavoriteWidthChange}
          onShowChange={handleFavoriteShownChange}
        />

        {/* 主内容区 */}
        <div class='retrieve-view__content' style={contentStyle.value}>
          {isPreApiLoaded.value ? (
            <>
              {/* 搜索栏 */}
              <SearchBar
                class={[
                  isSearchContextStickyTop.value && 'is-sticky-top',
                  isSearchResultStickyTop.value && 'is-sticky-top-result',
                ]}
                onHeightChange={handleSearchBarHeightChange}
              />

              {/* 工具栏 */}
              <SearchToolbar onTrendHeightChange={handleTrendGraphHeightChange} />

              {/* 搜索结果 */}
              <SearchResult />
            </>
          ) : (
            <div class='retrieve-view__loading'>
              <div class='loading-spinner' />
            </div>
          )}
        </div>
      </div>
    );
  },
});
