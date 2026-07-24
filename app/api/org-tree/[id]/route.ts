import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { buildTree, getFreeLayerCount, truncateTreeByLevel, type OrgNodeData } from "@/lib/org-tree"

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const isPremium = (session?.user as any)?.isPremium || false

    const { searchParams } = new URL(request.url)
    const viewType = searchParams.get('view') || 'department' // department | reporting

    const companyId = params.id

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        orgNodes: {
          where: { viewType },
          orderBy: [{ level: "asc" }, { path: "asc" }],
        },
      },
    })

    if (!company) {
      return NextResponse.json(
        { error: "公司不存在" },
        { status: 404 }
      )
    }

    const nodes: OrgNodeData[] = company.orgNodes.map(node => ({
      id: node.id,
      name: node.name,
      title: node.title,
      level: node.level,
      parentId: node.parentId,
      headcount: node.headcount,
      nodeType: node.nodeType,
      viewType: node.viewType,
      avatarUrl: node.avatarUrl,
      path: node.path,
    }))

    const tree = buildTree(nodes)

    // 动态计算当前视图的总层数
    const totalLayers = nodes.length > 0 ? Math.max(...nodes.map(n => n.level)) : 0

    // 记录查询日志
    if (session?.user) {
      try {
        await prisma.queryLog.create({
          data: {
            userId: (session.user as any).id,
            companyId: company.id,
          },
        })
      } catch (e) {
        // ignore log errors
      }
    }

    if (!isPremium) {
      const freeLevel = getFreeLayerCount(totalLayers)
      const truncatedTree = truncateTreeByLevel(tree, freeLevel)
      return NextResponse.json({
        company: {
          id: company.id,
          name: company.name,
          industry: company.industry,
          totalLayers: company.totalLayers,
          description: company.description,
        },
        tree: truncatedTree,
        freeLevel,
        totalLayers,
        viewType,
        isPremium: false,
      })
    }

    return NextResponse.json({
      company: {
        id: company.id,
        name: company.name,
        industry: company.industry,
        totalLayers: company.totalLayers,
        description: company.description,
      },
      tree,
      freeLevel: null,
      totalLayers,
      viewType,
      isPremium: true,
    })
  } catch (error) {
    console.error("Get org tree error:", error)
    return NextResponse.json(
      { error: "获取组织架构失败" },
      { status: 500 }
    )
  }
}
