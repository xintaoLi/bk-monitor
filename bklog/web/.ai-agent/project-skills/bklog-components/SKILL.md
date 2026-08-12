---
name: bklog-components
description: Components 地图（目录/全局注册/改动半径）。
---

# Components（最小地图）

## Map

Local: `src/components/`
App-global: `src/global/`
Register: `src/main.js`
UI: `bk-magic-vue`（`bk-*`）
Publishable native WC: `packages/search-input-bar` → `@blueking/bklog-search-input-bar`（零 Vue；字段/推荐/UI→SQL/AI 经 `services` 注入；收藏/IP 走 slot）

## ChangeImpact（只写层级）

- Reusable component → `src/components/<kebab>/`（`index.(tsx|vue)` + `index.scss`）
- App-shell component → `src/global/`
- Global registration change → `src/main.js`
- 跨项目搜索条 → `packages/search-input-bar`（勿把 Vuex/`$http` 写回包内）

## Boundaries（否定约束）

- No business API in component
- No duplicated component before search in `src/components/`
- `search-input-bar` 禁止依赖 Vue / bk-magic-vue；日志侧检索入口仍为 `retrieve-v3/search-bar`（尚未切换）

## Refs（按需读取）

`components-reference.md`
