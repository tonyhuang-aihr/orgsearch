"use client"

import { useCallback, useRef, useState, useEffect } from "react"
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
import { Users, Lock } from "lucide-react"
import { OrgNodeData } from "@/lib/org-tree"

// 自定义节点组件
function OrgNode({ data }: NodeProps) {
  const { label, title, headcount, nodeType, isLocked, level } = data

  const levelColors: Record<number, string> = {
    1: "from-primary to-purple-600",
    2: "from-purple-500 to-purple-400",
    3: "from-blue-500 to-blue-400",
    4: "from-cyan-500 to-cyan-400",
    5: "from-teal-500 to-teal-400",
  }

  const gradient = levelColors[level as number] || "from-gray-500 to-gray-400"

  if (isLocked) {
    return (
      <div className="px-4 py-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 min-w-[160px] text-center">
        <Lock className="w-5 h-5 mx-auto text-gray-400 mb-1" />
        <span className="text-xs text-gray-400">升级解锁更多</span>
      </div>
    )
  }

  return (
    <div className="px-4 py-3 rounded-lg shadow-md border border-gray-200 bg-white min-w-[180px]">
      <Handle type="target" position={Position.Top} className="!bg-primary !w-3 !h-3" />
      <div className={`text-xs font-medium text-white px-2 py-0.5 rounded bg-gradient-to-r ${gradient} mb-2 inline-block`}>
        {nodeType === "person" ? "管理层" : nodeType === "department" ? "部门" : "团队"}
      </div>
      <div className="font-semibold text-gray-800 text-sm mb-1">{label}</div>
      {title && <div className="text-xs text-gray-500 mb-2">{title}</div>}
      {headcount > 0 && (
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Users className="w-3 h-3" />
          <span>{headcount.toLocaleString()} 人</span>
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-3 !h-3" />
    </div>
  )
}

const nodeTypes = {
  org: OrgNode,
}

interface OrgFlowChartProps {
  tree: OrgNodeData[]
  isPremium: boolean
  totalLayers: number
  freeLevel?: number | null
}

// 树形布局计算 - 自底向上计算位置
function calculateTreeLayout(
  rootNodes: OrgNodeData[],
  levelHeight: number = 120,
  nodeWidth: number = 200,
  nodeSpacing: number = 30
): { nodes: Node[]; edges: Edge[] } {
  const resultNodes: Node[] = []
  const resultEdges: Edge[] = []

  // 计算子树宽度
  function getSubtreeWidth(node: OrgNodeData): number {
    if (!node.children || node.children.length === 0) {
      return nodeWidth
    }
    const childrenWidth = node.children.reduce((sum, child, idx) => {
      return sum + getSubtreeWidth(child) + (idx > 0 ? nodeSpacing : 0)
    }, 0)
    return Math.max(nodeWidth, childrenWidth)
  }

  // 布局单个节点及其子树
  function layoutNode(node: OrgNodeData, x: number, y: number): void {
    const subtreeWidth = getSubtreeWidth(node)
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
      },
    })

    if (node.children && node.children.length > 0) {
      let currentX = x
      const childY = y + levelHeight

      node.children.forEach(child => {
        const childWidth = getSubtreeWidth(child)
        layoutNode(child, currentX, childY)

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
  }

  // 布局所有根节点
  let currentX = 0
  rootNodes.forEach(root => {
    const rootWidth = getSubtreeWidth(root)
    layoutNode(root, currentX, 0)
    currentX += rootWidth + nodeSpacing * 2
  })

  return { nodes: resultNodes, edges: resultEdges }
}

export default function OrgFlowChart({ tree, isPremium, totalLayers, freeLevel }: OrgFlowChartProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [rfInstance, setRfInstance] = useState<any>(null)

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  useEffect(() => {
    if (!tree || tree.length === 0) return

    const { nodes: layoutNodes, edges: layoutEdges } = calculateTreeLayout(tree, 120, 200, 30)

    // 如果不是 premium，在最后一层节点下添加锁定提示
    if (!isPremium && freeLevel && freeLevel < totalLayers) {
      const lastLevelNodes = layoutNodes.filter(n => n.data.level === freeLevel)
      lastLevelNodes.forEach(node => {
        const lockId = `lock-${node.id}`
        layoutNodes.push({
          id: lockId,
          type: "org",
          position: {
            x: node.position.x + (200 - 180) / 2,
            y: node.position.y + 120,
          },
          data: {
            label: "",
            title: null,
            headcount: 0,
            nodeType: "locked",
            level: freeLevel + 1,
            isLocked: true,
          },
        })
        layoutEdges.push({
          id: `lock-edge-${node.id}`,
          source: node.id,
          target: lockId,
          style: { stroke: "#e5e7eb", strokeWidth: 1, strokeDasharray: "5,5" },
        })
      })
    }

    setNodes(layoutNodes)
    setEdges(layoutEdges)

    // 延迟居中显示
    setTimeout(() => {
      if (rfInstance) {
        rfInstance.fitView({ padding: 0.2 })
      }
    }, 100)
  }, [tree, isPremium, freeLevel, totalLayers, setNodes, setEdges, rfInstance])

  const onInit = useCallback((instance: any) => {
    setRfInstance(instance)
    setTimeout(() => instance.fitView({ padding: 0.2 }), 50)
  }, [])

  return (
    <div ref={reactFlowWrapper} className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={onInit}
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
            if (node.data.isLocked) return "#e5e7eb"
            return "#c4b5fd"
          }}
          maskColor="rgba(255,255,255,0.8)"
        />
      </ReactFlow>
    </div>
  )
}
