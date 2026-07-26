"use client"

import { useCallback, useRef, useState, useEffect, useMemo } from "react"
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  Handle,
  type NodeProps,
  MarkerType,
  BackgroundVariant,
  Position,
} from "reactflow"
import "reactflow/dist/style.css"
import { Users, Lock, ChevronRight, Plus } from "lucide-react"
import { type OrgNodeData, type NodeStatus, nodeStatusLabels } from "@/lib/org-tree"
import { cn } from "@/lib/utils"
import { EvidenceDrawer } from "@/components/evidence-drawer"

// 节点状态样式配置
const statusStyleMap: Record<NodeStatus, { border: string; dot: string; opacity: string; bg: string }> = {
  confirmed: {
    border: "border-2 border-purple-500",
    dot: "bg-green-500",
    opacity: "opacity-100",
    bg: "bg-white",
  },
  observed: {
    border: "border border-gray-300",
    dot: "bg-yellow-500",
    opacity: "opacity-90",
    bg: "bg-white",
  },
  inferred: {
    border: "border border-blue-200",
    dot: "bg-yellow-500",
    opacity: "opacity-80",
    bg: "bg-blue-50/30",
  },
  conflict: {
    border: "border border-red-400 border-dashed",
    dot: "bg-red-500",
    opacity: "opacity-90",
    bg: "bg-red-50/30",
  },
  deprecated: {
    border: "border border-gray-200",
    dot: "bg-gray-400",
    opacity: "opacity-50",
    bg: "bg-gray-50",
  },
}

// 自定义节点组件数据接口
interface CustomNodeData {
  label: string
  title: string | null
  headcount: number
  nodeType: string
  level: number
  isLocked: boolean
  status: NodeStatus
  hasChildren: boolean
  isExpanded: boolean
  childCount: number
}

