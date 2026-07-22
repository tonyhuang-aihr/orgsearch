import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      )
    }

    const userId = (session.user as any).id

    const logs = await prisma.queryLog.findMany({
      where: { userId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            industry: true,
          },
        },
      },
      orderBy: { queriedAt: "desc" },
      take: 20,
    })

    return NextResponse.json({
      logs,
    })
  } catch (error) {
    console.error("Get query logs error:", error)
    return NextResponse.json(
      { error: "获取查询记录失败" },
      { status: 500 }
    )
  }
}
