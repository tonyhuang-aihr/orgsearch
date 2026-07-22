import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const dynamic = 'force-dynamic'

// 初始化数据库：建表（由prisma db push负责）+ seed基础数据
// 部署后访问 /api/init 触发一次即可
export async function GET(request: Request) {
  try {
    // 简单的安全校验：从query parameter传一个secret
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get("secret")
    if (secret !== process.env.NEXTAUTH_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result: any = {}

    // 检查是否已经初始化过（有公司数据就跳过）
    const existingCompanies = await prisma.company.count()
    if (existingCompanies > 0) {
      result.message = "Already initialized"
      result.companies = existingCompanies
      return NextResponse.json(result)
    }

    // 创建默认用户
    const hashedPassword = await bcrypt.hash("demo123", 10)

    const demoUser = await prisma.user.upsert({
      where: { email: "demo@test.com" },
      update: {},
      create: {
        email: "demo@test.com",
        passwordHash: hashedPassword,
        isPremium: false,
      },
    })

    const proUser = await prisma.user.upsert({
      where: { email: "pro@test.com" },
      update: {},
      create: {
        email: "pro@test.com",
        passwordHash: hashedPassword,
        isPremium: true,
      },
    })

    result.users = { demo: demoUser.email, pro: proUser.email }

    // 创建 5 家 Demo 公司 + 组织架构
    const companiesData = [
      {
        name: "字节跳动",
        industry: "互联网",
        totalLayers: 5,
        description: "全球领先的科技公司，旗下有抖音、TikTok、今日头条等产品",
        nodes: buildByteDanceTree(),
      },
      {
        name: "OpenAI",
        industry: "人工智能",
        totalLayers: 5,
        description: "全球领先的人工智能研究公司，开发了GPT系列大模型",
        nodes: buildOpenAITree(),
      },
      {
        name: "月之暗面",
        industry: "人工智能",
        totalLayers: 5,
        description: "中国AI大模型创业公司，Kimi智能助手开发者",
        nodes: buildMoonshotTree(),
      },
      {
        name: "Anthropic",
        industry: "人工智能",
        totalLayers: 5,
        description: "AI安全公司，Claude系列大模型开发商",
        nodes: buildAnthropicTree(),
      },
      {
        name: "小米",
        industry: "消费电子",
        totalLayers: 5,
        description: "以手机、智能硬件和IoT平台为核心的消费电子公司",
        nodes: buildXiaomiTree(),
      },
    ]

    for (const companyData of companiesData) {
      const company = await prisma.company.create({
        data: {
          name: companyData.name,
          industry: companyData.industry,
          totalLayers: companyData.totalLayers,
          description: companyData.description,
        },
      })

      // 递归创建组织节点
      await createNodesRecursive(
        company.id,
        companyData.nodes,
        null,
        1,
        ""
      )
    }

    result.companies_created = companiesData.length

    // 创建激活码
    const codes = []
    for (let i = 1; i <= 10; i++) {
      codes.push({
        code: `ORG-DEMO-${String(i).padStart(3, "0")}`,
      })
    }
    await prisma.activationCode.createMany({ data: codes, skipDuplicates: true })
    result.activation_codes = codes.length

    return NextResponse.json({
      success: true,
      ...result,
      message: "Database initialized successfully",
    })
  } catch (error: any) {
    console.error("Init error:", error)
    return NextResponse.json(
      { error: "初始化失败", details: error.message },
      { status: 500 }
    )
  }
}

async function createNodesRecursive(
  companyId: string,
  nodes: any[],
  parentId: string | null,
  level: number,
  parentPath: string
) {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    const path = parentPath ? `${parentPath}.${i + 1}` : String(i + 1)

    const created = await prisma.orgNode.create({
      data: {
        companyId,
        name: node.name,
        title: node.title || null,
        level,
        parentId,
        nodeType: node.type || "department",
        headcount: node.headcount || 0,
        path,
      },
    })

    if (node.children && node.children.length > 0) {
      await createNodesRecursive(
        companyId,
        node.children,
        created.id,
        level + 1,
        path
      )
    }
  }
}

