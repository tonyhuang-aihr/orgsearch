"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Key, Crown, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ActivatePage() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess(false)
    setLoading(true)

    try {
      const res = await fetch("/api/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.toUpperCase() }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "激活失败")
      }

      setSuccess(true)
      // 更新 session
      await update()
      // 刷新页面
      setTimeout(() => {
        router.push("/me")
        router.refresh()
      }, 1500)
    } catch (err: any) {
      setError(err.message || "激活失败")
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading") {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    )
  }

  const isPremium = (session?.user as any)?.isPremium || false

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <Link href="/me" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" />
        返回个人中心
      </Link>

      <Card className="animate-fade-in">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Crown className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">激活 Pro 会员</CardTitle>
          <CardDescription>输入您的激活码，解锁全部功能</CardDescription>
        </CardHeader>
        <form onSubmit={handleActivate}>
          <CardContent className="space-y-4">
            {isPremium && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>您已经是 Pro 会员啦！</span>
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>激活成功！正在跳转...</span>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="code">激活码</Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="code"
                  placeholder="例如: ORG-DEMO-001"
                  className="pl-10 uppercase tracking-wider font-mono"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  required
                />
              </div>
            </div>

            <div className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-lg">
              <p className="font-medium mb-1">测试激活码：</p>
              <p className="font-mono">ORG-DEMO-001 ~ ORG-DEMO-010</p>
            </div>
          </CardContent>
          <div className="px-6 pb-6">
            <Button type="submit" className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600" disabled={loading || isPremium}>
              {loading ? "激活中..." : "立即激活"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
