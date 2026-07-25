import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const industry = searchParams.get("industry")
    const search = searchParams.get("search")

    const where: any = {}

    if (industry && industry !== "all") {
      where.industry = industry
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ]
    }

    const skip = (page - 1) * limit

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: { orgNodes: true },
          },
        },
      }),
      prisma.company.count({ where }),
    ])

    // 格式化返回数据
    const formattedCompanies = companies.map(company => ({
      id: company.id,
      name: company.name,
      industry: company.industry,
      totalLayers: company.totalLayers,
      description: company.description,
      updatedAt: company.updatedAt,
      dataStatus: company.dataStatus,
      skeletonCoverage: company.skeletonCoverage,
      lastVerifiedAt: company.lastVerifiedAt,
      dataQualityScore: company.dataQualityScore,
      totalNodes: company._count.orgNodes,
    }))

    return NextResponse.json({
      companies: formattedCompanies,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error("Get companies error:", error)
    return NextResponse.json(
      { error: "获取公司列表失败" },
      { status: 500 }
    )
  }
}