function buildByteDanceTree() {
  return [
    {
      name: "字节跳动",
      type: "company",
      title: "CEO - 梁汝波",
      headcount: 150000,
      children: [
        {
          name: "抖音集团",
          type: "division",
          title: "总裁 - 张楠",
          headcount: 30000,
          children: [
            {
              name: "抖音产品部",
              type: "department",
              headcount: 800,
              children: [
                { name: "产品设计组", type: "team", headcount: 50 },
                { name: "用户增长组", type: "team", headcount: 80 },
              ],
            },
            {
              name: "抖音运营部",
              type: "department",
              headcount: 1200,
              children: [
                { name: "内容运营组", type: "team", headcount: 100 },
                { name: "达人运营组", type: "team", headcount: 120 },
              ],
            },
            {
              name: "抖音电商部",
              type: "department",
              headcount: 2000,
              children: [
                { name: "商家运营组", type: "team", headcount: 200 },
                { name: "直播电商组", type: "team", headcount: 150 },
              ],
            },
          ],
        },
        {
          name: "TikTok事业部",
          type: "division",
          title: "CEO - Shou Zi Chew",
          headcount: 20000,
          children: [
            {
              name: "TikTok产品部",
              type: "department",
              headcount: 500,
              children: [
                { name: "国际产品组", type: "team", headcount: 40 },
                { name: "安全合规组", type: "team", headcount: 60 },
              ],
            },
            {
              name: "TikTok商业化部",
              type: "department",
              headcount: 800,
              children: [
                { name: "广告销售组", type: "team", headcount: 100 },
                { name: "商业化产品组", type: "team", headcount: 80 },
              ],
            },
          ],
        },
        {
          name: "火山引擎",
          type: "division",
          title: "总裁 - 谭待",
          headcount: 8000,
          children: [
            {
              name: "云服务部",
              type: "department",
              headcount: 1500,
              children: [
                { name: "计算产品组", type: "team", headcount: 60 },
                { name: "存储产品组", type: "team", headcount: 50 },
              ],
            },
            {
              name: "AI中台部",
              type: "department",
              headcount: 1000,
              children: [
                { name: "大模型组", type: "team", headcount: 100 },
                { name: "语音技术组", type: "team", headcount: 80 },
              ],
            },
          ],
        },
        {
          name: "飞书事业部",
          type: "division",
          title: "总裁 - 张楠",
          headcount: 5000,
          children: [
            {
              name: "飞书产品部",
              type: "department",
              headcount: 600,
              children: [
                { name: "协作产品组", type: "team", headcount: 50 },
                { name: "OKR产品组", type: "team", headcount: 30 },
              ],
            },
          ],
        },
      ],
    },
  ]
}

function buildOpenAITree() {
  return [
    {
      name: "OpenAI",
      type: "company",
      title: "CEO - Sam Altman",
      headcount: 2000,
      children: [
        {
          name: "研究部 (Research)",
          type: "division",
          title: "Chief Scientist - Ilya Sutskever",
          headcount: 500,
          children: [
            {
              name: "GPT模型团队",
              type: "department",
              headcount: 150,
              children: [
                { name: "预训练组", type: "team", headcount: 40 },
                { name: "对齐研究组", type: "team", headcount: 30 },
              ],
            },
            {
              name: "多模态团队",
              type: "department",
              headcount: 100,
              children: [
                { name: "DALL-E组", type: "team", headcount: 25 },
                { name: "Sora视频组", type: "team", headcount: 30 },
              ],
            },
            {
              name: "安全研究团队",
              type: "department",
              headcount: 80,
              children: [
                { name: "超对齐组", type: "team", headcount: 20 },
                { name: "红队测试组", type: "team", headcount: 15 },
              ],
            },
          ],
        },
        {
          name: "产品工程部 (Product & Engineering)",
          type: "division",
          title: "CTO - Mira Murati",
          headcount: 800,
          children: [
            {
              name: "ChatGPT产品团队",
              type: "department",
              headcount: 120,
              children: [
                { name: "Web端组", type: "team", headcount: 15 },
                { name: "移动端组", type: "team", headcount: 12 },
              ],
            },
            {
              name: "API平台团队",
              type: "department",
              headcount: 200,
              children: [
                { name: "开发者平台组", type: "team", headcount: 25 },
                { name: "企业服务组", type: "team", headcount: 30 },
              ],
            },
            {
              name: "基础设施团队",
              type: "department",
              headcount: 300,
              children: [
                { name: "GPU集群组", type: "team", headcount: 50 },
                { name: "训练框架组", type: "team", headcount: 40 },
              ],
            },
          ],
        },
        {
          name: "商业化部 (Commercial)",
          type: "division",
          title: "COO - Brad Lightcap",
          headcount: 400,
          children: [
            {
              name: "销售团队",
              type: "department",
              headcount: 150,
              children: [
                { name: "企业销售组", type: "team", headcount: 40 },
                { name: "合作伙伴组", type: "team", headcount: 30 },
              ],
            },
            {
              name: "市场营销团队",
              type: "department",
              headcount: 100,
              children: [
                { name: "品牌市场组", type: "team", headcount: 20 },
                { name: "增长营销组", type: "team", headcount: 25 },
              ],
            },
          ],
        },
      ],
    },
  ]
}

