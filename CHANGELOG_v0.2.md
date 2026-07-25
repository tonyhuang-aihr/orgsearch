# OrgSearch v0.2 前端迭代开发 - 变更记录

## 完成情况总览

| 优先级 | 功能 | 状态 |
|--------|------|------|
| P0 | 1. 公司页顶部摘要栏 | ✅ 完成 |
| P0 | 2. 渐进式组织图（核心交互） | ✅ 完成 |
| P0 | 3. 节点状态视觉 | ✅ 完成 |
| P0 | 4. 右侧证据抽屉 | ✅ 完成 |
| P1 | 5. 首页卡片信息修正 | ✅ 完成 |
| P1 | 6. 下载修复 | ✅ 完成 |
| P2 | 7. 完整人才地图入口 | ✅ 完成 |
| - | 数据库 Schema 变更 | ✅ 完成 |

---

## 详细变更记录

### 1. 数据库 Schema 变更 (prisma/schema.prisma)

#### Company 表新增字段
- `dataStatus` (String, default: "partial") - 数据状态: verified / partial / building / conflict / none
- `skeletonCoverage` (String?, nullable) - 骨架覆盖率描述
- `lastVerifiedAt` (DateTime?, nullable) - 最后验证时间
- `dataQualityScore` (Int, default: 70) - 数据质量分 0-100

#### OrgNode 表新增字段
- `status` (String, default: "observed") - 节点状态: confirmed / observed / inferred / conflict / deprecated
- `confidenceScore` (Int, default: 70) - 置信度 0-100
- `evidenceCount` (Int, default: 1) - 证据数量
- `sourceName` (String?, nullable) - 来源名称，如 "The Org"
- `sourceUrl` (String?, nullable) - 来源URL
- `sourceType` (String?, nullable) - 来源类型: theorg / official_board / company_website 等
- `evidenceStrength` (String?, nullable) - 证据强度: direct / indirect
- `lastVerifiedAt` (DateTime?, nullable) - 最后验证时间

---

### 2. 类型与工具层 (lib/org-tree.ts)

#### 新增类型
- `NodeStatus` 类型: "confirmed" | "observed" | "inferred" | "conflict" | "deprecated"
- `DataStatus` 类型: "verified" | "partial" | "building" | "conflict" | "none"

#### OrgNodeData 接口扩展
新增字段: `status`, `confidenceScore`, `evidenceCount`, `sourceName`, `sourceUrl`, `sourceType`, `evidenceStrength`, `lastVerifiedAt`

#### 新增工具函数
- `nodeStatusLabels` - 节点状态中文标签映射
- `dataStatusLabels` - 数据状态中文标签映射
- `countNodes()` - 计算树中节点总数

#### 更新函数
- `getCompanyOrgTree()` - 返回值增加 company 新字段和 totalNodes

---

### 3. API 层变更

#### app/api/org-tree/[id]/route.ts
- 返回的 company 对象增加新字段: `dataStatus`, `skeletonCoverage`, `lastVerifiedAt`, `dataQualityScore`, `updatedAt`
- 节点数据映射增加所有新字段
- 返回值增加 `totalNodes` 字段

#### app/api/companies/route.ts
- 使用 `_count.orgNodes` 关联查询节点数
- 返回数据增加: `dataStatus`, `skeletonCoverage`, `lastVerifiedAt`, `dataQualityScore`, `totalNodes`, `updatedAt`

---

### 4. 组件变更

#### components/company-card.tsx (P1 #5)
- 新增 props: `dataStatus`, `totalNodes`, `updatedAt`
- 将"完整数据"替换为数据质量标签 Badge（完整数据/部分覆盖/基础骨架/数据冲突/暂无数据）
- 显示节点总数（替代"完整数据"模糊描述）
- 增加"最后更新"时间显示（友好格式：今天/昨天/N天前/N周前/N月前）

#### components/org-flow-chart.tsx (P0 #2, #3)
重大重构，新增功能:

**渐进式展开**
- 新增 `expandedNodeIds` state: Set<string>，记录已展开的节点
- 默认只展开根节点（L0），L1 节点点击后展开
- 点击节点时，如果有子节点且未展开，则展开
- 通过 `calculateTreeLayout()` 过滤只渲染已展开路径上的节点

**面包屑导航**
- 新增 `breadcrumbs` state: BreadcrumbItem[]
- 顶部显示当前浏览路径（如 "OpenAI > 研发 > AI Platform"）
- 点击面包屑某节点可回退到该层级，移除之后的展开状态
- 骨架模式(skeleton)下显示，完整模式(full)下隐藏

**展开指示器**
- 有子节点但未展开的节点底部显示 "+N 个子部门" 提示
- 使用 Plus 图标 + 文字

