# BlueKing Log Platform - Vue3 Version

蓝鲸日志平台 Vue3 版本，从 Vue2 升级到 Vue3 + TypeScript + TSX + Composition API。

## 技术栈

- **框架**: Vue 3.5+
- **语言**: TypeScript 5.7+
- **语法**: Composition API + TSX
- **UI组件库**: TDesign Vue Next
- **状态管理**: Pinia
- **路由**: Vue Router 4
- **构建工具**: Vite 6
- **HTTP**: Axios
- **代码编辑器**: Monaco Editor / CodeMirror

## 项目结构

```
web-v3/
├── src/
│   ├── api/              # API 请求封装
│   ├── assets/           # 静态资源
│   │   └── styles/       # 样式文件
│   ├── components/       # 通用组件
│   ├── composables/      # 组合式函数
│   ├── layouts/          # 布局组件
│   ├── router/           # 路由配置
│   ├── stores/           # Pinia 状态管理
│   ├── types/            # TypeScript 类型定义
│   ├── utils/            # 工具函数
│   ├── views/            # 页面组件
│   ├── app.tsx           # 根组件
│   └── main.ts           # 入口文件
├── public/               # 公共静态资源
├── index.html            # HTML 模板
├── package.json          # 依赖配置
├── tsconfig.json         # TypeScript 配置
├── vite.config.ts        # Vite 配置
└── README.md             # 项目说明
```

## 开发

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:8002

### 类型检查

```bash
npm run type-check
```

### 构建生产版本

```bash
npm run build
```

### 预览生产构建

```bash
npm run preview
```

## 核心功能模块

### 1. 检索模块 (Retrieve)
- 日志检索（单索引/联合索引）
- 收藏夹管理
- 趋势图
- 字段分析
- 上下文/实时日志
- 导出功能
- 分享链接

### 2. 管理模块 (Manage)
- 日志采集配置
- 索引集管理
- 清洗配置
- 归档管理
- 日志提取
- ES 集群管理

### 3. 仪表盘模块 (Dashboard)
- 仪表盘管理
- 可视化配置

### 4. 监控模块 (Monitor)
- APM 日志
- Trace 日志

## 代码规范

### 文件命名
- 使用 **小写连字符命名** (kebab-case)
- 组件文件使用 `.tsx` 扩展名
- 示例: `index-set-list.tsx`

### 组件编写
- 使用 **Composition API**
- 使用 **TSX 语法**
- 禁止使用 Options API

```tsx
import { defineComponent, ref } from 'vue';

export default defineComponent({
  name: 'ComponentName',
  
  setup() {
    const count = ref(0);
    
    const increment = () => {
      count.value++;
    };
    
    return () => (
      <div onClick={increment}>
        Count: {count.value}
      </div>
    );
  },
});
```

### 状态管理
使用 Pinia：

```ts
import { defineStore } from 'pinia';

export const useMyStore = defineStore('my-store', {
  state: () => ({
    data: null,
  }),
  
  actions: {
    async fetchData() {
      // ...
    },
  },
});
```

## 升级注意事项

1. **完全迁移**：所有功能必须从 Vue2 版本完整迁移，不得缺失
2. **业务逻辑不变**：保持现有的业务逻辑和数据流
3. **UI 交互一致**：保持与 Vue2 版本相同的 UI 交互体验
4. **性能优化**：利用 Vue3 的性能优势进行优化

## 待办事项

- [ ] API 服务层迁移
- [ ] 工具函数迁移
- [ ] Composables 开发
- [ ] 基础组件迁移
- [ ] 业务组件迁移
- [ ] 检索模块迁移
- [ ] 管理模块迁移
- [ ] 仪表盘模块迁移
- [ ] 监控模块迁移
- [ ] 单元测试
- [ ] E2E 测试
- [ ] 性能优化
- [ ] 文档完善

## License

MIT
