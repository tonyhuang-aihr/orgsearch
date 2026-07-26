import prisma from "./prisma"
import { buildTree, getFreeLayerCount, truncateTreeByLevel, countNodes, type OrgNodeData, type NodeStatus } from "./org-tree"

export async function getCompanyOrgTree(companyId: string, isPremium: boolean, viewType: string = 'department') {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      orgNodes: {
        where: { viewType },
        orderBy: { level: 'asc' },
      },
    },
  })

  if (!company) return null

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
    status: node.status as NodeStatus,
    confidenceScore: node.confidenceScore,
    evidenceCount: node.evidenceCount,
    sourceName: node.sourceName,
    sourceUrl: node.sourceUrl,
    sourceType: node.sourceType,
    evidenceStrength: node.evidenceStrength,
    lastVerifiedAt: node.lastVerifiedAt ? node.lastVerifiedAt.toISOString() : null,
  }))

  const tree = buildTree(nodes)
  const totalLayers = nodes.length > 0 ? Math.max(...nodes.map(n => n.level)) : 0
  const totalNodes = countNodes(tree)

  const companyData = {
    id: company.id,
    name: company.name,
    industry: company.industry,
    totalLayers: company.totalLayers,
    description: company.description,
    dataStatus: company.dataStatus,
    skeletonCoverage: company.skeletonCoverage,
    lastVerifiedAt: company.lastVerifiedAt,
    dataQualityScore: company.dataQualityScore,
    updatedAt: company.updatedAt,
  }

  if (!isPremium) {
    const freeLevel = getFreeLayerCount(totalLayers)
    const truncatedTree = truncateTreeByLevel(tree, freeLevel)
    return {
      company: companyData,
      tree: truncatedTree,
      freeLevel,
      totalLayers,
      totalNodes,
      viewType,
      isPremium: false as const,
    }
  }

  return {
    company: companyData,
    tree,
    freeLevel: null,
    totalLayers,
    totalNodes,
    viewType,
    isPremium: true as const,
  }
}
