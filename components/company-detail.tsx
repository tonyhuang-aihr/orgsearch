"use client"

import { useState, useEffect } from "react"
import { Download, Lock, ArrowLeft, Zap, Layers, Users, Building2, CheckCircle2, Clock, AlertCircle, Globe, Map as MapIcon } from "lucide-react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import OrgFlowChart from "@/components/org-flow-chart"
import { cn } from "@/lib/utils"

interface CompanyDetailProps {
  companyId: string
}

type ViewType = "department" | "reporting"
type ViewMode = "skeleton" | "full"

// 数据状态配置
const dataStatusConfig: Record<string, { label: string; variant: string; icon: any; color: string }> = {
  verified: { label: "已验证", variant: "default", icon: CheckCircle2, color: "text-green-600 bg-green-50 border-green-200" },
  partial: { label: "部分覆盖", variant: "secondary", icon: Clock, color: "text-amber-600 bg-amber-50 border-amber-200" },
  building: { label: "构建中", variant: "outline", icon: Building2, color: "text-blue-600 bg-blue-50 border-blue-200" },
  conflict: { label: "存在冲突", variant: "destructive", icon: AlertCircle, color: "text-red-600 bg-red-50 border-red-200" },
  none: { label: "暂无数据", variant: "outline", icon: AlertCircle, color: "text-gray-600 bg-gray-50 border-gray-200" },
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "暂无"
  const date = new Date(dateStr)
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default function CompanyDetail({ companyId }: CompanyDetailProps) {
  const { data: session } = useSession()
  const [companyData, setCompanyData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [viewType, setViewType] = useState<ViewType>("department")
  const [viewMode, setViewMode] = useState<ViewMode>("skeleton")
  const [showFullViewWarning, setShowFullViewWarning] = useState(false)

  const isPremium = (session?.user as any)?.isPremium || false

  useEffect(() => {
    fetchOrgTree()
  }, [companyId, viewType])

  async function fetchOrgTree() {
    setLoading(true)
    try {
      const res = await fetch(`/api/org-tree/${companyId}?view=${viewType}`)
      const data = await res.json()
      setCompanyData(data)
    } catch (error) {
      console.error("Failed to fetch org tree:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDownload(format: 'png' | 'pdf') {
    if (!isPremium) {
      alert("请升级 Pro 会员后下载完整组织架构图")
      return
    }

    setDownloading(true)
    try {
      const html2canvas = (await import("html2canvas")).default
      const jspdf = (await import("jspdf")).default

      // 捕获整个 ReactFlow 视口（包含背景）
      const flowContainer = document.querySelector('.react-flow') as HTMLElement
      if (!flowContainer) {
        alert("图表加载中，请稍候再试")
        return
      }

      const canvas = await html2canvas(flowContainer, {
        backgroundColor: '#f9fafb', // 匹配 gray-50 背景
        scale: 2,
        useCORS: true,
        logging: false,
        // 确保捕获完整内容
        width: flowContainer.scrollWidth,
        height: flowContainer.scrollHeight,
        windowWidth: flowContainer.scrollWidth,
        windowHeight: flowContainer.scrollHeight,
      })

      const companyName = companyData?.company?.name || 'org-chart'
      const viewTypeLabel = viewType === 'department' ? '职能架构' : '汇报线'
      const dateStr = new Date().toISOString().split('T')[0]
      const fileName = `${companyName}_${viewTypeLabel}_${dateStr}`

      if (format === 'png') {
        const link = document.createElement('a')
        link.download = `${fileName}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
      } else {
        const imgData = canvas.toDataURL('image/png')
        const pdf = new jspdf({
          orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [canvas.width, canvas.height],
        })
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)
        pdf.save(`${fileName}.pdf`)
      }
    } catch (error) {
      console.error("Download failed:", error)
      alert("下载失败，请重试")
    } finally {
      setDownloading(false)
    }
  }

  const handleViewModeChange = (mode: ViewMode) => {
    if (mode === "full" && viewMode !== "full") {
      setShowFullViewWarning(true)
      // 短暂显示提示后切换
      setTimeout(() => {
        setShowFullViewWarning(false)
        setViewMode("full")
      }, 1500)
    } else {
      setViewMode(mode)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded mb-4" />
          <div className="h-64 bg-gray-100 rounded-lg" />
        </div>
      </div>
    )
  }

  if (!companyData) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-muted-foreground">公司不存在</p>
        <Link href="/">
          <Button className="mt-4">返回首页</Button>
        </Link>
      </div>
    )
  }

  const { company, tree, freeLevel, totalLayers, totalNodes } = companyData
  const dataStatus = company?.dataStatus || "partial"
  const statusConfig = dataStatusConfig[dataStatus] || dataStatusConfig.partial
  const StatusIcon = statusConfig.icon

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  返回
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-purple-400 flex items-center justify-center text-white font-bold text-xl">
                  {company.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold">{company.name}</h1>
                    <Badge className={cn("font-medium border", statusConfig.color)}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusConfig.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                    <Badge variant="secondary">{company.industry}</Badge>
                    <span className="flex items-center gap-1">
                      <Layers className="w-4 h-4" />
                      {company.totalLayers} 层架构
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isPremium && (
                <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">
                  <Lock className="w-4 h-4" />
                  <span>免费预览 {freeLevel}/{totalLayers} 层</span>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={() => handleDownload('png')} disabled={downloading}>
                <Download className="w-4 h-4 mr-2" />
                PNG
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDownload('pdf')} disabled={downloading}>
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>

          {/* 数据状态摘要栏 */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* 骨架覆盖率 */}
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">骨架覆盖率</p>
              <p className="text-sm font-semibold text-gray-800">
                {company.skeletonCoverage || `${totalNodes || 0} 个节点`}
              </p>
            </div>
            {/* 最后验证时间 */}
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">最后验证</p>
              <p className="text-sm font-semibold text-gray-800">
                {formatDate(company.lastVerifiedAt || company.updatedAt)}
              </p>
            </div>
            {/* 数据质量分 */}
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">数据质量</p>
              <p className="text-sm font-semibold text-gray-800">
                {company.dataQualityScore ?? 70} / 100 分
              </p>
            </div>
            {/* 数据来源 */}
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">数据来源</p>
              <p className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" />
                The Org
              </p>
            </div>
          </div>

          {!isPremium && (
            <div className="mt-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-sm font-medium text-amber-900">
                    升级 Pro 会员，查看完整 {totalLayers} 层组织架构
                  </p>
                  <p className="text-xs text-amber-700">
                    支持下载 PNG/PDF，解锁全部公司数据
                  </p>
                </div>
              </div>
              <Link href={session ? "/me/activate" : "/register"}>
                <Button size="sm" className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
                  立即升级
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* View Switch & Info Bar */}
      <div className="bg-gray-50 border-b relative">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            {/* 视图切换 */}
            <div className="flex items-center gap-4">
              {/* 视图类型切换 */}
              <div className="flex items-center gap-1 bg-white rounded-lg border p-1">
                <button
                  onClick={() => setViewType("department")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewType === "department"
                      ? "bg-primary text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  职能分类
                </button>
                <button
                  onClick={() => setViewType("reporting")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewType === "reporting"
                      ? "bg-primary text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <Users className="w-4 h-4" />
                  汇报线
                </button>
              </div>

              {/* 视图模式切换 */}
              <div className="flex items-center gap-1 bg-white rounded-lg border p-1">
                <button
                  onClick={() => handleViewModeChange("skeleton")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === "skeleton"
                      ? "bg-purple-100 text-purple-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  渐进浏览
                </button>
                <button
                  onClick={() => handleViewModeChange("full")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === "full"
                      ? "bg-purple-100 text-purple-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <MapIcon className="w-4 h-4" />
                  完整人才地图
                </button>
              </div>
            </div>

            {/* 层数信息 */}
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Layers className="w-4 h-4" />
                {totalLayers || 0} 层
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {totalNodes?.toLocaleString() || 0} 节点
              </span>
            </div>
          </div>
          {company.description && (
            <p className="text-sm text-muted-foreground mt-2">{company.description}</p>
          )}
        </div>

        {/* 完整视图加载提示 */}
        {showFullViewWarning && (
          <div className="absolute inset-0 bg-purple-50/90 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-purple-700 font-medium">
                完整视图将加载所有节点，可能较慢...
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Org Chart */}
      <div className="flex-1 relative">
        <OrgFlowChart
          tree={tree}
          isPremium={isPremium}
          totalLayers={totalLayers}
          freeLevel={freeLevel}
          viewMode={viewMode}
        />
      </div>
    </div>
  )
}
