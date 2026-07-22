import prisma from "./prisma"

export interface OrgNodeData {
  id: string
  name: string
  title: string | null
  level: number
  parentId: string | null
  headcount: number
  nodeType: string
  path: string
  children?: OrgNodeData[]
}

export function getFreeLayerCount(totalLayers: number): number {
  return Math.max(1, Math.floor(totalLayers / 2))
}

export function buildTree(nodes: OrgNodeData[]): OrgNodeData[] {
  const nodeMap = new Map<string, OrgNodeData>()
  const roots: OrgNodeData[] = []

  // Initialize all nodes with empty children
  nodes.forEach(node => {
    nodeMap.set(node.id, { ...node, children: [] })
  })

  // Build tree structure
  nodeMap.forEach(node => {
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)!.children!.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}

export function truncateTreeByLevel(nodes: OrgNodeData[], maxLevel: number): OrgNodeData[] {
  function filterNodes(node: OrgNodeData): OrgNodeData | null {
    if (node.level > maxLevel) return null
    
    const filteredChildren = (node.children || [])
      .map(child => filterNodes(child))
      .filter((n): n is OrgNodeData => n !== null)
    
    return { ...node, children: filteredChildren }
  }

  return nodes
    .map(node => filterNodes(node))
    .filter((n): n is OrgNodeData => n !== null)
}

export async function getCompanyOrgTree(companyId: string, isPremium: boolean) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      orgNodes: {
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
    path: node.path,
  }))

  const tree = buildTree(nodes)

  if (!isPremium) {
    const freeLevel = getFreeLayerCount(company.totalLayers)
    const truncatedTree = truncateTreeByLevel(tree, freeLevel)
    return {
      company: {
        id: company.id,
        name: company.name,
        industry: company.industry,
        totalLayers: company.totalLayers,
        description: company.description,
      },
      tree: truncatedTree,
      freeLevel,
      totalLayers: company.totalLayers,
      isPremium: false,
    }
  }

  return {
    company: {
      id: company.id,
      name: company.name,
      industry: company.industry,
      totalLayers: company.totalLayers,
      description: company.description,
    },
    tree,
    freeLevel: null,
    totalLayers: company.totalLayers,
    isPremium: true,
  }
}
