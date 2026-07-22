/**
 * 飞书多维表格数据同步脚本
 * 从飞书多维表格读取公司和组织节点数据，同步到本地数据库
 *
 * 使用方法:
 *   npx tsx scripts/sync-feishu.ts
 *
 * 环境变量:
 *   FEISHU_APP_ID - 飞书应用 App ID
 *   FEISHU_APP_SECRET - 飞书应用 App Secret
 *   FEISHU_BASE_TOKEN - 多维表格 Base Token
 *   FEISHU_COMPANY_TABLE - 公司表名称或 ID (默认: 公司表)
 *   FEISHU_NODE_TABLE - 组织节点表名称或 ID (默认: 组织节点表)
 */

import { PrismaClient, Company, OrgNode } from '@prisma/client'

const prisma = new PrismaClient()

// 飞书多维表格 API 封装
class FeishuBitable {
  private appId: string
  private appSecret: string
  private baseToken: string
  private tenantAccessToken: string = ''
  private tokenExpireTime: number = 0

  constructor(appId: string, appSecret: string, baseToken: string) {
    this.appId = appId
    this.appSecret = appSecret
    this.baseToken = baseToken
  }

  // 获取 tenant_access_token
  async getTenantAccessToken(): Promise<string> {
    const now = Date.now()
    if (this.tenantAccessToken && now < this.tokenExpireTime - 60000) {
      return this.tenantAccessToken
    }

    const response = await fetch(
      'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_id: this.appId,
          app_secret: this.appSecret,
        }),
      }
    )

    const data = await response.json()
    if (data.code !== 0) {
      throw new Error(`获取飞书 token 失败: ${data.msg}`)
    }

    this.tenantAccessToken = data.tenant_access_token
    this.tokenExpireTime = now + data.expire * 1000
    return this.tenantAccessToken
  }

  // 读取表格记录
  async listRecords(tableId: string): Promise<any[]> {
    const token = await this.getTenantAccessToken()
    const allRecords: any[] = []
    let pageToken = ''

    do {
      const url = new URL(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${this.baseToken}/tables/${tableId}/records`
      )
      url.searchParams.set('page_size', '100')
      if (pageToken) {
        url.searchParams.set('page_token', pageToken)
      }

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.code !== 0) {
        throw new Error(`读取飞书表格失败: ${data.msg}`)
      }

      allRecords.push(...(data.data.items || []))
      pageToken = data.data.page_token || ''

      if (!data.data.has_more) break
    } while (pageToken)

    return allRecords
  }
}

// 提取字段值
function getFieldValue(fields: Record<string, any>, fieldName: string): any {
  const value = fields[fieldName]
  if (value === null || value === undefined) return null

  // 单选字段返回数组形式，取第一个
  if (Array.isArray(value)) {
    if (value.length === 0) return null
    // 单选/多选可能是对象数组 {text: "..."} 或 字符串数组
    if (typeof value[0] === 'object' && value[0].text !== undefined) {
      return value[0].text
    }
    return value[0]
  }

  return value
}

// 同步公司数据
async function syncCompanies(bitable: FeishuBitable, companyTable: string) {
  console.log('📦 正在同步公司数据...')

  const records = await bitable.listRecords(companyTable)
  console.log(`  找到 ${records.length} 家公司`)

  let created = 0
  let updated = 0

  for (const record of records) {
    const fields = record.fields
    const name = getFieldValue(fields, '公司名称')
    if (!name) continue

    const industry = getFieldValue(fields, '行业分类') || '其他'
    const description = getFieldValue(fields, '公司简介') || ''

    // 先看看有多少个节点，用来算 totalLayers
    // 这里先默认 5 层，同步节点后再更新
    const existing = await prisma.company.findFirst({
      where: { name },
    })

    if (existing) {
      await prisma.company.update({
        where: { id: existing.id },
        data: {
          industry,
          description,
          feishuTableId: record.record_id,
          updatedAt: new Date(),
        },
      })
      updated++
    } else {
      await prisma.company.create({
        data: {
          name,
          industry,
          totalLayers: 5, // 占位，同步节点后更新
          description,
          feishuTableId: record.record_id,
        },
      })
      created++
    }
  }

  console.log(`  新增: ${created}, 更新: ${updated}`)
}

// 同步组织节点数据
async function syncOrgNodes(bitable: FeishuBitable, nodeTable: string) {
  console.log('🌳 正在同步组织节点数据...')

  const records = await bitable.listRecords(nodeTable)
  console.log(`  找到 ${records.length} 个节点`)

  // 第一步：创建所有节点（先不设 parentId，因为可能还没创建）
  const nodeMap = new Map<string, string>() // name -> companyId + nodeId 映射

  // 按公司分组
  const companies = await prisma.company.findMany()
  const companyIdMap = new Map(companies.map(c => [c.name, c.id]))

  let created = 0
  let updated = 0

  // 第一轮：创建节点基本信息
  for (const record of records) {
    const fields = record.fields
    const name = getFieldValue(fields, '节点名称')
    const companyName = getFieldValue(fields, '所属公司')
    const level = getFieldValue(fields, '层级') || 1

    if (!name || !companyName) continue

    const companyId = companyIdMap.get(companyName)
    if (!companyId) continue

    const nodeType = getFieldValue(fields, '部门类型') || 'department'
    const headcount = getFieldValue(fields, '人头数') || 0
    const description = getFieldValue(fields, '描述') || ''
    const title = getFieldValue(fields, '负责人') || undefined

    const existing = await prisma.orgNode.findFirst({
      where: { companyId, name },
    })

    const nodeKey = `${companyId}:${name}`

    if (existing) {
      await prisma.orgNode.update({
        where: { id: existing.id },
        data: {
          level: Number(level),
          headcount: Number(headcount),
          nodeType: String(nodeType).toLowerCase(),
          title,
        },
      })
      nodeMap.set(nodeKey, existing.id)
      updated++
    } else {
      const node = await prisma.orgNode.create({
        data: {
          companyId,
          name,
          title,
          level: Number(level),
          headcount: Number(headcount),
          nodeType: String(nodeType).toLowerCase(),
        },
      })
      nodeMap.set(nodeKey, node.id)
      created++
    }
  }

  console.log(`  第一轮: 新增 ${created}, 更新 ${updated}`)

  // 第二轮：设置父子关系
  console.log('  正在构建父子关系...')
  let linked = 0

  for (const record of records) {
    const fields = record.fields
    const name = getFieldValue(fields, '节点名称')
    const companyName = getFieldValue(fields, '所属公司')
    const parentName = getFieldValue(fields, '父节点名称')

    if (!name || !companyName || !parentName) continue

    const companyId = companyIdMap.get(companyName)
    if (!companyId) continue

    const nodeKey = `${companyId}:${name}`
    const parentKey = `${companyId}:${parentName}`

    const nodeId = nodeMap.get(nodeKey)
    const parentId = nodeMap.get(parentKey)

    if (nodeId && parentId && nodeId !== parentId) {
      await prisma.orgNode.update({
        where: { id: nodeId },
        data: { parentId },
      })
      linked++
    }
  }

  console.log(`  第二轮: 建立 ${linked} 个父子关系`)

  // 更新每家公司的 totalLayers
  console.log('  正在计算各公司总层级数...')
  for (const [companyName, companyId] of companyIdMap) {
    const maxLevelNode = await prisma.orgNode.findFirst({
      where: { companyId },
      orderBy: { level: 'desc' },
      select: { level: true },
    })

    if (maxLevelNode) {
      await prisma.company.update({
        where: { id: companyId },
        data: { totalLayers: maxLevelNode.level },
      })
      console.log(`    ${companyName}: ${maxLevelNode.level} 层`)
    }
  }
}

async function main() {
  const appId = process.env.FEISHU_APP_ID
  const appSecret = process.env.FEISHU_APP_SECRET
  const baseToken = process.env.FEISHU_BASE_TOKEN

  if (!appId || !appSecret || !baseToken) {
    console.error('❌ 缺少飞书配置，请设置 FEISHU_APP_ID, FEISHU_APP_SECRET, FEISHU_BASE_TOKEN 环境变量')
    process.exit(1)
  }

  const companyTable = process.env.FEISHU_COMPANY_TABLE || '公司表'
  const nodeTable = process.env.FEISHU_NODE_TABLE || '组织节点表'

  const bitable = new FeishuBitable(appId, appSecret, baseToken)

  console.log('🚀 开始飞书数据同步')
  console.log(`  Base Token: ${baseToken}`)
  console.log(`  公司表: ${companyTable}`)
  console.log(`  节点表: ${nodeTable}`)
  console.log('')

  try {
    await syncCompanies(bitable, companyTable)
    console.log('')
    await syncOrgNodes(bitable, nodeTable)
    console.log('')
    console.log('✅ 同步完成！')
  } catch (error) {
    console.error('❌ 同步失败:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
