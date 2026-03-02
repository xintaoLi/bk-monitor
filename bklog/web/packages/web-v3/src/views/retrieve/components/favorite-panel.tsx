/**
 * favorite-panel.tsx - 收藏夹面板（Vue3 TSX）
 * 对齐原 src/views/retrieve-v3/favorite/index.tsx 功能：
 * - 收藏夹分组展示
 * - 收藏项点击（恢复检索参数）
 * - 拖拽调整宽度
 */

import { computed, defineComponent, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useRetrieveStore } from '@/stores/retrieve';
import type { FavoriteItem } from '@/types';
import './favorite-panel.scss';

export default defineComponent({
  name: 'FavoritePanel',
  props: {
    show: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['widthChange', 'showChange'],
  setup(props, { emit }) {
    const { t } = useI18n();
    const retrieveStore = useRetrieveStore();
    const { favoriteGroups, isFavoriteLoading } = storeToRefs(retrieveStore);

    const expandedGroups = ref<Set<string | number>>(new Set());
    const searchKeyword = ref('');

    // 过滤收藏项
    const filteredGroups = computed(() => {
      const keyword = searchKeyword.value.toLowerCase();
      if (!keyword) return favoriteGroups.value;
      return favoriteGroups.value
        .map((group) => ({
          ...group,
          favorites: (group.favorites || []).filter((item) =>
            item.name.toLowerCase().includes(keyword),
          ),
        }))
        .filter((group) => group.favorites.length > 0);
    });

    function toggleGroup(groupId: string | number) {
      if (expandedGroups.value.has(groupId)) {
        expandedGroups.value.delete(groupId);
      } else {
        expandedGroups.value.add(groupId);
      }
      expandedGroups.value = new Set(expandedGroups.value);
    }

    function handleFavoriteClick(item: FavoriteItem) {
      // 恢复收藏的检索参数
      if (item.params) {
        retrieveStore.updateIndexItem(item.params);
      }
    }

    function handleTogglePanel() {
      emit('showChange', !props.show);
    }

    // 拖拽调整宽度
    let isDragging = false;
    let startX = 0;
    let startWidth = 240;

    function handleDragStart(e: MouseEvent) {
      isDragging = true;
      startX = e.clientX;
      startWidth = 240; // 从当前宽度开始

      const onMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        const diff = e.clientX - startX;
        const newWidth = Math.min(Math.max(startWidth + diff, 180), 400);
        emit('widthChange', newWidth);
      };

      const onMouseUp = () => {
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    }

    return () => (
      <div class={['favorite-panel', !props.show && 'is-hidden']}>
        {/* 收起/展开按钮 */}
        <div class='favorite-panel__toggle' onClick={handleTogglePanel}>
          <i class={`t-icon ${props.show ? 't-icon-chevron-left' : 't-icon-chevron-right'}`} />
        </div>

        {props.show && (
          <>
            {/* 标题 */}
            <div class='favorite-panel__header'>
              <span class='header-title'>{t('收藏')}</span>
            </div>

            {/* 搜索 */}
            <div class='favorite-panel__search'>
              <input
                v-model={searchKeyword.value}
                placeholder={t('搜索收藏')}
                class='search-input'
              />
            </div>

            {/* 收藏列表 */}
            <div class='favorite-panel__list'>
              {isFavoriteLoading.value ? (
                <div class='list-loading'>{t('加载中...')}</div>
              ) : filteredGroups.value.length ? (
                filteredGroups.value.map((group) => (
                  <div key={group.id} class='favorite-group'>
                    {/* 分组标题 */}
                    <div
                      class='group-header'
                      onClick={() => toggleGroup(group.id)}
                    >
                      <i class={`t-icon ${expandedGroups.value.has(group.id) ? 't-icon-chevron-down' : 't-icon-chevron-right'}`} />
                      <span class='group-name'>{group.name}</span>
                      <span class='group-count'>{group.favorites?.length || 0}</span>
                    </div>

                    {/* 收藏项 */}
                    {expandedGroups.value.has(group.id) && (
                      <div class='group-items'>
                        {(group.favorites || []).map((item) => (
                          <div
                            key={item.id}
                            class='favorite-item'
                            title={item.name}
                            onClick={() => handleFavoriteClick(item)}
                          >
                            <i class='t-icon t-icon-star-filled' />
                            <span class='item-name'>{item.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div class='list-empty'>{t('暂无收藏')}</div>
              )}
            </div>

            {/* 拖拽调整宽度手柄 */}
            <div class='favorite-panel__resizer' onMousedown={handleDragStart} />
          </>
        )}
      </div>
    );
  },
});