function OrgNode({ data }: NodeProps<CustomNodeData>) {
  const { label, title, headcount, nodeType, level, isLocked, status, hasChildren, isExpanded, childCount } = data

  const levelColors: Record<number, string> = {
    1: "from-primary to-purple-600",
    2: "from-purple-500 to-purple-400",
    3: "from-blue-500 to-blue-400",
    4: "from-cyan-500 to-cyan-400",
    5: "from-teal-500 to-teal-400",
  }

  const gradient = levelColors[level] || "from-gray-500 to-gray-400"
  const statusStyle = statusStyleMap[status] || statusStyleMap.observed

  if (isLocked) {
    return (
      <div className="px-4 py-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 min-w-[160px] text-center">
        <Lock className="w-5 h-5 mx-auto text-gray-400 mb-1" />
        <span className="text-xs text-gray-400">升级解锁更多</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "px-4 py-3 rounded-lg shadow-md min-w-[180px] cursor-pointer transition-all hover:shadow-lg",
        statusStyle.border,
        statusStyle.bg,
        statusStyle.opacity
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-primary !w-3 !h-3" />

      {/* 状态指示器 + 类型标签 */}
      <div className="flex items-center justify-between mb-2">
        <div className={`text-xs font-medium text-white px-2 py-0.5 rounded bg-gradient-to-r ${gradient} inline-block`}>
          {nodeType === "person" ? "管理层" : nodeType === "department" ? "部门" : "团队"}
        </div>
        <div className={cn("w-2.5 h-2.5 rounded-full", statusStyle.dot)} title={nodeStatusLabels[status]} />
      </div>

      <div className="font-semibold text-gray-800 text-sm mb-1">{label}</div>
      {title && <div className="text-xs text-gray-500 mb-2">{title}</div>}
      {headcount > 0 && (
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Users className="w-3 h-3" />
          <span>{headcount.toLocaleString()} 人</span>
        </div>
      )}

      {/* 展开指示器 */}
      {hasChildren && !isExpanded && (
        <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-center gap-1 text-xs text-primary font-medium">
          <Plus className="w-3 h-3" />
          <span>{childCount} 个子部门</span>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-3 !h-3" />
    </div>
  )
}

const nodeTypes = {
  org: OrgNode,
}

// 面包屑项类型
interface BreadcrumbItem {
  id: string
  name: string
  level: number
}

interface OrgFlowChartProps {
  tree: OrgNodeData[]
  isPremium: boolean
  totalLayers: number
  freeLevel?: number | null
  onNodeSelect?: (node: OrgNodeData | null) => void
  // 视图模式: "skeleton" (渐进式) | "full" (完整人才地图)
  viewMode?: "skeleton" | "full"
}

// 树形布局计算 - 自底向上计算位置
function calculateTreeLayout(
  rootNodes: OrgNodeData[],
  expandedIds: Set<string>,
  levelHeight: number = 140,
  nodeWidth: number = 200,
  nodeSpacing: number = 30
): { nodes: Node<CustomNodeData>[]; edges: Edge[] } {
  const resultNodes: Node<CustomNodeData>[] = []
  const resultEdges: Edge[] = []

  // 计算子树宽度
  function getSubtreeWidth(node: OrgNodeData, isVisible: boolean): number {
    if (!isVisible) return 0
    if (!node.children || node.children.length === 0) {
      return nodeWidth
    }
    const isExpanded = expandedIds.has(node.id)
    if (!isExpanded) {
      return nodeWidth
    }
    const childrenWidth = node.children.reduce((sum, child, idx) => {
      return sum + getSubtreeWidth(child, true) + (idx > 0 ? nodeSpacing : 0)
    }, 0)
    return Math.max(nodeWidth, childrenWidth)
  }

  // 布局单个节点及其子树
  function layoutNode(node: OrgNodeData, x: number, y: number, isVisible: boolean): number {
    if (!isVisible) return 0

    const isExpanded = expandedIds.has(node.id)
    const hasChildren = !!node.children && node.children.length > 0
    const childCount = node.children?.length || 0

    const subtreeWidth = getSubtreeWidth(node, isVisible)
    const nodeX = x + (subtreeWidth - nodeWidth) / 2

    resultNodes.push({
      id: node.id,
      type: "org",
      position: { x: nodeX, y },
      data: {
        label: node.name,
        title: node.title,
        headcount: node.headcount,
        nodeType: node.nodeType,
        level: node.level,
        isLocked: false,
        status: node.status,
        hasChildren,
        isExpanded,
        childCount,
      },
    })

    if (hasChildren && isExpanded) {
      let currentX = x
      const childY = y + levelHeight

      node.children!.forEach(child => {
        const childWidth = getSubtreeWidth(child, true)
        layoutNode(child, currentX, childY, true)

        resultEdges.push({
          id: `${node.id}-${child.id}`,
          source: node.id,
          target: child.id,
          animated: false,
          style: { stroke: "#cbd5e1", strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#cbd5e1" },
        })

        currentX += childWidth + nodeSpacing
      })
    }

    return subtreeWidth
  }

  // 布局所有根节点
  let currentX = 0
  rootNodes.forEach(root => {
    const rootWidth = layoutNode(root, currentX, 0, true)
    currentX += rootWidth + nodeSpacing * 2
  })

  return { nodes: resultNodes, edges: resultEdges }
}

// 找到从根到指定节点的路径（用于面包屑）
function findPathToNode(nodes: OrgNodeData[], nodeId: string): OrgNodeData[] | null {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return [node]
    }
    if (node.children && node.children.length > 0) {
      const childPath = findPathToNode(node.children, nodeId)
      if (childPath) {
        return [node, ...childPath]
      }
    }
  }
  return null
}

// 获取节点通过id
function findNodeById(nodes: OrgNodeData[], nodeId: string): OrgNodeData | null {
  for (const node of nodes) {
    if (node.id === nodeId) return node
    if (node.children && node.children.length > 0) {
      const found = findNodeById(node.children, nodeId)
      if (found) return found
    }
  }
  return null
}

export default function OrgFlowChart({ 
  tree, 
  isPremium, 
  totalLayers, 
  freeLevel,
  onNodeSelect,
  viewMode = "skeleton",
}: OrgFlowChartProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState<CustomNodeData>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [rfInstance, setRfInstance] = useState<any>(null)

  // 已展开的节点ID集合
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set())
  // 面包屑
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([])
  // 证据抽屉状态
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedNode, setSelectedNode] = useState<OrgNodeData | null>(null)

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  // 初始化：默认展开前两层（L0 + L1）
  useEffect(() => {
    if (!tree || tree.length === 0) return

    if (viewMode === "full") {
      // 完整模式：展开所有节点
      const allIds = new Set<string>()
      const collectAllIds = (nodeList: OrgNodeData[]) => {
        for (const node of nodeList) {
          allIds.add(node.id)
          if (node.children) collectAllIds(node.children)
        }
      }
      collectAllIds(tree)
      setExpandedNodeIds(allIds)
      setBreadcrumbs(tree.map(n => ({ id: n.id, name: n.name, level: n.level })))
    } else {
      // 骨架模式：默认展开根节点（第一层）
      // 第一层子节点不展开，点击才展开
      const initialExpanded = new Set<string>()
      const initialBreadcrumbs: BreadcrumbItem[] = []

      // 添加所有根节点
      tree.forEach(root => {
        initialExpanded.add(root.id)
      })

      // 面包屑用第一个根节点
      if (tree.length > 0) {
        initialBreadcrumbs.push({ id: tree[0].id, name: tree[0].name, level: tree[0].level })
      }

      setExpandedNodeIds(initialExpanded)
      setBreadcrumbs(initialBreadcrumbs)
    }
  }, [tree, viewMode])

  // 节点点击处理
  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node<CustomNodeData>) => {
    const nodeId = node.id
    const nodeData = findNodeById(tree, nodeId)
    if (!nodeData) return

    // 设置选中节点并打开抽屉
    setSelectedNode(nodeData)
    setDrawerOpen(true)
    onNodeSelect?.(nodeData)

    // 如果有子节点且未展开，则展开
    if (nodeData.children && nodeData.children.length > 0 && !expandedNodeIds.has(nodeId)) {
      const newExpanded = new Set(expandedNodeIds)
      newExpanded.add(nodeId)
      setExpandedNodeIds(newExpanded)

      // 更新面包屑
      const path = findPathToNode(tree, nodeId)
      if (path) {
        setBreadcrumbs(path.map(n => ({ id: n.id, name: n.name, level: n.level })))
      }
    }
  }, [tree, expandedNodeIds, onNodeSelect])

  // 面包屑点击回退
  const handleBreadcrumbClick = useCallback((index: number) => {
    if (index >= breadcrumbs.length) return

    const targetCrumb = breadcrumbs[index]
    // 保留到目标层级的所有展开节点
    const newExpanded = new Set<string>()
    const path = findPathToNode(tree, targetCrumb.id)

    if (path) {
      // 添加路径上所有节点
      path.forEach(n => newExpanded.add(n.id))
      setBreadcrumbs(path.map(n => ({ id: n.id, name: n.name, level: n.level })))
      setExpandedNodeIds(newExpanded)
    }
  }, [breadcrumbs, tree])

  // 重新计算布局
  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(() => {
    if (!tree || tree.length === 0) return { nodes: [], edges: [] }
    return calculateTreeLayout(tree, expandedNodeIds, 140, 200, 30)
  }, [tree, expandedNodeIds])

  useEffect(() => {
    let finalNodes = layoutNodes
    let finalEdges = layoutEdges

    // 如果不是 premium，在最后一层节点下添加锁定提示
    if (!isPremium && freeLevel && freeLevel < totalLayers) {
      const lastLevelNodes = finalNodes.filter(n => n.data.level === freeLevel)
      const lockNodes: Node<CustomNodeData>[] = []
      const lockEdges: Edge[] = []

      lastLevelNodes.forEach(node => {
        const lockId = `lock-${node.id}`
        lockNodes.push({
          id: lockId,
          type: "org",
          position: {
            x: node.position.x + (200 - 180) / 2,
            y: node.position.y + 140,
          },
          data: {
            label: "",
            title: null,
            headcount: 0,
            nodeType: "locked",
            level: freeLevel + 1,
            isLocked: true,
            status: "observed",
            hasChildren: false,
            isExpanded: false,
            childCount: 0,
          },
        })
        lockEdges.push({
          id: `lock-edge-${node.id}`,
          source: node.id,
          target: lockId,
          style: { stroke: "#e5e7eb", strokeWidth: 1, strokeDasharray: "5,5" },
        })
      })

      finalNodes = [...finalNodes, ...lockNodes]
      finalEdges = [...finalEdges, ...lockEdges]
    }

    setNodes(finalNodes)
    setEdges(finalEdges)

    // 延迟居中显示
    setTimeout(() => {
      if (rfInstance) {
        rfInstance.fitView({ padding: 0.2 })
      }
    }, 100)
  }, [layoutNodes, layoutEdges, isPremium, freeLevel, totalLayers, setNodes, setEdges, rfInstance])

  const onInit = useCallback((instance: any) => {
    setRfInstance(instance)
    setTimeout(() => instance.fitView({ padding: 0.2 }), 50)
  }, [])

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false)
    onNodeSelect?.(null)
  }, [onNodeSelect])

  return (
    <div ref={reactFlowWrapper} className="w-full h-full flex flex-col">
      {/* 面包屑导航 */}
      {breadcrumbs.length > 0 && viewMode === "skeleton" && (
        <div className="flex items-center gap-1 px-4 py-2 bg-white/80 backdrop-blur border-b text-sm overflow-x-auto">
          <span className="text-xs text-gray-400 shrink-0">当前路径:</span>
          {breadcrumbs.map((crumb, idx) => (
            <div key={crumb.id} className="flex items-center gap-1 shrink-0">
              {idx > 0 && <ChevronRight className="w-3 h-3 text-gray-300" />}
              <button
                className={cn(
                  "px-2 py-0.5 rounded transition-colors whitespace-nowrap",
                  idx === breadcrumbs.length - 1
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-gray-600 hover:text-primary hover:bg-gray-100"
                )}
                onClick={() => handleBreadcrumbClick(idx)}
              >
                {crumb.name}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={onInit}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="top-right"
          className="bg-gradient-to-br from-gray-50 to-white"
          proOptions={{ hideAttribution: true }}
          minZoom={0.2}
          maxZoom={1.5}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e5e7eb" />
          <Controls className="bg-white border border-gray-200 rounded-lg shadow-sm" />
          <MiniMap
            className="bg-white border border-gray-200 rounded-lg"
            nodeStrokeColor="#7c3aed"
            nodeColor={(node) => {
              if ((node.data as CustomNodeData)?.isLocked) return "#e5e7eb"
              return "#c4b5fd"
            }}
            maskColor="rgba(255,255,255,0.8)"
          />
        </ReactFlow>
      </div>

      {/* 证据抽屉 */}
      <EvidenceDrawer
        isOpen={drawerOpen}
        onClose={handleCloseDrawer}
        nodeId={selectedNode?.id || null}
        nodeName={selectedNode?.name || ""}
        nodeTitle={selectedNode?.title || null}
        nodeStatus={selectedNode?.status || "observed"}
        confidenceScore={selectedNode?.confidenceScore || 70}
        evidenceCount={selectedNode?.evidenceCount || 1}
        sourceName={selectedNode?.sourceName || null}
        sourceUrl={selectedNode?.sourceUrl || null}
        sourceType={selectedNode?.sourceType || null}
        evidenceStrength={selectedNode?.evidenceStrength || null}
        lastVerifiedAt={selectedNode?.lastVerifiedAt || null}
      />
    </div>
  )
}
