"use client"

import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { Building2, User, LogOut, Zap, LayoutDashboard } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Navbar() {
  const { data: session } = useSession()

  return (
    <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <Building2 className="w-6 h-6 text-primary" />
          <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            OrgQuery
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <Link href="/compare">
            <Button variant="ghost" size="sm">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              对比
            </Button>
          </Link>

          {session ? (
            <>
              <Link href="/me">
                <Button variant="ghost" size="sm">
                  <User className="w-4 h-4 mr-2" />
                  个人中心
                  {(session.user as any)?.isPremium && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-full">
                      Pro
                    </span>
                  )}
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
              >
                <LogOut className="w-4 h-4 mr-2" />
                退出
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">登录</Button>
              </Link>
              <Link href="/register">
                <Button size="sm">
                  <Zap className="w-4 h-4 mr-2" />
                  免费注册
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
