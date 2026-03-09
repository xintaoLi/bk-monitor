#!/bin/bash

# 修复 use-app-init.tsx 中的 store 引用

FILE="/root/clawd/bk-monitor/bklog/web/packages/web-v3/src/views/retrieve/use-app-init.tsx"

echo "修复 use-app-init.tsx..."

# 替换 store.state.storage -> storageStore
sed -i 's/store\.state\.storage/storageStore/g' "$FILE"

# 替换 store.state.retrieve.flatIndexSetList -> retrieveStore.flatIndexSetList
sed -i 's/store\.state\.retrieve\.flatIndexSetList/retrieveStore.flatIndexSetList/g' "$FILE"

# 替换 store.commit('updateIndexItem' -> retrieveStore.updateIndexItem(
sed -i "s/store\.commit('updateIndexItem'/retrieveStore.updateIndexItem(/g" "$FILE"
sed -i 's/store\.commit("updateIndexItem"/retrieveStore.updateIndexItem(/g' "$FILE"

# 替换 store.commit('updateSpace' -> globalStore.setSpaceUid(
sed -i "s/store\.commit('updateSpace'/globalStore.setSpaceUid(/g" "$FILE"
sed -i 's/store\.commit("updateSpace"/globalStore.setSpaceUid(/g' "$FILE"

# 替换 store.commit('updateIndexSetQueryResult' -> retrieveStore.updateIndexSetQueryResult(
sed -i "s/store\.commit('updateIndexSetQueryResult'/retrieveStore.updateIndexSetQueryResult(/g" "$FILE"
sed -i 's/store\.commit("updateIndexSetQueryResult"/retrieveStore.updateIndexSetQueryResult(/g' "$FILE"

# 替换 store.commit('updateUnionIndexList' -> retrieveStore.updateUnionIndexList(
sed -i "s/store\.commit('updateUnionIndexList'/retrieveStore.updateUnionIndexList(/g" "$FILE"
sed -i 's/store\.commit("updateUnionIndexList"/retrieveStore.updateUnionIndexList(/g' "$FILE"

# 替换 store.getters.isUnionSearch -> retrieveStore.isUnionSearch
sed -i 's/store\.getters\.isUnionSearch/retrieveStore.isUnionSearch/g' "$FILE"

# 替换 globalStore.updateState -> globalStore.updateState
sed -i 's/globalStore\.updateState(/globalStore.updateState(/g' "$FILE"

# 替换 retrieveStore.getFavoriteList -> retrieveStore.fetchFavoriteList
sed -i 's/retrieveStore\.getFavoriteList/retrieveStore.fetchFavoriteList/g' "$FILE"

echo "完成修复 use-app-init.tsx"