function buildMoonshotTree() {
  return [
    {
      name: "月之暗面",
      type: "company",
      title: "CEO - 杨植麟",
      headcount: 300,
      children: [
        {
          name: "大模型研究院",
          type: "division",
          title: "首席科学家 - 杨植麟",
          headcount: 100,
          children: [
            {
              name: "预训练团队",
              type: "department",
              headcount: 40,
              children: [
                { name: "模型架构组", type: "team", headcount: 12 },
                { name: "训练优化组", type: "team", headcount: 10 },
              ],
            },
            {
              name: "对齐团队",
              type: "department",
              headcount: 30,
              children: [
                { name: "RLHF组", type: "team", headcount: 8 },
                { name: "数据标注组", type: "team", headcount: 15 },
              ],
            },
            {
              name: "多模态团队",
              type: "department",
              headcount: 20,
              children: [
                { name: "视觉理解组", type: "team", headcount: 8 },
                { name: "长文本组", type: "team", headcount: 6 },
              ],
            },
          ],
        },
        {
          name: "产品与工程中心",
          type: "division",
          title: "VP of Engineering",
          headcount: 120,
          children: [
            {
              name: "Kimi产品团队",
              type: "department",
              headcount: 40,
              children: [
                { name: "Web端组", type: "team", headcount: 6 },
                { name: "移动端组", type: "team", headcount: 5 },
              ],
            },
            {
              name: "API平台团队",
              type: "department",
              headcount: 30,
              children: [
                { name: "开放平台组", type: "team", headcount: 8 },
                { name: "解决方案组", type: "team", headcount: 6 },
              ],
            },
            {
              name: "基础设施团队",
              type: "department",
              headcount: 35,
              children: [
                { name: "推理优化组", type: "team", headcount: 10 },
                { name: "GPU调度组", type: "team", headcount: 8 },
              ],
            },
          ],
        },
        {
          name: "商业化中心",
          type: "division",
          title: "VP of Business",
          headcount: 50,
          children: [
            {
              name: "企业服务团队",
              type: "department",
              headcount: 25,
              children: [
                { name: "大客户组", type: "team", headcount: 8 },
                { name: "解决方案组", type: "team", headcount: 10 },
              ],
            },
            {
              name: "市场与品牌团队",
              type: "department",
              headcount: 15,
              children: [
                { name: "品牌组", type: "team", headcount: 5 },
                { name: "公关组", type: "team", headcount: 5 },
              ],
            },
          ],
        },
      ],
    },
  ]
}

function buildAnthropicTree() {
  return [
    {
      name: "Anthropic",
      type: "company",
      title: "CEO - Dario Amodei",
      headcount: 800,
      children: [
        {
          name: "研究部 (Research)",
          type: "division",
          title: "VP Research - Jared Kaplan",
          headcount: 250,
          children: [
            {
              name: "Claude模型团队",
              type: "department",
              headcount: 100,
              children: [
                { name: "预训练组", type: "team", headcount: 30 },
                { name: "RLHF组", type: "team", headcount: 25 },
              ],
            },
            {
              name: "安全与对齐团队",
              type: "department",
              headcount: 80,
              children: [
                { name: "可解释性组", type: "team", headcount: 20 },
                { name: "红队安全组", type: "team", headcount: 15 },
              ],
            },
            {
              name: "政策与社会影响团队",
              type: "department",
              headcount: 40,
              children: [
                { name: "AI政策组", type: "team", headcount: 10 },
                { name: "伦理研究组", type: "team", headcount: 12 },
              ],
            },
          ],
        },
        {
          name: "产品工程部 (Product & Engineering)",
          type: "division",
          title: "CTO - Tom Brown",
          headcount: 350,
          children: [
            {
              name: "Claude产品团队",
              type: "department",
              headcount: 80,
              children: [
                { name: "Web/桌面组", type: "team", headcount: 15 },
                { name: "移动端组", type: "team", headcount: 12 },
              ],
            },
            {
              name: "API平台团队",
              type: "department",
              headcount: 120,
              children: [
                { name: "开发者体验组", type: "team", headcount: 20 },
                { name: "企业客户组", type: "team", headcount: 25 },
              ],
            },
            {
              name: "基础设施团队",
              type: "department",
              headcount: 100,
              children: [
                { name: "训练基建组", type: "team", headcount: 25 },
                { name: "推理服务组", type: "team", headcount: 20 },
              ],
            },
          ],
        },
        {
          name: "商业化与运营",
          type: "division",
          title: "COO",
          headcount: 150,
          children: [
            {
              name: "销售团队",
              type: "department",
              headcount: 60,
              children: [
                { name: "企业销售组", type: "team", headcount: 20 },
                { name: "战略客户组", type: "team", headcount: 15 },
              ],
            },
            {
              name: "市场与传播团队",
              type: "department",
              headcount: 50,
              children: [
                { name: "品牌营销组", type: "team", headcount: 12 },
                { name: "公关传播组", type: "team", headcount: 10 },
              ],
            },
          ],
        },
      ],
    },
  ]
}

