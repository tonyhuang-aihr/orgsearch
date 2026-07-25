"use client"

import { useState, useEffect } from "react"
import { Search, Building2, Zap, Shield, BarChart3, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CompanyCard } from "@/components/company-card"

interface Company {
  id: string
  name: string
  industry: string
  totalLayers: number
  description: string
  dataStatus?: string
  totalNodes?: number
  updatedAt?: string
}

export default function Home() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [industry, setIndustry] = useState("all")
  const [loading, setLoading] = useState(true)

  const industries = ["all", "AI大模型", "互联网大厂", "AI基础设施", "AI应用"]

  useEffect(() => {
    fetchCompanies()
  }, [])

  useEffect(() => {
    let filtered = companies

    if (searchQuery) {
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (industry !== "all") {
      filtered = filtered.filter(c => c.industry === industry)
    }

    setFilteredCompanies(filtered)
  }, [searchQuery, industry, companies])

  async function fetchCompanies() {
    try {
      const res = await fetch("/api/companies")
      const data = await res.json()
      setCompanies(data.companies)
      setFilteredCompanies(data.companies)
    } catch (error) {
      console.error("Failed to fetch companies:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-50 via-white to-purple-50 py-20">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM3YzNhZWQiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTh2MkgyNHYtMmgxMnptLTgtNHYyaC00di0yaDR6bTAgMTZ2MmgtNHYtMmg0eiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 text-primary-700 text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              行业领先的组织架构查询平台
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-gray-900 via-primary to-purple-600 bg-clip-text text-transparent">
              探索组织架构
              <br />
              对标行业标杆
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              收录头部科技公司组织架构数据，帮助HR和管理者快速了解行业最佳实践
            </p>

            {/* Search Box */}
            <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="搜索公司名称..."
                  className="pl-10 h-12 text-base"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger className="w-full sm:w-40 h-12">
                  <SelectValue placeholder="全部行业" />
                </SelectTrigger>
                <SelectContent>
                  {industries.map(ind => (
                    <SelectItem key={ind} value={ind}>
                      {ind === "all" ? "全部行业" : ind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center p-6">
              <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">海量数据</h3>
              <p className="text-muted-foreground text-sm">
                覆盖互联网、AI、消费电子等多个行业的头部企业组织架构数据
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">可视化展示</h3>
              <p className="text-muted-foreground text-sm">
                树形结构清晰展示组织层级，支持缩放拖拽，一目了然
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">数据更新</h3>
              <p className="text-muted-foreground text-sm">
                持续更新维护，确保数据时效性和准确性
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Company List */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">热门公司</h2>
            <span className="text-sm text-muted-foreground">
              共 {filteredCompanies.length} 家公司
            </span>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-48 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>暂无匹配的公司</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCompanies.map(company => (
                <CompanyCard key={company.id} {...company} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-primary to-purple-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">解锁完整组织架构数据</h2>
          <p className="text-primary-100 mb-8 max-w-xl mx-auto">
            升级 Pro 会员，查看所有公司完整组织架构，支持下载 PNG/PDF
          </p>
          <Button
            size="lg"
            className="bg-white text-primary hover:bg-gray-100"
            onClick={() => window.location.href = "/register"}
          >
            立即加入
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>
    </div>
  )
}
