# WeChat 即时通讯系统

## 项目概述
基于 WebSocket 的实时聊天系统，支持登录、群聊、私聊、消息持久化、图片发送等功能。

## 技术栈
- **后端**：NestJS (TypeScript) + TypeORM + MySQL 8.0 + Socket.IO
- **前端**：Next.js 14 (Pages Router) + React 18 + TypeScript + Socket.IO Client
- **运行环境**：Node.js，Docker Compose 提供数据库

## 目录结构
```
/
├── frontend/              # Next.js 前端项目（替换了旧 jQuery 版本）
│   ├── pages/             # 页面（index 登录页 + chat 聊天页）
│   ├── components/        # React 组件
│   ├── context/           # React Context（AuthContext）
│   ├── utils/             # 工具函数
│   └── styles/            # 全局样式
├── wechat-server/         # 后端 NestJS 项目
│   ├── src/
│   │   ├── main.ts        # 入口文件
│   │   ├── auth/          # 登录认证模块
│   │   ├── users/         # 用户管理模块
│   │   ├── messages/      # 消息持久化模块
│   │   ├── chat/          # WebSocket 网关模块
│   │   └── upload/        # 文件上传模块
│   └── src/entities/      # TypeORM 实体
├── docker-compose.yaml    # MySQL 数据库
└── CLAUDE.md
```

## 后端模块职责
| 模块 | 路径 | 职责 |
|------|------|------|
| AuthModule | `wechat-server/src/auth` | 登录验证（JWT） |
| UsersModule | `wechat-server/src/users` | 用户 CRUD、头像 |
| MessagesModule | `wechat-server/src/messages` | 消息持久化与历史查询 |
| ChatModule | `wechat-server/src/chat` | WebSocket 网关（实时消息、用户状态） |
| UploadModule | `wechat-server/src/upload` | 图片文件上传 |

## 数据库实体
- **user**：id (自增), username, password (bcrypt 哈希), avatar, created_at
- **message**：id, userId, username, content, avatar, toUser（私聊）, room（群聊）, createdAt

## Socket.IO 事件约定（命名空间 `/`）
| 事件名 | 方向 | 说明 |
|--------|------|------|
| `login` | 客户端 → 服务端 | 用户登录认证 |
| `loginSuccess` | 服务端 → 客户端 | 登录成功确认 |
| `userList` | 服务端 → 客户端 | 在线用户列表（含 socketId） |
| `groupList` | 服务端 → 客户端 | 群组列表 |
| `privateMsg` | 双向 | 私聊消息 |
| `roomMsg` | 双向 | 群聊消息（广播给房间） |
| `systemMsg` | 服务端 → 客户端 | 系统通知 |
| `createGroup` | 客户端 → 服务端 | 创建群聊 |
| `youJoinedGroup` | 服务端 → 客户端 | 被加入群聊通知 |
| `leaveGroup` | 客户端 → 服务端 | 退出群聊 |
| `dismissGroup` | 客户端 → 服务端 | 解散群聊（仅创建者） |
| `groupDismissed` | 服务端 → 客户端 | 群聊已解散通知 |
| `groupLeft` | 服务端 → 客户端 | 已退出群聊通知 |
| `groupRemoved` | 服务端 → 客户端 | 已删除解散群聊通知 |

## 开发规范
- **后端**：
  - 使用 `@/` 路径别名（tsconfig.json 配置）
  - 禁止原生 SQL，通过 TypeORM Repository 操作
  - 异常使用 NestJS 标准异常过滤器
- **前端**：
  - 组件使用 camelCase 命名
  - 状态管理使用 React Context + useState（不使用 Redux）
  - Axios 通过 `/api` 代理访问后端（避免跨域）
  - WebSocket 直接连接 `http://localhost:3000`

## 运行方式
```bash
# 1. 启动 MySQL 数据库
docker-compose up -d

# 2. 启动后端 (端口 3000)
cd wechat-server
npm install
npm run start:dev

# 3. 启动前端 (端口 8080)
cd frontend
npm install
npm run dev

# 访问 http://localhost:8080
```

## API 代理说明
前端通过 Next.js `rewrites` 将 `/api/*` 请求转发到 `http://localhost:3000/*`（即后端），避免浏览器跨域限制。WebSocket 直连后端 3000 端口（Gateway 已启用 CORS）。