function buildXiaomiTree() {
  return [
    {
      name: "小米集团",
      type: "company",
      title: "董事长 - 雷军",
      headcount: 35000,
      children: [
        {
          name: "手机事业部",
          type: "division",
          title: "总裁 - 卢伟冰",
          headcount: 12000,
          children: [
            {
              name: "手机产品部",
              type: "department",
              headcount: 500,
              children: [
                { name: "旗舰产品组", type: "team", headcount: 40 },
                { name: "Redmi产品组", type: "team", headcount: 50 },
              ],
            },
            {
              name: "手机研发部",
              type: "department",
              headcount: 3000,
              children: [
                { name: "硬件研发组", type: "team", headcount: 200 },
                { name: "相机研发组", type: "team", headcount: 150 },
              ],
            },
            {
              name: "供应链与质量部",
              type: "department",
              headcount: 1500,
              children: [
                { name: "采购组", type: "team", headcount: 100 },
                { name: "质量管控组", type: "team", headcount: 80 },
              ],
            },
          ],
        },
        {
          name: "生态链与IoT事业部",
          type: "division",
          title: "总裁 - 屈恒",
          headcount: 8000,
          children: [
            {
              name: "智能硬件部",
              type: "department",
              headcount: 2000,
              children: [
                { name: "电视产品组", type: "team", headcount: 80 },
                { name: "手环手表组", type: "team", headcount: 60 },
              ],
            },
            {
              name: "小米汽车部",
              type: "department",
              headcount: 2500,
              children: [
                { name: "整车研发组", type: "team", headcount: 300 },
                { name: "智能驾驶组", type: "team", headcount: 200 },
              ],
            },
            {
              name: "米家生态链部",
              type: "department",
              headcount: 800,
              children: [
                { name: "生态链投资组", type: "team", headcount: 30 },
                { name: "产品管理组", type: "team", headcount: 40 },
              ],
            },
          ],
        },
        {
          name: "互联网事业部",
          type: "division",
          title: "总裁 - 马骥",
          headcount: 5000,
          children: [
            {
              name: "MIUI系统部",
              type: "department",
              headcount: 1500,
              children: [
                { name: "系统框架组", type: "team", headcount: 80 },
                { name: "系统应用组", type: "team", headcount: 100 },
              ],
            },
            {
              name: "互联网商业化部",
              type: "department",
              headcount: 1200,
              children: [
                { name: "广告变现组", type: "team", headcount: 100 },
                { name: "游戏联运组", type: "team", headcount: 60 },
              ],
            },
          ],
        },
        {
          name: "集团职能平台",
          type: "division",
          title: "CFO - 林世伟",
          headcount: 3000,
          children: [
            {
              name: "人力资源部",
              type: "department",
              headcount: 600,
              children: [
                { name: "招聘组", type: "team", headcount: 50 },
                { name: "组织发展组", type: "team", headcount: 30 },
              ],
            },
            {
              name: "财务部",
              type: "department",
              headcount: 400,
              children: [
                { name: "财务核算组", type: "team", headcount: 40 },
                { name: "战略投资组", type: "team", headcount: 30 },
              ],
            },
          ],
        },
      ],
    },
  ]
}
