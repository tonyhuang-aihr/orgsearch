"use client"

import { useEffect, useState } from "react"
import { X, ExternalLink, Clock, Database, Shield, FileText, Link2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { type NodeStatus, nodeStatusLabels } from "@/lib/org-tree"
import { cn } from "@/lib/utils"

interface EvidenceItem {
  id: string
  sourceType: string | null
  sourceName: string | null
  sourceUrl: string | null
  evidenceStrength: string | null
  publishedAt: string | null
  excerpt: string | null
}

interface EvidenceDrawerProps {
  isOpen: boolean
  onClose: () => void
  nodeId: string | null
  nodeName: string
  nodeTitle: string | null
  nodeStatus: NodeStatus
  confidenceScore: number
  evidenceCount: number
  sourceName: string | null
  sourceUrl: string | null
  sourceType: string | null
  evidenceStrength: string | null
  lastVerifiedAt: string | null
}

const statusColorMap: Record<NodeStatus, { bg: string; border: string; dot: string; text: string }> = {
  confirmed: { bg: "bg-purple-50", border: "border-purple-400", dot: "bg-green-500", text: "text-purple-700" },
  observed: { bg: "bg-gray-50", border: "border-gray-300", dot: "bg-yellow-500", text: "text-gray-700" },
  inferred: { bg: "bg-blue-50", border: "border-blue-300", dot: "bg-yellow-500", text: "text-blue-700" },
  conflict: { bg: "bg-red-50", border: "border-red-300 border-dashed", dot: "bg-red-500", text: "text-red-700" },
  deprecated: { bg: "bg-gray-100", border: "border-gray-200", dot: "bg-gray-400", text: "text-gray-500" },
}

const sourceTypeLabels: Record<string, string> = {
  theorg: "The Org",
  official_board: "官方公告",
  company_website: "公司官网",
  linkedin: "LinkedIn",
  news_article: "新闻报道",
  internal_leak: "内部消息",
}

const evidenceStrengthLabels: Record<string, { label: string; color: string }> = {
  direct: { label: "直接证据", color: "text-green-600 bg-green-50" },
  indirect: { label: "间接证据", color: "text-amber-600 bg-amber-50" },
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "未知"
  const date = new Date(dateStr)
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function EvidenceDrawer({
  isOpen,
  onClose,
  nodeId,
  nodeName,
  nodeTitle,
  nodeStatus,
  confidenceScore,
  evidenceCount,
  sourceName,
  sourceUrl,
  sourceType,
  evidenceStrength,
  lastVerifiedAt,
}: EvidenceDrawerProps) {
  const [mounted, setMounted] = useState(false)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      // 触发入场动画
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimating(true)
        })
      })
    } else {
      setAnimating(false)
      // 等待离场动画完成后卸载
      const timer = setTimeout(() => setMounted(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // ESC 关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  // 锁定 body 滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  if (!mounted) return null

  const statusConfig = statusColorMap[nodeStatus] || statusColorMap.observed
  const strengthConfig = evidenceStrength ? evidenceStrengthLabels[evidenceStrength] : null
  const sourceLabel = sourceType ? sourceTypeLabels[sourceType] || sourceType : sourceName || "未知来源"

  // 模拟证据列表（第一波先接单源数据）
  const evidenceList: EvidenceItem[] = sourceName
    ? [
        {
          id: "1",
          sourceType,
          sourceName,
          sourceUrl,
          evidenceStrength,
          publishedAt: lastVerifiedAt,
          excerpt: `该部门/职位信息来源于 ${sourceName}，已通过数据校验。`,
        },
      ]
    : []

  return (
    <div className="fixed inset-0 z-50">
      {/* 遮罩层 */}
      <div
        className={cn(
          "absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300",
          animating ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />

      {/* 抽屉 */}
      <div
        className={cn(
          "absolute right-0 top-0 h-full w-[380px] max-w-[90vw] bg-white shadow-2xl transition-transform duration-300 ease-out flex flex-col",
          animating ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* 头部 */}
        <div className="p-5 border-b flex items-start justify-between">
          <div className="flex-1 pr-4">
            <h3 className="text-lg font-bold text-gray-900 mb-1">{nodeName}</h3>
            {nodeTitle && <p className="text-sm text-gray-500">{nodeTitle}</p>}
            <div className="flex items-center gap-2 mt-3">
              <div className={cn("w-2.5 h-2.5 rounded-full", statusConfig.dot)} />
              <Badge variant="outline" className={cn("font-medium", statusConfig.text)}>
                {nodeStatusLabels[nodeStatus]}
              </Badge>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto">
          {/* 置信度 */}
          <div className="p-5 border-b">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">数据置信度</span>
              <span className="text-sm font-semibold text-primary">{confidenceScore}%</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full transition-all"
                style={{ width: `${confidenceScore}%` }}
              />
            </div>
          </div>

          {/* 最后验证时间 */}
          <div className="p-5 border-b flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
              <Clock className="w-4 h-4 text-gray-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">最后验证时间</p>
              <p className="text-sm font-medium text-gray-800">
                {formatDate(lastVerifiedAt)}
              </p>
            </div>
          </div>

          {/* 证据列表 */}
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-gray-500" />
              <h4 className="text-sm font-semibold text-gray-800">
                证据来源 ({evidenceCount})
              </h4>
            </div>

            {evidenceList.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Database className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">暂无证据数据</p>
              </div>
            ) : (
              <div className="space-y-3">
                {evidenceList.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-lg border border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                          <Link2 className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <span className="text-sm font-medium text-gray-800">
                          {item.sourceName || sourceLabel}
                        </span>
                      </div>
                      {item.evidenceStrength && strengthConfig && (
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", strengthConfig.color)}>
                          {strengthConfig.label}
                        </span>
                      )}
                    </div>

                    {item.excerpt && (
                      <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                        {item.excerpt}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(item.publishedAt)}
                      </span>
                      {item.sourceUrl && (
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
                        >
                          查看来源
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 底部 */}
        <div className="p-4 border-t bg-gray-50/50">
          <p className="text-xs text-gray-400 text-center">
            <Shield className="w-3 h-3 inline mr-1 -mt-0.5" />
            数据仅供参考，请结合多方信息综合判断
          </p>
        </div>
      </div>
    </div>
  )
}
