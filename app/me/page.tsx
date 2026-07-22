"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { User, Crown, Clock, Building2, ChevronRight, Settings, Key } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface QueryLog {
  id: string
  queriedAt: string
  company: {
    id: string
    name: string
    industry: string
  }
}

export default function MePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [queryLogs, setQueryLogs] = useState<QueryLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    if (session) {
      fetchQueryLogs()
    }
  }, [session, status, router])

  async function fetchQueryLogs() {
    try {
      const res = await fetch("/api/query-logs")
      const data = await res.json()
      setQueryLogs(data.logs || [])
    } catch (error) {
      console.error("Failed to fetch query logs:", error)
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading") {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-24 bg-gray-100 rounded-xl mb-6" />
          <div className="h-64 bg-gray-100 rounded-xl" />
        </div>
      </div>
    )
  }

  const isPremium = (session?.user as any)?.isPremium || false

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Profile Card */}
      <Card className="mb-8 overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary to-purple-500" />
        <CardContent className="-mt-12 relative">
          <div className="flex items-end gap-4 mb-4">
            <div className="w-24 h-24 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center">
              <User className="w-12 h-12 text-primary" />
            </div>
            <div className="mb-2">
              <h1 className="text-2xl font-bold">{session?.user?.email}</h1>
              <div className="flex items-center gap-2 mt-1">
                {isPremium ? (
                  <Badge className="bg-gradient-to-r from-amber-400 to-orange-500">
                    <Crown className="w-3 h-3 mr-1" />
                    Pro 会员
                  </Badge>
                ) : (
                  <Badge variant="secondary">免费用户</Badge>
                )}
              </div>
            </div>
          </div>

          {!isPremium && (
            <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Crown className="w-8 h-8 text-amber-500" />
                <div>
                  <p className="font-medium text-amber-900">升级 Pro 会员</p>
                  <p className="text-sm text-amber-700">解锁全部公司完整组织架构，支持下载</p>
                </div>
              </div>
              <Link href="/me/activate">
                <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
                  使用激活码
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Query History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              查询记录
            </CardTitle>
            <CardDescription>您最近查看的公司组织架构</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : queryLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">暂无查询记录</p>
              </div>
            ) : (
              <div className="space-y-2">
                {queryLogs.map((log) => (
                  <Link
                    key={log.id}
                    href={`/companies/${log.company.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center text-primary font-bold">
                        {log.company.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{log.company.name}</p>
                        <p className="text-xs text-muted-foreground">{log.company.industry}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{new Date(log.queriedAt).toLocaleDateString('zh-CN')}</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              快捷操作
            </CardTitle>
            <CardDescription>账号相关设置</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/me/activate" className="block">
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Key className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">激活会员</p>
                    <p className="text-xs text-muted-foreground">使用激活码升级 Pro</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            <Link href="/" className="block">
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">浏览公司</p>
                    <p className="text-xs text-muted-foreground">查看所有可用公司数据</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
