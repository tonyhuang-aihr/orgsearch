import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

interface OrgNodeInput {
  name: string
  title?: string
  level: number
  headcount?: number
  nodeType?: string
  children?: OrgNodeInput[]
}

async function createOrgTree(
  companyId: string,
  nodes: OrgNodeInput[],
  parentId: string | null = null,
  pathPrefix: string = ''
) {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    const currentPath = pathPrefix ? `${pathPrefix}.${i + 1}` : `${i + 1}`

    const createdNode = await prisma.orgNode.create({
      data: {
        companyId,
        name: node.name,
        title: node.title || null,
        level: node.level,
        parentId,
        headcount: node.headcount || 0,
        nodeType: node.nodeType || 'department',
        path: currentPath,
      },
    })

    if (node.children && node.children.length > 0) {
      await createOrgTree(companyId, node.children, createdNode.id, currentPath)
    }
  }
}

async function main() {
  console.log('开始初始化数据...')

  // 1. 创建用户
  const demoPassword = await bcrypt.hash('demo123', 10)

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@test.com' },
    update: {},
    create: {
      email: 'demo@test.com',
      passwordHash: demoPassword,
      isPremium: false,
    },
  })
  console.log('普通用户创建:', demoUser.email)

  const proUser = await prisma.user.upsert({
    where: { email: 'pro@test.com' },
    update: {},
    create: {
      email: 'pro@test.com',
      passwordHash: demoPassword,
      isPremium: true,
      activatedAt: new Date(),
      activationCode: 'ORG-DEMO-PRO',
    },
  })
  console.log('Pro用户创建:', proUser.email)

  // 2. 创建激活码
  const activationCodes = Array.from({ length: 10 }, (_, i) => `ORG-DEMO-${String(i + 1).padStart(3, '0')}`)

  for (const code of activationCodes) {
    await prisma.activationCode.upsert({
      where: { code },
      update: {},
      create: { code },
    })
  }
  console.log('激活码创建:', activationCodes.length, '个')

  // 3. 字节跳动组织架构
  const bytedanceTree: OrgNodeInput[] = [
    {
      name: '张一鸣 / 梁汝波',
      title: '创始人 / CEO',
      level: 1,
      headcount: 160000,
      nodeType: 'person',
      children: [
        {
          name: '抖音集团',
          title: '事业群',
          level: 2,
          headcount: 60000,
          nodeType: 'department',
          children: [
            {
              name: '抖音',
              title: '产品部',
              level: 3,
              headcount: 8000,
              nodeType: 'department',
              children: [
                { name: '产品运营', level: 4, headcount: 2000, nodeType: 'team' },
                { name: '用户增长', level: 4, headcount: 1500, nodeType: 'team' },
                { name: '内容生态', level: 4, headcount: 2500, nodeType: 'team' },
                { name: '直播业务', level: 4, headcount: 2000, nodeType: 'team' },
              ],
            },
            {
              name: '电商业务',
              title: '抖音电商',
              level: 3,
              headcount: 10000,
              nodeType: 'department',
              children: [
                { name: '商家运营', level: 4, headcount: 3000, nodeType: 'team' },
                { name: '供应链', level: 4, headcount: 2000, nodeType: 'team' },
                { name: '支付结算', level: 4, headcount: 1000, nodeType: 'team' },
                { name: '跨境电商', level: 4, headcount: 4000, nodeType: 'team' },
              ],
            },
            {
              name: '本地生活',
              title: '生活服务',
              level: 3,
              headcount: 5000,
              nodeType: 'department',
              children: [
                { name: '到店餐饮', level: 4, headcount: 2000, nodeType: 'team' },
                { name: '酒旅业务', level: 4, headcount: 1500, nodeType: 'team' },
                { name: '休闲娱乐', level: 4, headcount: 1500, nodeType: 'team' },
              ],
            },
          ],
        },
        {
          name: '字节跳动产品与技术',
          title: '事业群',
          level: 2,
          headcount: 40000,
          nodeType: 'department',
          children: [
            {
              name: '今日头条',
              level: 3,
              headcount: 5000,
              nodeType: 'department',
              children: [
                { name: '内容推荐', level: 4, headcount: 2000, nodeType: 'team' },
                { name: '创作者中心', level: 4, headcount: 1500, nodeType: 'team' },
                { name: '商业化', level: 4, headcount: 1500, nodeType: 'team' },
              ],
            },
            {
              name: '西瓜视频',
              level: 3,
              headcount: 3000,
              nodeType: 'department',
              children: [
                { name: '中视频业务', level: 4, headcount: 1500, nodeType: 'team' },
                { name: '影视内容', level: 4, headcount: 1500, nodeType: 'team' },
              ],
            },
            {
              name: '搜索业务',
              level: 3,
              headcount: 4000,
              nodeType: 'department',
              children: [
                { name: '搜索引擎', level: 4, headcount: 2000, nodeType: 'team' },
                { name: '搜索广告', level: 4, headcount: 2000, nodeType: 'team' },
              ],
            },
          ],
        },
        {
          name: '飞书',
          title: '企业服务事业群',
          level: 2,
          headcount: 10000,
          nodeType: 'department',
          children: [
            {
              name: '产品研发',
              level: 3,
              headcount: 4000,
              nodeType: 'department',
              children: [
                { name: '即时通讯', level: 4, headcount: 1000, nodeType: 'team' },
                { name: '云文档', level: 4, headcount: 1000, nodeType: 'team' },
                { name: '多维表格', level: 4, headcount: 800, nodeType: 'team' },
                { name: '视频会议', level: 4, headcount: 1200, nodeType: 'team' },
              ],
            },
            {
              name: '商业化',
              level: 3,
              headcount: 3000,
              nodeType: 'department',
              children: [
                { name: '大客户销售', level: 4, headcount: 1500, nodeType: 'team' },
                { name: '中小企业', level: 4, headcount: 1500, nodeType: 'team' },
              ],
            },
            {
              name: '客户成功',
              level: 3,
              headcount: 3000,
              nodeType: 'department',
              children: [
                { name: '实施交付', level: 4, headcount: 1500, nodeType: 'team' },
                { name: '售后服务', level: 4, headcount: 1500, nodeType: 'team' },
              ],
            },
          ],
        },
        {
          name: '火山引擎',
          title: '云服务事业群',
          level: 2,
          headcount: 8000,
          nodeType: 'department',
          children: [
            {
              name: '基础架构',
              level: 3,
              headcount: 3000,
              nodeType: 'department',
              children: [
                { name: '计算服务', level: 4, headcount: 1000, nodeType: 'team' },
                { name: '存储服务', level: 4, headcount: 1000, nodeType: 'team' },
                { name: '网络服务', level: 4, headcount: 1000, nodeType: 'team' },
              ],
            },
            {
              name: 'AI中台',
              level: 3,
              headcount: 3000,
              nodeType: 'department',
              children: [
                { name: '机器学习平台', level: 4, headcount: 1500, nodeType: 'team' },
                { name: '视觉智能', level: 4, headcount: 1500, nodeType: 'team' },
              ],
            },
            {
              name: '行业解决方案',
              level: 3,
              headcount: 2000,
              nodeType: 'department',
              children: [
                { name: '金融行业', level: 4, headcount: 1000, nodeType: 'team' },
                { name: '零售行业', level: 4, headcount: 1000, nodeType: 'team' },
              ],
            },
          ],
        },
        {
          name: '人力资源',
          title: '职能部门',
          level: 2,
          headcount: 5000,
          nodeType: 'department',
          children: [
            { name: '招聘', level: 3, headcount: 2000, nodeType: 'team' },
            { name: 'HRBP', level: 3, headcount: 2000, nodeType: 'team' },
            { name: '组织发展', level: 3, headcount: 1000, nodeType: 'team' },
          ],
        },
        {
          name: '财务部',
          level: 2,
          headcount: 2000,
          nodeType: 'department',
          children: [
            { name: '财务分析', level: 3, headcount: 800, nodeType: 'team' },
            { name: '税务', level: 3, headcount: 600, nodeType: 'team' },
            { name: '审计', level: 3, headcount: 600, nodeType: 'team' },
          ],
        },
      ],
    },
  ]

  // 4. OpenAI组织架构
  const openaiTree: OrgNodeInput[] = [
    {
      name: 'Sam Altman',
      title: 'CEO',
      level: 1,
      headcount: 2000,
      nodeType: 'person',
      children: [
        {
          name: '研究部 (Research)',
          level: 2,
          headcount: 600,
          nodeType: 'department',
          children: [
            {
              name: '大模型团队',
              level: 3,
              headcount: 200,
              nodeType: 'department',
              children: [
                { name: 'GPT模型组', level: 4, headcount: 100, nodeType: 'team' },
                { name: '多模态组', level: 4, headcount: 100, nodeType: 'team' },
              ],
            },
            {
              name: '对齐研究 (Alignment)',
              level: 3,
              headcount: 150,
              nodeType: 'department',
              children: [
                { name: 'RLHF团队', level: 4, headcount: 80, nodeType: 'team' },
                { name: '安全研究', level: 4, headcount: 70, nodeType: 'team' },
              ],
            },
            {
              name: '应用研究',
              level: 3,
              headcount: 150,
              nodeType: 'department',
              children: [
                { name: '代码生成', level: 4, headcount: 75, nodeType: 'team' },
                { name: '数据分析', level: 4, headcount: 75, nodeType: 'team' },
              ],
            },
            {
              name: '安全与政策',
              level: 3,
              headcount: 100,
              nodeType: 'department',
              children: [
                { name: '模型安全', level: 4, headcount: 50, nodeType: 'team' },
                { name: '政策研究', level: 4, headcount: 50, nodeType: 'team' },
              ],
            },
          ],
        },
        {
          name: '产品与工程 (Product & Engineering)',
          level: 2,
          headcount: 500,
          nodeType: 'department',
          children: [
            {
              name: 'ChatGPT产品',
              level: 3,
              headcount: 150,
              nodeType: 'department',
              children: [
                { name: '产品设计', level: 4, headcount: 50, nodeType: 'team' },
                { name: '前端工程', level: 4, headcount: 50, nodeType: 'team' },
                { name: '后端工程', level: 4, headcount: 50, nodeType: 'team' },
              ],
            },
            {
              name: 'API平台',
              level: 3,
              headcount: 150,
              nodeType: 'department',
              children: [
                { name: '开发者工具', level: 4, headcount: 75, nodeType: 'team' },
                { name: '基础设施', level: 4, headcount: 75, nodeType: 'team' },
              ],
            },
            {
              name: '可靠性工程',
              level: 3,
              headcount: 100,
              nodeType: 'department',
              children: [
                { name: 'SRE团队', level: 4, headcount: 50, nodeType: 'team' },
                { name: '性能优化', level: 4, headcount: 50, nodeType: 'team' },
              ],
            },
            {
              name: '数据工程',
              level: 3,
              headcount: 100,
              nodeType: 'department',
              children: [
                { name: '数据平台', level: 4, headcount: 50, nodeType: 'team' },
                { name: '训练数据', level: 4, headcount: 50, nodeType: 'team' },
              ],
            },
          ],
        },
        {
          name: '商业化 (Commercial)',
          level: 2,
          headcount: 300,
          nodeType: 'department',
          children: [
            {
              name: '销售',
              level: 3,
              headcount: 120,
              nodeType: 'department',
              children: [
                { name: '企业客户', level: 4, headcount: 60, nodeType: 'team' },
                { name: '开发者关系', level: 4, headcount: 60, nodeType: 'team' },
              ],
            },
            {
              name: '市场与营销',
              level: 3,
              headcount: 80,
              nodeType: 'department',
              children: [
                { name: '品牌营销', level: 4, headcount: 40, nodeType: 'team' },
                { name: '增长营销', level: 4, headcount: 40, nodeType: 'team' },
              ],
            },
            {
              name: '合作伙伴',
              level: 3,
              headcount: 100,
              nodeType: 'department',
              children: [
                { name: '战略伙伴', level: 4, headcount: 50, nodeType: 'team' },
                { name: '生态建设', level: 4, headcount: 50, nodeType: 'team' },
              ],
            },
          ],
        },
        {
          name: '运营与职能',
          level: 2,
          headcount: 200,
          nodeType: 'department',
          children: [
            { name: '人力资源', level: 3, headcount: 60, nodeType: 'team' },
            { name: '财务法务', level: 3, headcount: 80, nodeType: 'team' },
            { name: '行政运营', level: 3, headcount: 60, nodeType: 'team' },
          ],
        },
        {
          name: '安全与合规',
          level: 2,
          headcount: 100,
          nodeType: 'department',
          children: [
            { name: '信息安全', level: 3, headcount: 40, nodeType: 'team' },
            { name: '合规审查', level: 3, headcount: 30, nodeType: 'team' },
            { name: '内容审核', level: 3, headcount: 30, nodeType: 'team' },
          ],
        },
      ],
    },
  ]

  // 5. 月之暗面组织架构
  const kimiTree: OrgNodeInput[] = [
    {
      name: '杨植麟',
      title: '创始人 & CEO',
      level: 1,
      headcount: 800,
      nodeType: 'person',
      children: [
        {
          name: '模型研究部',
          level: 2,
          headcount: 200,
          nodeType: 'department',
          children: [
            {
              name: '基座模型团队',
              level: 3,
              headcount: 80,
              nodeType: 'department',
              children: [
                { name: '预训练组', level: 4, headcount: 40, nodeType: 'team' },
                { name: '指令微调组', level: 4, headcount: 40, nodeType: 'team' },
              ],
            },
            {
              name: '长文本团队',
              level: 3,
              headcount: 60,
              nodeType: 'department',
              children: [
                { name: '长上下文研究', level: 4, headcount: 30, nodeType: 'team' },
                { name: '记忆机制', level: 4, headcount: 30, nodeType: 'team' },
              ],
            },
            {
              name: '多模态团队',
              level: 3,
              headcount: 60,
              nodeType: 'department',
              children: [
                { name: '视觉理解', level: 4, headcount: 30, nodeType: 'team' },
                { name: '语音交互', level: 4, headcount: 30, nodeType: 'team' },
              ],
            },
          ],
        },
        {
          name: '产品研发部',
          level: 2,
          headcount: 150,
          nodeType: 'department',
          children: [
            {
              name: 'Kimi产品',
              level: 3,
              headcount: 60,
              nodeType: 'department',
              children: [
                { name: 'Web端', level: 4, headcount: 20, nodeType: 'team' },
                { name: '移动端', level: 4, headcount: 20, nodeType: 'team' },
                { name: '小程序', level: 4, headcount: 20, nodeType: 'team' },
              ],
            },
            {
              name: '开放平台',
              level: 3,
              headcount: 50,
              nodeType: 'department',
              children: [
                { name: 'API服务', level: 4, headcount: 25, nodeType: 'team' },
                { name: '开发者工具', level: 4, headcount: 25, nodeType: 'team' },
              ],
            },
            {
              name: '基础设施',
              level: 3,
              headcount: 40,
              nodeType: 'department',
              children: [
                { name: '推理服务', level: 4, headcount: 20, nodeType: 'team' },
                { name: '数据平台', level: 4, headcount: 20, nodeType: 'team' },
              ],
            },
          ],
        },
        {
          name: '商业化部',
          level: 2,
          headcount: 100,
          nodeType: 'department',
          children: [
            {
              name: '企业服务',
              level: 3,
              headcount: 50,
              nodeType: 'department',
              children: [
                { name: '大客户销售', level: 4, headcount: 25, nodeType: 'team' },
                { name: '解决方案', level: 4, headcount: 25, nodeType: 'team' },
              ],
            },
            {
              name: '市场品牌',
              level: 3,
              headcount: 30,
              nodeType: 'department',
              children: [
                { name: '内容营销', level: 4, headcount: 15, nodeType: 'team' },
                { name: '品牌公关', level: 4, headcount: 15, nodeType: 'team' },
              ],
            },
            {
              name: '生态合作',
              level: 3,
              headcount: 20,
              nodeType: 'department',
              children: [
                { name: '合作伙伴', level: 4, headcount: 10, nodeType: 'team' },
                { name: '投资并购', level: 4, headcount: 10, nodeType: 'team' },
              ],
            },
          ],
        },
        {
          name: '数据与安全',
          level: 2,
          headcount: 50,
          nodeType: 'department',
          children: [
            { name: '数据治理', level: 3, headcount: 25, nodeType: 'team' },
            { name: '安全合规', level: 3, headcount: 25, nodeType: 'team' },
          ],
        },
        {
          name: '职能部门',
          level: 2,
          headcount: 50,
          nodeType: 'department',
          children: [
            { name: '人力资源', level: 3, headcount: 20, nodeType: 'team' },
            { name: '财务行政', level: 3, headcount: 30, nodeType: 'team' },
          ],
        },
      ],
    },
  ]

  // 6. Anthropic组织架构
  const anthropicTree: OrgNodeInput[] = [
    {
      name: 'Dario Amodei',
      title: 'CEO & 联合创始人',
      level: 1,
      headcount: 1500,
      nodeType: 'person',
      children: [
        {
          name: '研究部 (Research)',
          level: 2,
          headcount: 500,
          nodeType: 'department',
          children: [
            {
              name: '模型研究',
              level: 3,
              headcount: 200,
              nodeType: 'department',
              children: [
                { name: 'Claude模型组', level: 4, headcount: 100, nodeType: 'team' },
                { name: '模型架构', level: 4, headcount: 100, nodeType: 'team' },
              ],
            },
            {
              name: '安全研究 (Safety)',
              level: 3,
              headcount: 150,
              nodeType: 'department',
              children: [
                { name: '可解释性研究', level: 4, headcount: 50, nodeType: 'team' },
                { name: '红队测试', level: 4, headcount: 50, nodeType: 'team' },
                { name: '对齐方法', level: 4, headcount: 50, nodeType: 'team' },
              ],
            },
            {
              name: '应用研究',
              level: 3,
              headcount: 150,
              nodeType: 'department',
              children: [
                { name: '代码智能', level: 4, headcount: 50, nodeType: 'team' },
                { name: '数学推理', level: 4, headcount: 50, nodeType: 'team' },
                { name: '工具使用', level: 4, headcount: 50, nodeType: 'team' },
              ],
            },
          ],
        },
        {
          name: '工程部 (Engineering)',
          level: 2,
          headcount: 350,
          nodeType: 'department',
          children: [
            {
              name: 'Claude产品工程',
              level: 3,
              headcount: 120,
              nodeType: 'department',
              children: [
                { name: 'Web应用', level: 4, headcount: 40, nodeType: 'team' },
                { name: '移动应用', level: 4, headcount: 40, nodeType: 'team' },
                { name: '设计系统', level: 4, headcount: 40, nodeType: 'team' },
              ],
            },
            {
              name: '平台与基础设施',
              level: 3,
              headcount: 130,
              nodeType: 'department',
              children: [
                { name: '推理平台', level: 4, headcount: 50, nodeType: 'team' },
                { name: '训练平台', level: 4, headcount: 50, nodeType: 'team' },
                { name: 'DevOps/SRE', level: 4, headcount: 30, nodeType: 'team' },
              ],
            },
            {
              name: '数据与评估',
              level: 3,
              headcount: 100,
              nodeType: 'department',
              children: [
                { name: '数据管道', level: 4, headcount: 40, nodeType: 'team' },
                { name: '评估框架', level: 4, headcount: 30, nodeType: 'team' },
                { name: '标注团队', level: 4, headcount: 30, nodeType: 'team' },
              ],
            },
          ],
        },
        {
          name: '产品与商业化',
          level: 2,
          headcount: 250,
          nodeType: 'department',
          children: [
            {
              name: '产品管理',
              level: 3,
              headcount: 50,
              nodeType: 'department',
              children: [
                { name: '消费者产品', level: 4, headcount: 25, nodeType: 'team' },
                { name: '企业产品', level: 4, headcount: 25, nodeType: 'team' },
              ],
            },
            {
              name: '销售与客户成功',
              level: 3,
              headcount: 100,
              nodeType: 'department',
              children: [
                { name: '企业销售', level: 4, headcount: 50, nodeType: 'team' },
                { name: '客户成功', level: 4, headcount: 30, nodeType: 'team' },
                { name: '解决方案', level: 4, headcount: 20, nodeType: 'team' },
              ],
            },
            {
              name: '市场与增长',
              level: 3,
              headcount: 100,
              nodeType: 'department',
              children: [
                { name: '内容营销', level: 4, headcount: 30, nodeType: 'team' },
                { name: '开发者关系', level: 4, headcount: 30, nodeType: 'team' },
                { name: '品牌公关', level: 4, headcount: 40, nodeType: 'team' },
              ],
            },
          ],
        },
        {
          name: '政策与社会影响',
          level: 2,
          headcount: 100,
          nodeType: 'department',
          children: [
            { name: '公共政策', level: 3, headcount: 40, nodeType: 'team' },
            { name: '社会影响', level: 3, headcount: 30, nodeType: 'team' },
            { name: '伦理审查', level: 3, headcount: 30, nodeType: 'team' },
          ],
        },
        {
          name: '运营与职能',
          level: 2,
          headcount: 150,
          nodeType: 'department',
          children: [
            { name: '人力资源', level: 3, headcount: 50, nodeType: 'team' },
            { name: '财务法务', level: 3, headcount: 60, nodeType: 'team' },
            { name: '信息安全', level: 3, headcount: 40, nodeType: 'team' },
          ],
        },
      ],
    },
  ]

  // 7. 小米组织架构
  const xiaomiTree: OrgNodeInput[] = [
    {
      name: '雷军',
      title: '创始人 & CEO',
      level: 1,
      headcount: 35000,
      nodeType: 'person',
      children: [
        {
          name: '手机部',
          title: '业务集团',
          level: 2,
          headcount: 10000,
          nodeType: 'department',
          children: [
            {
              name: '手机产品部',
              level: 3,
              headcount: 2000,
              nodeType: 'department',
              children: [
                { name: '小米数字系列', level: 4, headcount: 500, nodeType: 'team' },
                { name: 'Redmi系列', level: 4, headcount: 800, nodeType: 'team' },
                { name: 'MIX系列', level: 4, headcount: 400, nodeType: 'team' },
                { name: 'Civi系列', level: 4, headcount: 300, nodeType: 'team' },
              ],
            },
            {
              name: '研发中心',
              level: 3,
              headcount: 4000,
              nodeType: 'department',
              children: [
                { name: '芯片研发 (澎湃)', level: 4, headcount: 1000, nodeType: 'team' },
                { name: '影像技术', level: 4, headcount: 1000, nodeType: 'team' },
                { name: '快充技术', level: 4, headcount: 500, nodeType: 'team' },
                { name: '系统软件', level: 4, headcount: 1500, nodeType: 'team' },
              ],
            },
            {
              name: '供应链与质量',
              level: 3,
              headcount: 2000,
              nodeType: 'department',
              children: [
                { name: '采购管理', level: 4, headcount: 800, nodeType: 'team' },
                { name: '质量控制', level: 4, headcount: 700, nodeType: 'team' },
                { name: '生产管理', level: 4, headcount: 500, nodeType: 'team' },
              ],
            },
            {
              name: '营销与销售',
              level: 3,
              headcount: 2000,
              nodeType: 'department',
              children: [
                { name: '品牌营销', level: 4, headcount: 600, nodeType: 'team' },
                { name: '电商运营', level: 4, headcount: 800, nodeType: 'team' },
                { name: '线下渠道', level: 4, headcount: 600, nodeType: 'team' },
              ],
            },
          ],
        },
        {
          name: '智能硬件部',
          title: 'IoT业务集团',
          level: 2,
          headcount: 8000,
          nodeType: 'department',
          children: [
            {
              name: '大家电事业部',
              level: 3,
              headcount: 3000,
              nodeType: 'department',
              children: [
                { name: '小米电视', level: 4, headcount: 1000, nodeType: 'team' },
                { name: '小米空调', level: 4, headcount: 800, nodeType: 'team' },
                { name: '小米冰箱', level: 4, headcount: 600, nodeType: 'team' },
                { name: '小米洗衣机', level: 4, headcount: 600, nodeType: 'team' },
              ],
            },
            {
              name: '可穿戴事业部',
              level: 3,
              headcount: 2000,
              nodeType: 'department',
              children: [
                { name: '小米手表', level: 4, headcount: 800, nodeType: 'team' },
                { name: '小米手环', level: 4, headcount: 600, nodeType: 'team' },
                { name: '耳机音频', level: 4, headcount: 600, nodeType: 'team' },
              ],
            },
            {
              name: '生态链部',
              level: 3,
              headcount: 2000,
              nodeType: 'department',
              children: [
                { name: '生态链投资', level: 4, headcount: 500, nodeType: 'team' },
                { name: '产品管理', level: 4, headcount: 800, nodeType: 'team' },
                { name: '品质管理', level: 4, headcount: 700, nodeType: 'team' },
              ],
            },
            {
              name: '机器人事业部',
              level: 3,
              headcount: 1000,
              nodeType: 'department',
              children: [
                { name: 'CyberDog', level: 4, headcount: 300, nodeType: 'team' },
                { name: 'CyberOne', level: 4, headcount: 400, nodeType: 'team' },
                { name: '扫地机器人', level: 4, headcount: 300, nodeType: 'team' },
              ],
            },
          ],
        },
        {
          name: '互联网业务部',
          level: 2,
          headcount: 5000,
          nodeType: 'department',
          children: [
            {
              name: 'MIUI/HyperOS',
              level: 3,
              headcount: 2000,
              nodeType: 'department',
              children: [
                { name: '系统框架', level: 4, headcount: 600, nodeType: 'team' },
                { name: '系统应用', level: 4, headcount: 800, nodeType: 'team' },
                { name: '安全中心', level: 4, headcount: 600, nodeType: 'team' },
              ],
            },
            {
              name: '互联网服务',
              level: 3,
              headcount: 2000,
              nodeType: 'department',
              children: [
                { name: '游戏中心', level: 4, headcount: 600, nodeType: 'team' },
                { name: '应用商店', level: 4, headcount: 500, nodeType: 'team' },
                { name: '视频会员', level: 4, headcount: 500, nodeType: 'team' },
                { name: '广告业务', level: 4, headcount: 400, nodeType: 'team' },
              ],
            },
            {
              name: '小爱同学',
              level: 3,
              headcount: 1000,
              nodeType: 'department',
              children: [
                { name: '语音技术', level: 4, headcount: 400, nodeType: 'team' },
                { name: '内容服务', level: 4, headcount: 300, nodeType: 'team' },
                { name: 'AI大模型', level: 4, headcount: 300, nodeType: 'team' },
              ],
            },
          ],
        },
        {
          name: '汽车事业部',
          level: 2,
          headcount: 3000,
          nodeType: 'department',
          children: [
            {
              name: '整车研发',
              level: 3,
              headcount: 1200,
              nodeType: 'department',
              children: [
                { name: '车身设计', level: 4, headcount: 300, nodeType: 'team' },
                { name: '三电系统', level: 4, headcount: 500, nodeType: 'team' },
                { name: '智能驾驶', level: 4, headcount: 400, nodeType: 'team' },
              ],
            },
            {
              name: '智能制造',
              level: 3,
              headcount: 1000,
              nodeType: 'department',
              children: [
                { name: '工厂建设', level: 4, headcount: 400, nodeType: 'team' },
                { name: '供应链', level: 4, headcount: 600, nodeType: 'team' },
              ],
            },
            {
              name: '销售与服务',
              level: 3,
              headcount: 800,
              nodeType: 'department',
              children: [
                { name: '渠道建设', level: 4, headcount: 400, nodeType: 'team' },
                { name: '售后服务', level: 4, headcount: 400, nodeType: 'team' },
              ],
            },
          ],
        },
        {
          name: '国际业务部',
          level: 2,
          headcount: 3000,
          nodeType: 'department',
          children: [
            {
              name: '印度区',
              level: 3,
              headcount: 1000,
              nodeType: 'department',
              children: [
                { name: '销售市场', level: 4, headcount: 500, nodeType: 'team' },
                { name: '本地化运营', level: 4, headcount: 500, nodeType: 'team' },
              ],
            },
            {
              name: '欧洲区',
              level: 3,
              headcount: 800,
              nodeType: 'department',
              children: [
                { name: '西欧市场', level: 4, headcount: 400, nodeType: 'team' },
                { name: '东欧市场', level: 4, headcount: 400, nodeType: 'team' },
              ],
            },
            {
              name: '东南亚区',
              level: 3,
              headcount: 700,
              nodeType: 'department',
              children: [
                { name: '印尼市场', level: 4, headcount: 300, nodeType: 'team' },
                { name: '越南市场', level: 4, headcount: 200, nodeType: 'team' },
                { name: '泰国市场', level: 4, headcount: 200, nodeType: 'team' },
              ],
            },
            {
              name: '拉美区',
              level: 3,
              headcount: 500,
              nodeType: 'department',
              children: [
                { name: '巴西市场', level: 4, headcount: 250, nodeType: 'team' },
                { name: '墨西哥市场', level: 4, headcount: 250, nodeType: 'team' },
              ],
            },
          ],
        },
        {
          name: '职能部门',
          level: 2,
          headcount: 2000,
          nodeType: 'department',
          children: [
            { name: '人力资源', level: 3, headcount: 600, nodeType: 'team' },
            { name: '财务审计', level: 3, headcount: 800, nodeType: 'team' },
            { name: '法务合规', level: 3, headcount: 400, nodeType: 'team' },
            { name: '战略投资', level: 3, headcount: 200, nodeType: 'team' },
          ],
        },
      ],
    },
  ]

  // 创建公司
  const companiesData = [
    {
      name: '字节跳动',
      industry: '互联网',
      totalLayers: 5,
      description: '字节跳动是一家全球化的互联网科技公司，旗下产品包括抖音、今日头条、飞书等。',
      tree: bytedanceTree,
    },
    {
      name: 'OpenAI',
      industry: '人工智能',
      totalLayers: 5,
      description: 'OpenAI是全球领先的人工智能研究机构，开发了GPT系列大语言模型。',
      tree: openaiTree,
    },
    {
      name: '月之暗面 (Kimi)',
      industry: '人工智能',
      totalLayers: 5,
      description: '月之暗面是中国领先的AI大模型公司，推出了Kimi智能助手，以长文本处理能力著称。',
      tree: kimiTree,
    },
    {
      name: 'Anthropic',
      industry: '人工智能',
      totalLayers: 5,
      description: 'Anthropic是专注于AI安全的研究公司，开发了Claude系列助手，以安全性和可解释性著称。',
      tree: anthropicTree,
    },
    {
      name: '小米集团',
      industry: '消费电子',
      totalLayers: 5,
      description: '小米是一家以手机、智能硬件和IoT平台为核心的消费电子公司。',
      tree: xiaomiTree,
    },
  ]

  for (const compData of companiesData) {
    const existing = await prisma.company.findFirst({ where: { name: compData.name } })
    if (existing) {
      console.log(`公司已存在，跳过: ${compData.name}`)
      continue
    }

    const company = await prisma.company.create({
      data: {
        name: compData.name,
        industry: compData.industry,
        totalLayers: compData.totalLayers,
        description: compData.description,
      },
    })
    console.log(`公司创建: ${company.name}`)

    await createOrgTree(company.id, compData.tree)
    console.log(`  组织架构数据已写入`)
  }

  console.log('数据初始化完成!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
