# 大易AI播报

基于Electron和Vue3的跨平台AI语音播报应用。

## 功能特点

- 基于AI技术的文本到语音转换
- 支持多种语音风格和语速调整
- 跨平台支持（Windows、macOS、Linux）
- 暗黑模式支持
- 现代化UI界面

## 技术栈

- Electron: 跨平台桌面应用框架
- Vue 3: 前端框架
- TypeScript: 类型安全的JavaScript超集
- Pinia: 状态管理
- Vue Router: 路由管理

## 开发指南

### 环境要求

- Node.js 18+
- npm 9+

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
# 仅运行Vue应用
npm run dev

# 运行Electron + Vue应用
npm run electron:dev
```

### 构建应用

```bash
# 构建Vue应用
npm run build

# 构建Electron应用
npm run electron:build
```

### 预览构建结果

```bash
# 预览Vue应用
npm run preview

# 预览Electron应用
npm run electron:preview
```

## 项目结构

```
├── electron/          # Electron主进程代码
├── public/            # 静态资源
├── src/               # 源代码
│   ├── assets/        # 资源文件
│   ├── components/    # 组件
│   ├── router/        # 路由配置
│   ├── stores/        # 状态管理
│   ├── types/         # 类型定义
│   ├── views/         # 视图组件
│   ├── App.vue        # 根组件
│   └── main.ts        # 入口文件
├── index.html         # HTML模板
├── package.json       # 项目配置
└── vite.config.ts     # Vite配置
```

## 许可证

MIT
