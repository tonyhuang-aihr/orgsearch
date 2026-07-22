import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      )
    }

    const { code } = await request.json()

    if (!code) {
      return NextResponse.json(
        { error: "请输入激活码" },
        { status: 400 }
      )
    }

    // 查找激活码
    const activationCode = await prisma.activationCode.findUnique({
      where: { code: code.toUpperCase() },
    })

    if (!activationCode) {
      return NextResponse.json(
        { error: "激活码无效" },
        { status: 400 }
      )
    }

    if (activationCode.isUsed) {
      return NextResponse.json(
        { error: "该激活码已被使用" },
        { status: 400 }
      )
    }

    const userId = (session.user as any).id

    // 更新用户为会员
    await prisma.user.update({
      where: { id: userId },
      data: {
        isPremium: true,
        activationCode: code.toUpperCase(),
        activatedAt: new Date(),
      },
    })

    // 标记激活码已使用
    await prisma.activationCode.update({
      where: { code: code.toUpperCase() },
      data: {
        isUsed: true,
        usedBy: userId,
        usedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: "激活成功",
    })
  } catch (error) {
    console.error("Activate error:", error)
    return NextResponse.json(
      { error: "激活失败，请重试" },
      { status: 500 }
    )
  }
}
