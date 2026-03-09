# BKLog Web-v3 组件库升级指南

> **升级目标**：`bk-magic-vue` (Vue2) → `bkui-vue@2.0.2-beta.104` (Vue3 蓝鲸官方组件库)
>
> **文档背景**：本指南基于 2026-03-09 完成的 TDesign 迁移工作整理，将迁移目标从 TDesign 调整为 bkui-vue3，提供完整的组件映射和代码示例。

---

## 目录

1. [安装依赖](#1-安装依赖)
2. [全局注册配置](#2-全局注册配置)
3. [Vite 配置（自动导入）](#3-vite-配置自动导入)
4. [组件映射速查表](#4-组件映射速查表)
5. [命令式 API（消息/通知/弹框）](#5-命令式-api消息通知弹框)
6. [逐组件迁移细节](#6-逐组件迁移细节)
7. [Table 重构指南](#7-table-重构指南)
8. [Form 验证迁移](#8-form-验证迁移)
9. [TypeScript 类型迁移](#9-typescript-类型迁移)
10. [Batch 替换脚本](#10-batch-替换脚本)
11. [验证清单](#11-验证清单)

---

## 1. 安装依赖

```bash
# 卸载旧依赖
npm uninstall bk-magic-vue

# 安装目标版本
npm install bkui-vue@2.0.2-beta.104

# 可选：图标包（如有单独使用）
npm install @bkui-vue/icon@2.0.2-beta.104
```

**package.json 变更：**

```diff
-  "bk-magic-vue": "^2.x",
+  "bkui-vue": "2.0.2-beta.104",
```

---

## 2. 全局注册配置

### main.ts

```typescript
import { createApp } from 'vue';
import bkui from 'bkui-vue';
import 'bkui-vue/dist/style.css';  // 全量样式
import App from './App.vue';

const app = createApp(App);
app.use(bkui);
app.mount('#app');
```

### 按需注册（推荐）

```typescript
import { createApp } from 'vue';
import { Button, Dialog, Table, Form, Message } from 'bkui-vue';
// 样式仍需全量引入或配合 vite 插件按需加载
import 'bkui-vue/dist/style.css';

const app = createApp(App);
[Button, Dialog, Table, Form].forEach(comp => app.use(comp));
```

---

## 3. Vite 配置（自动导入）

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';

// bkui-vue 暂无官方 resolver，使用手动方式或自定义 resolver
function BkuiVueResolver() {
  return {
    type: 'component' as const,
    resolve: (name: string) => {
      if (name.startsWith('Bk')) {
        return { name, from: 'bkui-vue' };
      }
    },
  };
}

export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    AutoImport({
      imports: ['vue', 'vue-router', 'pinia'],
      dts: 'src/types/auto-imports.d.ts',
    }),
    Components({
      resolvers: [BkuiVueResolver()],
      dts: 'src/types/components.d.ts',
    }),
  ],
  css: {
    preprocessorOptions: {
      less: {
        // 如需自定义主题变量
        // additionalData: `@import "@/styles/variables.less";`,
      },
    },
  },
});
```

---

## 4. 组件映射速查表

| bk-magic-vue (Vue2) | bkui-vue3 导出名 | 组件标签 | 备注 |
|---|---|---|---|
| `Button` | `Button` | `<Button>` | API 兼容 |
| `Input` | `Input` | `<Input>` | API 兼容 |
| `Select` | `Select` | `<Select>` | API 兼容 |
| `Option` | 来自 Select | `<Option>` | `import { Option } from 'bkui-vue/lib/select'` |
| `Tag` | `Tag` | `<Tag>` | API 兼容 |
| `Alert` | `Alert` | `<Alert>` | API 兼容 |
| `Checkbox` | `Checkbox` | `<Checkbox>` | API 兼容 |
| `Form` | `Form` | `<Form>` | API 兼容，见 §8 |
| `FormItem` | `FormItem` | `<FormItem>` | 来自 Form 子导出 |
| `Dialog` | `Dialog` | `<Dialog>` | `isShow` 保持，见 §6 |
| `Sideslider` | `Sideslider` | `<Sideslider>` | `isShow` 保持，见 §6 |
| `Tab` | `Tab` | `<Tab>` | API 兼容 |
| `TabPanel` | `TabPanel` | `<TabPanel>` | 来自 Tab 子导出 |
| `Table` | `Table` | `<Table>` | 需改为 columns prop，见 §7 |
| `TableColumn` | ❌ 无 | — | 改为 `columns` 数组 prop |
| `Switcher` | `Switcher` | `<Switcher>` | 用 `v-model` 绑定 |
| `Popover` | `Popover` | `<Popover>` | API 兼容 |
| `Card` | `Card` | `<Card>` | API 兼容 |
| `Menu` | `Menu` | `<Menu>` | API 兼容 |
| `Pagination` | `Pagination` | `<Pagination>` | API 兼容 |
| `Loading` | `Loading` | `<Loading>` 或指令 | API 兼容 |
| `Exception` | `Exception` | `<Exception>` | 原 bk-exception |
| `Collapse` | `Collapse` | `<Collapse>` | API 兼容 |
| `CollapseItem` | `CollapsePanel` | `<CollapsePanel>` | **⚠️ 名称变更** |
| `Dropdown` | `Dropdown` | `<Dropdown>` | API 兼容 |
| `Steps` | `Steps` | `<Steps>` | API 兼容 |
| `Breadcrumb` | `Breadcrumb` | `<Breadcrumb>` | API 兼容 |
| `Tree` | `Tree` | `<Tree>` | API 兼容 |
| `Upload` | `Upload` | `<Upload>` | API 兼容 |
| `DatePicker` | `DatePicker` | `<DatePicker>` | API 兼容 |
| `TimePicker` | `TimePicker` | `<TimePicker>` | API 兼容 |
| `Badge` | `Badge` | `<Badge>` | API 兼容 |
| `Progress` | `Progress` | `<Progress>` | API 兼容 |
| `Radio` | `Radio` | `<Radio>` | API 兼容 |
| `Slider` | `Slider` | `<Slider>` | API 兼容 |
| `TagInput` | `TagInput` | `<TagInput>` | API 兼容 |
| `Transfer` | `Transfer` | `<Transfer>` | API 兼容 |

### 命令式 API 映射

| bk-magic-vue | bkui-vue3 | 备注 |
|---|---|---|
| `this.$bkMessage(opts)` | `Message(opts)` | 导入 `Message` from `bkui-vue` |
| `this.$bkNotify(opts)` | `Notify(opts)` | 导入 `Notify` from `bkui-vue` |
| `this.$bkInfo(opts)` | `InfoBox(opts)` | 导入 `InfoBox` from `bkui-vue` |
| `this.$bkLoading(opts)` | `Loading(opts)` | 导入 `Loading` from `bkui-vue` |

---

## 5. 命令式 API（消息/通知/弹框）

### Message（消息提示）

```typescript
// bk-magic-vue（旧）
this.$bkMessage({ theme: 'success', message: '操作成功' });
this.$bkMessage({ theme: 'error', message: '操作失败' });

// bkui-vue3（新）
import { Message } from 'bkui-vue';

Message({ theme: 'success', message: '操作成功' });
Message({ theme: 'error', message: '操作失败' });
Message.success('操作成功');  // 快捷方式
Message.error('操作失败');
Message.warning('注意');
Message.loading('加载中...');
```

### Notify（通知）

```typescript
// bk-magic-vue（旧）
this.$bkNotify({ title: '标题', message: '通知内容', theme: 'success' });

// bkui-vue3（新）
import { Notify } from 'bkui-vue';

Notify({ title: '标题', message: '通知内容', theme: 'success' });
```

### InfoBox（确认弹框，原 bkInfoBox / $bkInfo）

```typescript
// bk-magic-vue（旧）
this.$bkInfo({
  title: '确认删除？',
  confirmFn: () => { /* 确认回调 */ },
  cancelFn: () => { /* 取消回调 */ },
});

// bkui-vue3（新）
import { InfoBox } from 'bkui-vue';

const instance = InfoBox({
  title: '确认删除？',
  content: '删除后不可恢复',
  onConfirm: () => { /* 确认回调 */ },
  onClosed: () => { /* 关闭回调 */ },
});

// 手动控制
instance.show();
instance.hide();
instance.update({ title: '新标题' });
instance.destroy();
```

---

## 6. 逐组件迁移细节

### Dialog

```tsx
// 旧（bk-magic-vue）
<Dialog
  v-model="isVisible"
  title="标题"
  width="640"
  :quick-close="false"
  @confirm="handleConfirm"
  @cancel="handleCancel"
>
  内容
</Dialog>

// 新（bkui-vue3）
<Dialog
  v-model:isShow="isVisible"
  title="标题"
  :width="640"
  :quick-close="false"
  @confirm="handleConfirm"
  @closed="handleCancel"
>
  内容
</Dialog>
```

**变更要点：**
- `v-model` → `v-model:isShow`
- `@cancel` → `@closed`（关闭事件名变更）
- `width` 支持 `String | Number`

### Sideslider（侧滑抽屉）

```tsx
// 旧（bk-magic-vue）
<Sideslider
  :is-show.sync="isVisible"
  title="标题"
  :width="400"
  :quick-close="true"
>
  <template #content>内容</template>
</Sideslider>

// 新（bkui-vue3）
<Sideslider
  v-model:isShow="isVisible"
  title="标题"
  :width="400"
  :quick-close="true"
>
  <template #default>内容</template>
</Sideslider>
```

**变更要点：**
- `:is-show.sync` → `v-model:isShow`
- slot `#content` → `#default`
- `@update:isShow` 事件可用

### Switcher（开关）

```tsx
// 旧（bk-magic-vue）
<Switcher v-model="enabled" theme="primary" />

// 新（bkui-vue3）
<Switcher v-model="enabled" theme="primary" />
// API 基本兼容，v-model 绑定 modelValue
```

**注意：** bkui-vue3 的 Switcher 同时支持 `value` 和 `modelValue`，v-model 绑定 `modelValue`。

### Tab / TabPanel

```tsx
// 旧（bk-magic-vue）
<Tab v-model="activeTab" type="card">
  <TabPanel name="a" label="Tab A">内容 A</TabPanel>
  <TabPanel name="b" label="Tab B">内容 B</TabPanel>
</Tab>

// 新（bkui-vue3）
import { Tab, TabPanel } from 'bkui-vue';
// TabPanel 需从 tab 子模块导入：
// import { TabPanel } from 'bkui-vue/lib/tab';

<Tab v-model:active="activeTab" type="card">
  <TabPanel name="a" label="Tab A">内容 A</TabPanel>
  <TabPanel name="b" label="Tab B">内容 B</TabPanel>
</Tab>
```

**变更要点：**
- `v-model` → `v-model:active`
- `Tab` 导出名保持，`TabPanel` 作为子导出

### Select / Option

```tsx
// 旧（bk-magic-vue）
import { Select, Option } from 'bk-magic-vue';
<Select v-model="selected">
  <Option v-for="item in list" :key="item.id" :id="item.id" :name="item.name" />
</Select>

// 新（bkui-vue3）
import { Select } from 'bkui-vue';
import Option from 'bkui-vue/lib/select/option';
// 或直接使用 list 数据驱动
<Select v-model="selected" :list="list" id-key="id" display-key="name" />
// 也支持插槽式 Option
<Select v-model="selected">
  <Option v-for="item in list" :key="item.id" :id="item.id" :name="item.name" />
</Select>
```

### CollapseItem → CollapsePanel

```tsx
// 旧（bk-magic-vue）
import { Collapse, CollapseItem } from 'bk-magic-vue';
<Collapse>
  <CollapseItem title="标题" name="1">内容</CollapseItem>
</Collapse>

// 新（bkui-vue3）⚠️ 名称变更
import { Collapse } from 'bkui-vue';
import CollapsePanel from 'bkui-vue/lib/collapse'; // 或 CollapsePanel
<Collapse>
  <CollapsePanel title="标题" name="1">内容</CollapsePanel>
</Collapse>
```

---

## 7. Table 重构指南

`bkui-vue3` 的 Table **不支持** `<TableColumn>` 子组件方式，必须改用 `columns` prop 配置。

### 旧写法（bk-magic-vue）

```tsx
import { Table, TableColumn } from 'bk-magic-vue';

<Table :data="tableData" :pagination="pagination">
  <TableColumn prop="name" label="名称" width="200" />
  <TableColumn prop="status" label="状态">
    <template #default="{ row }">
      <Tag :theme="row.status === 1 ? 'success' : 'danger'">
        {{ row.status === 1 ? '正常' : '异常' }}
      </Tag>
    </template>
  </TableColumn>
  <TableColumn label="操作" width="150">
    <template #default="{ row }">
      <Button text @click="handleEdit(row)">编辑</Button>
      <Button text theme="danger" @click="handleDelete(row)">删除</Button>
    </template>
  </TableColumn>
</Table>
```

### 新写法（bkui-vue3）

```tsx
import { Table } from 'bkui-vue';
import type { TableIColumn } from 'bkui-vue';
import { h } from 'vue';

// 方式一：配合 render 函数（TSX 推荐）
const columns: TableIColumn[] = [
  {
    label: '名称',
    field: 'name',
    width: 200,
  },
  {
    label: '状态',
    field: 'status',
    render: ({ row }: { row: any }) => (
      <Tag theme={row.status === 1 ? 'success' : 'danger'}>
        {row.status === 1 ? '正常' : '异常'}
      </Tag>
    ),
  },
  {
    label: '操作',
    width: 150,
    render: ({ row }: { row: any }) => (
      <div>
        <Button text onClick={() => handleEdit(row)}>编辑</Button>
        <Button text theme='danger' onClick={() => handleDelete(row)}>删除</Button>
      </div>
    ),
  },
];

<Table
  data={tableData}
  columns={columns}
  pagination={pagination}
/>
```

```vue
<!-- 方式二：配合具名插槽（Vue SFC 推荐） -->
<script setup>
const columns = [
  { label: '名称', field: 'name', width: 200 },
  { label: '状态', field: 'status' },
  { label: '操作', field: 'action', width: 150 },
];
</script>

<template>
  <Table :data="tableData" :columns="columns">
    <template #status="{ row }">
      <Tag :theme="row.status === 1 ? 'success' : 'danger'">
        {{ row.status === 1 ? '正常' : '异常' }}
      </Tag>
    </template>
    <template #action="{ row }">
      <Button text @click="handleEdit(row)">编辑</Button>
      <Button text theme="danger" @click="handleDelete(row)">删除</Button>
    </template>
  </Table>
</template>
```

### Table Settings（表格设置）

bkui-vue3 内置了 `settings` prop，无需额外 `TableSettingContent` 组件：

```typescript
const tableSettings = {
  fields: [
    { label: '名称', field: 'name' },
    { label: '状态', field: 'status' },
  ],
  checked: ['name', 'status'],
  showLineHeight: true,
};

// 在 Table 上直接使用
<Table :data="data" :columns="columns" :settings="tableSettings" />
```

---

## 8. Form 验证迁移

```tsx
// 旧（bk-magic-vue）
import { Form, FormItem } from 'bk-magic-vue';

const formRef = ref<InstanceType<typeof Form>>();

// 验证
formRef.value?.validate().then(() => {
  // 通过
}).catch(() => {
  // 不通过
});

// 新（bkui-vue3）
import { Form, FormItem } from 'bkui-vue';

// Form 实例类型
const formRef = ref<InstanceType<typeof Form>>();

// 验证（API 兼容）
formRef.value?.validate().then((result) => {
  // result: { [field: string]: boolean }
}).catch((e) => {
  // 验证失败
});

// 清除验证
formRef.value?.clearValidate();
// 清除指定字段
formRef.value?.clearValidate(['field1', 'field2']);
```

**模板示例：**

```vue
<Form ref="formRef" :model="formData" :rules="formRules">
  <FormItem label="用户名" property="username" required>
    <Input v-model="formData.username" />
  </FormItem>
  <FormItem label="邮箱" property="email">
    <Input v-model="formData.email" type="email" />
  </FormItem>
</Form>
```

**Rules 格式（与 bk-magic-vue 兼容）：**

```typescript
const formRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '长度在 3 到 20 个字符', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' },
  ],
};
```

---

## 9. TypeScript 类型迁移

```typescript
// 旧（bk-magic-vue 无完整 TS 类型）
import type { Form } from 'bk-magic-vue'; // ❌ 可能不存在

// 新（bkui-vue3 完整类型支持）
import type { TableIColumn, TableProps } from 'bkui-vue';
import type { FormProps } from 'bkui-vue/lib/form/type';
import { Form, type FormInstance } from 'bkui-vue';

// Form 实例操作
const formRef = ref<InstanceType<typeof Form>>();
// 等价于
import type { BkForm } from 'bkui-vue';
const formRef = ref<BkForm>();
```

**常用类型速查：**

```typescript
import type {
  TableIColumn,   // Table 列配置类型
  TableProps,     // Table Props 类型
  TableSettings,  // Table 设置类型
  CollapseProps,  // Collapse Props
  CollapsePanelProps, // CollapsePanel Props
  TabProps,       // Tab Props
  TabPanelProps,  // TabPanel Props
} from 'bkui-vue';
```

---

## 10. Batch 替换脚本

以下脚本用于快速完成绝大多数机械性替换，**运行后需人工审查变更**：

```bash
#!/usr/bin/env bash
# migrate-bkui.sh
# 用法：bash migrate-bkui.sh src/

TARGET_DIR="${1:-src}"

echo "🔍 开始扫描 $TARGET_DIR ..."

# 1. 替换 import 来源
find "$TARGET_DIR" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.vue" \) | while read -r file; do

  # 替换 bk-magic-vue → bkui-vue
  sed -i "s/from 'bk-magic-vue'/from 'bkui-vue'/g" "$file"
  sed -i 's/from "bk-magic-vue"/from "bkui-vue"/g' "$file"

  # 组件名称变更
  # CollapseItem → CollapsePanel
  sed -i 's/CollapseItem/CollapsePanel/g' "$file"

  # 命令式 API：$bkMessage → Message
  sed -i "s/this\.\\\$bkMessage(/Message(/g" "$file"
  sed -i "s/this\.\\\$bkNotify(/Notify(/g" "$file"
  sed -i "s/this\.\\\$bkInfo(/InfoBox(/g" "$file"
  sed -i "s/this\.\\\$bkLoading(/Loading(/g" "$file"

  # Vue3 v-model 语法更新
  # :is-show.sync → v-model:isShow（Dialog / Sideslider）
  sed -i "s/:is-show\.sync=\"/v-model:isShow=\"/g" "$file"

  # Tab v-model → v-model:active（谨慎，可能误伤）
  # sed -i 's/<Tab v-model="/<Tab v-model:active="/g' "$file"

done

echo "✅ 替换完成，请检查以下文件："
git diff --name-only 2>/dev/null || find "$TARGET_DIR" -newer migrate-bkui.sh -type f

echo ""
echo "⚠️  以下内容需要手动处理："
echo "  1. Table: <TableColumn> → columns prop（见指南 §7）"
echo "  2. TableSettingContent → 使用 Table 的 settings prop"
echo "  3. Form 实例类型声明"
echo "  4. Tab v-model → v-model:active"
echo "  5. Dialog/Sideslider @cancel → @closed"
```

### 执行方式

```bash
chmod +x migrate-bkui.sh
bash migrate-bkui.sh bklog/web/packages/web-v3/src
```

---

## 11. 验证清单

迁移完成后，逐项检查：

### 编译验证
```bash
# 检查是否还有 bk-magic-vue 残留
grep -r "from 'bk-magic-vue'" src/ --include="*.ts" --include="*.tsx" --include="*.vue" -l

# 检查是否还有旧式命令 API
grep -r "\$bkMessage\|\$bkNotify\|\$bkInfo\|\$bkLoading" src/ --include="*.ts" --include="*.tsx" --include="*.vue"

# 检查 TableColumn 残留（需改为 columns prop）
grep -r "TableColumn\|bk-table-column" src/ --include="*.ts" --include="*.tsx" --include="*.vue"

# 检查 .sync 修饰符残留（Vue3 不支持）
grep -r "\.sync=" src/ --include="*.ts" --include="*.tsx" --include="*.vue"

# TypeScript 编译检查
npx tsc --noEmit 2>&1 | head -50
```

### 功能验证重点
- [ ] 所有 Dialog / Sideslider 的开关状态正常
- [ ] Table 数据展示、排序、分页正常
- [ ] Form 提交和验证逻辑正常
- [ ] Message / Notify / InfoBox 命令式调用正常
- [ ] Select / Option 下拉正常
- [ ] Tab 切换正常
- [ ] Switcher 开关状态双向绑定正常
- [ ] Collapse / CollapsePanel 展开收起正常

### 样式验证
- [ ] 全局样式文件 `bkui-vue/dist/style.css` 已引入
- [ ] 无组件样式缺失（检查控制台 CSS 警告）
- [ ] 主题色与设计稿一致

---

## 附录：本项目已完成的迁移（参考）

| 模块 | 文件数 | 状态 |
|---|---|---|
| 消息通知（Message/Notify/InfoBox） | 全量 | ✅ |
| Dialog | 全量 | ✅ |
| Form / FormItem | 全量 | ✅ |
| Button / Input / Tag | 全量 | ✅ |
| Select / Option | 全量 | ✅ |
| Sideslider → Drawer* | 全量 | ✅ |
| Switcher → Switch* | 全量 | ✅ |
| Popover → Popup* | 全量 | ✅ |
| Tab / TabPanel | 全量 | ✅ |
| Table（columns 重构） | 全量 | ✅ |
| log-masking 模块（6 文件） | 全量 | ✅ |
| collection-access 模块 | 全量 | ✅ |

> *注：本项目中间迁移至 TDesign，使用了 TDesign 的组件名（Drawer/Switch/Popup），迁移至 bkui-vue3 时应使用 **Sideslider / Switcher / Popover**（名称与 bk-magic-vue 保持一致）。

---

*文档生成时间：2026-03-09 | 适用版本：bkui-vue@2.0.2-beta.104*
