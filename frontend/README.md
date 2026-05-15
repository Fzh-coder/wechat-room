# My Next Chat - 微信风格即时通讯前端

基于 Next.js + React + TypeScript + Socket.IO 的即时通讯前端项目，对接 NestJS 后端。

## 技术栈

- **框架**: Next.js 14 (Pages Router) + TypeScript
- **UI**: React 18 + 原生 CSS (微信风格)
- **HTTP**: Axios
- **WebSocket**: Socket.IO Client
- **状态管理**: React Context + useState

## 功能特性

- 用户注册 / 登录（JWT 认证）
- 私聊（实时消息推送）
- 群聊（创建群聊、邀请成员、退出/解散群聊）
- 在线用户列表
- 未读消息红点提示
- 表情选择器
- 图片上传与发送
- 历史消息加载
- 会话搜索过滤

## 目录结构

```
my-next-chat/
├── pages/
│   ├── _app.tsx          # 应用入口，注入 AuthProvider
│   ├── index.tsx         # 登录/注册页面
│   └── chat.tsx          # 聊天页面（动态导入，避免 SSR 问题）
├── components/
│   ├── ChatPage.tsx      # 聊天主组件（状态管理 + socket 事件）
│   ├── Sidebar.tsx       # 左侧会话列表
│   ├── ChatArea.tsx      # 聊天消息展示区
│   ├── MessageInput.tsx  # 消息输入框（含表情、图片上传）
│   ├── RightPanel.tsx    # 右侧在线用户 + 群聊面板
│   └── GroupModal.tsx    # 创建群聊模态框
├── context/
│   └── AuthContext.tsx   # 登录状态管理
├── utils/
│   ├── api.ts            # Axios 实例
│   └── helpers.ts        # 工具函数（转义、时间格式化、头像生成）
└── styles/
    └── chat.css          # 全局样式（登录页 + 聊天页）
```

## 环境要求

- Node.js >= 18
- 后端服务运行在 `http://localhost:3000`（NestJS）

## 快速开始

1. 启动后端服务（WeChat Server）：
   ```bash
   cd wechat-server
   npm run start:dev
   ```

2. 启动前端开发服务器（本目录）：
   ```bash
   cd my-next-chat
   npm install
   npm run dev
   ```

3. 访问 `http://localhost:8080`

## 构建生产版本

```bash
npm run build
npm start
```

## 接口代理配置

前端通过 Next.js 的 `rewrites` 功能将 `/api/*` 请求代理到后端 `http://localhost:3000/*`，从而避免跨域问题。

WebSocket 连接直接指向 `http://localhost:3000`（后端已配置 CORS 允许所有来源的 WebSocket 连接）。

## 注意事项

- 登录凭证（token、用户名、头像）存储在 `localStorage` 中。生产环境建议改为 `httpOnly` Cookie。
- 头像默认为基于用户名的首字母 + 彩色背景生成的 SVG。用户可通过后端 `/users/avatar` 接口自定义头像。
- 后端要求：请确保后端服务正常运行，且 WebSocket Gateway 已启用 CORS。
