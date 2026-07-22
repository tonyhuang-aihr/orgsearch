# OrgQuery - 组织架构查询 SaaS 平台

面向国内 HR 和管理者的组织架构对标查询平台，支持查看各大科技公司组织架构、行业对比、数据下载等功能。

## 技术栈

- **框架**: Next.js 14 (App Router) + TypeScript
- **样式**: Tailwind CSS + shadcn/ui 风格组件
- **数据库**: SQLite（本地开发）/ PostgreSQL（生产）+ Prisma ORM
- **可视化**: React Flow
- **认证**: NextAuth.js (Credentials 邮箱密码登录)
- **下载**: html2canvas + jsPDF

## 功能特性

- 🏢 **组织架构浏览** - 树形结构可视化展示，支持缩放拖拽
- 🔍 **搜索筛选** - 按公司名称、行业筛选
- 🆚 **多公司对比** - 最多 3 家公司组织架构对比
- 💰 **Freemium 模式** - 免费用户看部分层级，Pro 会员看完整
- 🔑 **激活码系统** - 激活码 + 微信私域付费模式
- 📥 **下载导出** - 支持 PNG / PDF 格式下载
- 👤 **用户系统** - 邮箱密码注册登录，查询历史记录

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 初始化数据库

```bash
# 生成 Prisma Client
npx prisma generate

# 推送数据库 schema
npx prisma db push

# 运行 seed 脚本（初始化数据）
npm run seed
```

或者一键执行：

```bash
npm run setup
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 4. 生产构建

```bash
npm run build
npm start
```

## 预置数据

### 测试账号

| 邮箱 | 密码 | 角色 |
|------|------|------|
| demo@test.com | demo123 | 普通用户（免费） |
| pro@test.com | demo123 | Pro 会员 |

### 激活码

```
ORG-DEMO-001 ~ ORG-DEMO-010
```

### 预置公司

1. 字节跳动 - 互联网
2. OpenAI - 人工智能
3. 月之暗面 (Kimi) - 人工智能
4. Anthropic - 人工智能
5. 小米集团 - 消费电子

## 核心逻辑

### 免费层级截断

```typescript
// 免费层数 = max(1, floor(总层级 / 2))
// 例如：5 层架构 → 免费看 2 层
const freeLevel = Math.max(1, Math.floor(totalLayers / 2))
```

### 项目结构

```
org-query/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   │   ├── auth/          # 认证相关
│   │   ├── companies/     # 公司列表
│   │   ├── org-tree/      # 组织树数据
│   │   ├── activate/      # 激活码校验
│   │   └── query-logs/    # 查询记录
│   ├── companies/[id]/    # 公司详情页
│   ├── compare/           # 对比页面
│   ├── login/             # 登录页
│   ├── register/          # 注册页
│   ├── me/                # 用户中心
│   └── page.tsx           # 首页
├── components/            # React 组件
│   ├── ui/               # UI 基础组件
│   ├── org-flow-chart.tsx
│   ├── company-card.tsx
│   └── ...
├── lib/                   # 工具库
│   ├── prisma.ts
│   ├── auth.ts
│   ├── org-tree.ts
│   └── utils.ts
├── prisma/                # 数据库
│   ├── schema.prisma
│   └── seed.ts
└── ...
```

## 数据库 Schema

- **User** - 用户表（邮箱、密码、会员状态、激活码）
- **Company** - 公司表（名称、行业、层级数）
- **OrgNode** - 组织节点（部门/团队/人员，树形结构）
- **ActivationCode** - 激活码表
- **QueryLog** - 查询记录表

## 切换到 PostgreSQL

修改 `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

修改 `.env`:

```
DATABASE_URL="postgresql://user:password@localhost:5432/orgquery"
```

然后重新执行 `prisma db push` 和 `seed`。

## License

MIT
