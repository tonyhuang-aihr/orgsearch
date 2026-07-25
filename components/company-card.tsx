"use client"

import Link from "next/link"
import { Building2, Users, Layers, ArrowRight, CheckCircle2, Clock, AlertCircle } from "lucide-react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type DataStatus = "verified" | "partial" | "building" | "conflict" | "none"

interface CompanyCardProps {
  id: string
  name: string
  industry: string
  totalLayers: number
  description: string
  headcount?: number
  dataStatus?: DataStatus
  totalNodes?: number
  updatedAt?: string
}

const dataStatusConfig: Record<DataStatus, { label: string; variant: string; icon: any }> = {
  verified: { label: "完整数据", variant: "default", icon: CheckCircle2 },
  partial: { label: "部分覆盖", variant: "secondary", icon: Clock },
  building: { label: "基础骨架", variant: "outline", icon: Building2 },
  conflict: { label: "数据冲突", variant: "destructive", icon: AlertCircle },
  none: { label: "暂无数据", variant: "outline", icon: AlertCircle },
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return ""
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return "今天"
  if (diffDays === 1) return "昨天"
  if (diffDays < 7) return `${diffDays} 天前`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} 周前`
  return `${Math.floor(diffDays / 30)} 月前`
}

export function CompanyCard({ 
  id, 
  name, 
  industry, 
  totalLayers, 
  description,
  dataStatus = "partial",
  totalNodes = 0,
  updatedAt,
}: CompanyCardProps) {
  const statusConfig = dataStatusConfig[dataStatus] || dataStatusConfig.partial
  const StatusIcon = statusConfig.icon

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-fade-in">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-purple-400 flex items-center justify-center text-white font-bold text-lg">
              {name.charAt(0)}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{name}</h3>
              <Badge variant="secondary" className="mt-1">{industry}</Badge>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {description}
        </p>

        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Layers className="w-4 h-4" />
            <span>{totalLayers} 层架构</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{totalNodes.toLocaleString()} 节点</span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <Badge 
            variant={statusConfig.variant as any} 
            className="flex items-center gap-1"
          >
            <StatusIcon className="w-3 h-3" />
            {statusConfig.label}
          </Badge>
          {updatedAt && (
            <span className="text-xs text-muted-foreground">
              更新于 {formatDate(updatedAt)}
            </span>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Link href={`/companies/${id}`} className="w-full">
          <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-white transition-colors">
            查看组织架构
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
