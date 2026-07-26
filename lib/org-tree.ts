export type NodeStatus = "confirmed" | "observed" | "inferred" | "conflict" | "deprecated"
export type DataStatus = "verified" | "partial" | "building" | "conflict" | "none"

export interface OrgNodeData {
  id: string
  name: string
  title: string | null
  level: number
  parentId: string | null
  headcount: number
  nodeType: string
  viewType: string
  avatarUrl: string | null
  path: string
  status: NodeStatus
  confidenceScore: number
  evidenceCount: number
  sourceName: string | null
  sourceUrl: string | null
  sourceType: string | null
  evidenceStrength: string | null
  lastVerifiedAt: string | null
  children?: OrgNodeData[]
}

export function getFreeLayerCount(totalLayers: number): number {
  // evaluation_only 版本：免费统一展示 2 层
  return Math.min(2, totalLayers)
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

// 节点状态显示文本
export const nodeStatusLabels: Record<NodeStatus, string> = {
  confirmed: "已确认",
  observed: "已观测",
  inferred: "已推断",
  conflict: "待确认",
  deprecated: "已废弃",
}

// 数据状态显示文本
export const dataStatusLabels: Record<DataStatus, string> = {
  verified: "已验证",
  partial: "部分覆盖",
  building: "构建中",
  conflict: "存在冲突",
  none: "暂无数据",
}

// 计算节点总数
export function countNodes(nodes: OrgNodeData[]): number {
  let count = 0
  function walk(nodeList: OrgNodeData[]) {
    for (const node of nodeList) {
      count++
      if (node.children && node.children.length > 0) {
        walk(node.children)
      }
    }
  }
  walk(nodes)
  return count
}