**节点状态视觉**
- 已确认(confirmed): 紫色实线边框(border-purple-500) + 绿色圆点 + 完全不透明
- 已观测(observed): 灰色边框(border-gray-300) + 黄色圆点 + 90%不透明
- 已推断(inferred): 浅蓝色边框(border-blue-200) + 黄色圆点 + 80%不透明
- 待确认/冲突(conflict): 红色虚线边框 + 红色圆点 + 90%不透明
- 已废弃(deprecated): 灰色边框 + 灰色圆点 + 50%不透明

**视图模式**
- 新增 `viewMode` prop: "skeleton" | "full"
- skeleton: 渐进式浏览（默认）
- full: 完整人才地图（一次性展开所有节点）

**性能优化**
- 使用 ReactFlow 原生 `onNodeClick` 替代 data 中传递回调

#### components/evidence-drawer.tsx (P0 #4) - 新建组件
右侧滑出证据抽屉组件:

- 宽度 380px，带遮罩层（backdrop-blur + 40%黑）
- 入场/离场动画（300ms 平移 + 遮罩淡入淡出）
- ESC 键关闭，点击遮罩关闭，关闭按钮关闭
- 锁定 body 滚动

**抽屉内容:**
1. 头部：节点名称 + 职位/部门 + 状态标签（带颜色圆点）
2. 置信度：进度条显示 0-100 分
3. 最后验证时间
4. 证据列表：来源类型、来源名称、发布时间、证据强度（直接/间接）、原文摘录、来源链接
5. 底部免责声明

#### components/company-detail.tsx (P0 #1, P1 #6, P2 #7)
主要更新:

**顶部数据状态摘要栏** (P0 #1)
- 标题旁增加数据状态 Badge（已验证/部分覆盖/构建中/存在冲突）
- 四宫格摘要卡片：骨架覆盖率、最后验证时间、数据质量分、数据来源
- 不同状态使用不同颜色（绿/黄/蓝/红）

**视图切换区域** (P2 #7)
- 拆分为两组切换按钮：
  - 视图类型：职能分类 / 汇报线
  - 视图模式：渐进浏览 / 完整人才地图
- 切换到完整人才地图时显示加载提示 "完整视图将加载所有节点，可能较慢..."

**下载功能修复** (P1 #6)
- 下载内容与当前视图一致（当前展开的节点）
- 使用 `.react-flow` 容器替代 `.react-flow__renderer`，包含完整背景
- 背景色设为 #f9fafb（匹配 gray-50）
- 文件名格式: `{公司名}_{视图类型}_{日期}.png/pdf`
  - 示例: `OpenAI_职能架构_2024-01-15.png`

**节点总数显示**
- 信息栏增加节点总数显示

---

### 5. 数据种子 (prisma/seed.ts)
- Company 新增字段设置默认值: `dataStatus: 'verified'`, `dataQualityScore: 85`, `lastVerifiedAt: now()`
- OrgNode 根据层级设置不同状态:
  - L1-L2: `status: 'confirmed'`, `confidenceScore: 90`, `evidenceCount: 3`, `evidenceStrength: 'direct'`
  - L3+: `status: 'observed'`, `confidenceScore: 70`, `evidenceCount: 1`, `evidenceStrength: 'indirect'`
- 所有节点: `sourceName: 'The Org'`, `sourceType: 'theorg'`, `sourceUrl: 'https://theorg.com'`

---

### 6. 环境配置 (.env)
- 新建 .env 文件，配置 Neon PostgreSQL 数据库连接
- 配置 NEXTAUTH_SECRET 和 NEXTAUTH_URL

---

### 7. 首页 (app/page.tsx)
- Company 接口扩展: 增加 `dataStatus`, `totalNodes`, `updatedAt` 可选字段

---

## 遇到的问题

### 1. npm install 超时
在当前环境中执行 `npm install` 持续超时（>300s），导致无法验证 TypeScript 编译和 Next.js build。代码已根据最佳实践编写，但**未经实际编译验证**。

**建议在本地环境执行:**
```bash
cd orgsearch
npm install
npx prisma generate
npx prisma db push
npm run seed
npm run build
```

### 2. Prisma 版本问题
之前的 `npx prisma` 命令调用了全局安装的 Prisma 7.x，但项目 package.json 指定的是 5.10.0。Prisma 7.x 使用了新的配置方式（`prisma.config.ts`），与当前 schema 不兼容。安装本地依赖后应使用本地 prisma 5.x。

### 3. 下载功能未实际测试
由于无法运行开发服务器，html2canvas + jsPDF 的下载功能未经实际测试。理论上应该工作，但可能需要微调（如 ReactFlow 变换元素的捕获问题）。

---

## 分支信息

所有变更直接在 **main** 分支上进行，未创建新分支。

---

## 后续建议

1. 运行 `npm run build` 验证编译
2. 测试渐进式展开交互（点击节点展开、面包屑回退）
3. 测试证据抽屉的显示和关闭
4. 测试 PNG/PDF 下载功能
5. 根据实际数据调整节点状态配色和置信度计算逻辑
6. 考虑为下载功能添加 Loading 状态提示
