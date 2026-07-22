"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, X, ArrowLeft, Building2, Layers, Users, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Company {
  id: string
  name: string
  industry: string
  totalLayers: number
  description: string
  nodeCount?: number
}

export default function ComparePage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [compareData, setCompareData] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCompanies()
  }, [])

  async function fetchCompanies() {
    try {
      const res = await fetch("/api/companies")
      const data = await res.json()
      setCompanies(data.companies)
    } catch (error) {
      console.error("Failed to fetch companies:", error)
    } finally {
      setLoading(false)
    }
  }

  function handleAddCompany(companyId: string) {
    if (selectedIds.length >= 3) return
    if (selectedIds.includes(companyId)) return
    setSelectedIds([...selectedIds, companyId])
  }

  function handleRemoveCompany(companyId: string) {
    setSelectedIds(selectedIds.filter(id => id !== companyId))
  }

  useEffect(() => {
    // 获取选中公司的详情用于对比
    const selectedCompanies = companies.filter(c => selectedIds.includes(c.id))
    // 模拟节点数（实际可从API获取）
    setCompareData(selectedCompanies.map(c => ({
      ...c,
      nodeCount: c.totalLayers * 10,
    })))
  }, [selectedIds, companies])

  const availableCompanies = companies.filter(c => !selectedIds.includes(c.id))

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" />
        返回首页
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">组织架构对比</h1>
        <p className="text-muted-foreground">
          选择最多 3 家公司，对比其组织架构设计
        </p>
      </div>

      {/* Company Selector */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium">添加公司：</span>
            <Select
              disabled={selectedIds.length >= 3 || availableCompanies.length === 0}
              onValueChange={handleAddCompany}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder={selectedIds.length >= 3 ? "已达上限" : "选择公司..."} />
              </SelectTrigger>
              <SelectContent>
                {availableCompanies.map(company => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name} - {company.industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              已选 {selectedIds.length}/3 家
            </span>
          </div>

          {/* Selected Tags */}
          {selectedIds.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
              {compareData.map(company => (
                <div
                  key={company.id}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-100 text-primary-700 rounded-full text-sm"
                >
                  <span className="font-medium">{company.name}</span>
                  <button
                    onClick={() => handleRemoveCompany(company.id)}
                    className="hover:bg-primary-200 rounded-full p-0.5 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compare Results */}
      {compareData.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-muted-foreground mb-2">请选择要对比的公司</p>
            <p className="text-sm text-muted-foreground">
              最多可选择 3 家公司进行组织架构对比
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-lg border">
            <thead>
              <tr className="border-b">
                <th className="text-left p-4 font-medium text-muted-foreground w-40">对比项</th>
                {compareData.map(company => (
                  <th key={company.id} className="p-4 text-center min-w-[200px]">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-purple-400 flex items-center justify-center text-white font-bold">
                        {company.name.charAt(0)}
                      </div>
                      <div className="text-left">
                        <p className="font-semibold">{company.name}</p>
                        <Badge variant="secondary" className="text-xs">{company.industry}</Badge>
                      </div>
                    </div>
                  </th>
                ))}
                {Array.from({ length: 3 - compareData.length }).map((_, i) => (
                  <th key={`empty-${i}`} className="p-4 min-w-[200px]">
                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                      <Plus className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm text-gray-400">添加公司</p>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-4 text-sm text-muted-foreground">组织层级</td>
                {compareData.map(company => (
                  <td key={company.id} className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Layers className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-lg">{company.totalLayers}</span>
                      <span className="text-sm text-muted-foreground">层</span>
                    </div>
                  </td>
                ))}
                {Array.from({ length: 3 - compareData.length }).map((_, i) => (
                  <td key={`empty-${i}`} className="p-4 text-center text-gray-300">-</td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="p-4 text-sm text-muted-foreground">所属行业</td>
                {compareData.map(company => (
                  <td key={company.id} className="p-4 text-center">
                    <Badge>{company.industry}</Badge>
                  </td>
                ))}
                {Array.from({ length: 3 - compareData.length }).map((_, i) => (
                  <td key={`empty-${i}`} className="p-4 text-center text-gray-300">-</td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="p-4 text-sm text-muted-foreground">部门数量</td>
                {compareData.map(company => (
                  <td key={company.id} className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-500" />
                      <span className="font-semibold">约 {company.nodeCount}+</span>
                    </div>
                  </td>
                ))}
                {Array.from({ length: 3 - compareData.length }).map((_, i) => (
                  <td key={`empty-${i}`} className="p-4 text-center text-gray-300">-</td>
                ))}
              </tr>
              <tr>
                <td className="p-4 text-sm text-muted-foreground">操作</td>
                {compareData.map(company => (
                  <td key={company.id} className="p-4 text-center">
                    <Link href={`/companies/${company.id}`}>
                      <Button size="sm" variant="outline">
                        查看详情
                      </Button>
                    </Link>
                  </td>
                ))}
                {Array.from({ length: 3 - compareData.length }).map((_, i) => (
                  <td key={`empty-${i}`} className="p-4 text-center text-gray-300">-</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Pro CTA */}
      <Card className="mt-8 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
        <CardContent className="py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-semibold text-amber-900">升级 Pro 查看详细对比</p>
              <p className="text-sm text-amber-700">完整组织架构图、人员规模对比、部门设置分析等</p>
            </div>
          </div>
          <Link href="/me/activate">
            <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
              立即升级
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
