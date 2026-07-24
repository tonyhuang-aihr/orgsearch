// OrgSearch 数据导入脚本 (evaluation_only 版)
// 将 The Org 24 家公司数据导入 Vercel Postgres
// 双视图：汇报线(viewType=reporting) + 职能分类(viewType=department)
// 运行方式：DATABASE_URL=xxx npx tsx scripts/import-theorg-data.ts

import { PrismaClient } from '@prisma/client'
import * as XLSX from 'xlsx'

const prisma = new PrismaClient()

// 公司中文名映射
const cnNames: Record<string, string> = {
  "ByteDance": "字节跳动", "Alibaba": "阿里巴巴", "Tencent": "腾讯",
  "Huawei": "华为", "Xiaohongshu": "小红书", "Meituan": "美团",
  "Zhipu AI": "智谱AI", "Kimi / Moonshot AI": "月之暗面",
  "OpenAI": "OpenAI", "Anthropic": "Anthropic",
  "Google DeepMind": "Google DeepMind", "xAI": "xAI",
  "Mistral AI": "Mistral AI", "NVIDIA": "NVIDIA",
  "Scale AI": "Scale AI", "Hugging Face": "Hugging Face",
  "MiniMax": "MiniMax", "DeepSeek": "DeepSeek",
  "StepFun": "阶跃星辰", "Cursor / Anysphere": "Cursor",
  "Perplexity": "Perplexity", "Cognition": "Cognition",
  "Figure AI": "Figure AI", "Tesla AI": "Tesla AI",
}

// 行业分类映射
const industryMap: Record<string, string> = {
  "Frontier AI": "AI大模型",
  "AI Infrastructure": "AI基础设施",
  "China Tech / AI": "互联网大厂",
  "China AI Startup": "AI大模型",
  "AI Application": "AI应用",
}

// 职能分类中文化
const functionCnMap: Record<string, string> = {
  "Executive Leadership": "高管团队",
  "Engineering": "工程技术",
  "Product": "产品",
  "Design": "设计",
  "Data & Analytics": "数据与分析",
  "Sales": "销售",
  "Marketing": "市场营销",
  "Operations": "运营",
  "Human Resources": "人力资源",
  "Finance": "财务",
  "Legal": "法务",
  "Customer Success & Support": "客户成功与支持",
  "Research": "研究",
  "Strategy & Business Development": "战略与发展",
  "IT & Security": "IT与安全",
  "Other / Unclassified": "其他",
  "Founder": "创始人",
}

function cnFunc(name: string): string {
  return functionCnMap[name] || name
}

async function main() {
  console.log('=== OrgSearch 数据导入 (evaluation_only) ===')
  console.log()

  const excelPath = process.env.EXCEL_PATH || 'Organization_Radar_TheOrg_24_Companies.xlsx'
  const workbook = XLSX.readFile(excelPath)

  // 读取公司数据
  const companySheet = workbook.Sheets['公司覆盖']
  const companyData = XLSX.utils.sheet_to_json(companySheet) as any[]

  // 公司ID映射
  const companyIdMap = new Map<string, string>() // 公司名称 -> 公司ID
  for (const row of companyData) {
    companyIdMap.set(row['公司名称'], row['公司ID'])
  }

  // ============================================
  // 1. 导入公司数据
  // ============================================
  console.log('1. 导入公司数据...')
  for (const row of companyData) {
    const r = row as any
    const cnName = cnNames[r['公司名称']] || r['公司名称']
    const industry = industryMap[r['类别']] || '其他'
    const totalLayers = Math.min(parseInt(r['层级深度']) || 4, 4) // L0-L3

    try {
      await prisma.company.upsert({
        where: { id: r['公司ID'] },
        create: {
          id: r['公司ID'],
          name: cnName,
          industry,
          totalLayers,
          description: `${cnName}组织架构数据（评估版·内部使用）`,
          feishuTableId: r['来源URL'] || '',
        },
        update: {
          name: cnName,
          industry,
          totalLayers,
          description: `${cnName}组织架构数据（评估版·内部使用）`,
          feishuTableId: r['来源URL'] || '',
        },
      })
      process.stdout.write(`  ✓ ${cnName}\n`)
    } catch (err: any) {
      console.log(`  ✗ ${cnName}: ${err.message}`)
    }
  }

  // ============================================
  // 2. 导入汇报线节点 (viewType=reporting)
  // ============================================
  console.log('\n2. 导入汇报线节点...')
  const peopleSheet = workbook.Sheets['人员']
  const peopleData = XLSX.utils.sheet_to_json(peopleSheet) as any[]

  // 只导入 L0-L3
  const filteredPeople = peopleData.filter(r => r['层级深度'] <= 3)
  console.log(`   总人数: ${peopleData.length}, L0-L3: ${filteredPeople.length}`)

  // 计算每个节点的直接下属数
  const subCountMap = new Map<string, number>()
  for (const row of filteredPeople) {
    const managerId = row['上级节点ID']
    if (managerId) {
      const key = `${row['公司ID']}:${managerId}`
      subCountMap.set(key, (subCountMap.get(key) || 0) + 1)
    }
  }

  // 构建 path: 从根节点出发，逐层构建
  // 先用 Map 存所有节点信息
  const nodeMap = new Map<string, { parentId: string | null; level: number }>()
  for (const row of filteredPeople) {
    const nodeId = `${row['公司ID']}:${row['职位节点ID']}`
    const parentId = row['上级节点ID'] ? `${row['公司ID']}:${row['上级节点ID']}` : null
    nodeMap.set(nodeId, { parentId, level: row['层级深度'] })
  }

  // 递归计算 path (带 memo)
  const pathCache = new Map<string, string>()
  function getPath(nodeId: string): string {
    if (pathCache.has(nodeId)) return pathCache.get(nodeId)!
    const node = nodeMap.get(nodeId)
    if (!node || !node.parentId) {
      const p = String(node?.level || 0)
      pathCache.set(nodeId, p)
      return p
    }
    const parentPath = getPath(node.parentId)
    const p = `${parentPath}.${node.level}`
    pathCache.set(nodeId, p)
    return p
  }

  let reportingCount = 0
  const batchSize = 200

  for (const [companyName, companyId] of companyIdMap) {
    const cnName = cnNames[companyName] || companyName
    const companyPeople = filteredPeople.filter(r => r['公司名称'] === companyName)
    if (companyPeople.length === 0) continue

    console.log(`   ${cnName}: ${companyPeople.length} 人`)

    for (let i = 0; i < companyPeople.length; i += batchSize) {
      const batch = companyPeople.slice(i, i + batchSize)
      const promises = batch.map(row => {
        const nodeId = `${row['公司ID']}:${row['职位节点ID']}`
        const parentId = row['上级节点ID'] ? `${row['公司ID']}:${row['上级节点ID']}` : null
        const path = getPath(nodeId)

        return prisma.orgNode.upsert({
          where: { id: nodeId },
          create: {
            id: nodeId,
            companyId,
            name: row['姓名'],
            title: row['当前职位'],
            level: row['层级深度'],
            parentId,
            headcount: subCountMap.get(nodeId) || 0,
            nodeType: 'position',
            viewType: 'reporting',
            avatarUrl: null,
            path,
          },
          update: {
            name: row['姓名'],
            title: row['当前职位'],
            level: row['层级深度'],
            parentId,
            headcount: subCountMap.get(nodeId) || 0,
            viewType: 'reporting',
            path,
          },
        })
      })

      try {
        await Promise.all(promises)
        reportingCount += batch.length
      } catch (err: any) {
        console.log(`     批次失败: ${err.message}`)
        // fallback: 逐条插入
        for (const row of batch) {
          try {
            const nodeId = `${row['公司ID']}:${row['职位节点ID']}`
            const parentId = row['上级节点ID'] ? `${row['公司ID']}:${row['上级节点ID']}` : null
            const path = getPath(nodeId)
            await prisma.orgNode.upsert({
              where: { id: nodeId },
              create: {
                id: nodeId,
                companyId,
                name: row['姓名'],
                title: row['当前职位'],
                level: row['层级深度'],
                parentId,
                headcount: subCountMap.get(nodeId) || 0,
                nodeType: 'position',
                viewType: 'reporting',
                avatarUrl: null,
                path,
              },
              update: {
                name: row['姓名'],
                title: row['当前职位'],
                level: row['层级深度'],
                parentId,
                headcount: subCountMap.get(nodeId) || 0,
                viewType: 'reporting',
                path,
              },
            })
            reportingCount++
          } catch (e: any) {
            // skip duplicates/errors
          }
        }
      }
    }
  }
  console.log(`   ✓ 汇报线节点: ${reportingCount} 条`)

  // ============================================
  // 3. 导入职能分类视图 (viewType=department)
  // ============================================
  console.log('\n3. 导入职能分类视图数据...')
  const deptSheet = workbook.Sheets['推断部门']
  const deptData = XLSX.utils.sheet_to_json(deptSheet) as any[]

  let deptCount = 0

  for (const [companyName, companyId] of companyIdMap) {
    const cnName = cnNames[companyName] || companyName
    const companyDepts = deptData.filter(r => r['公司名称'] === companyName)
    if (companyDepts.length === 0) continue

    // 创建虚拟根节点
    const rootId = `${companyId}:root-dept`
    try {
      await prisma.orgNode.upsert({
        where: { id: rootId },
        create: {
          id: rootId,
          companyId,
          name: cnName,
          title: '职能分类概览',
          level: 0,
          parentId: null,
          headcount: companyDepts.reduce((sum, d) => sum + (parseInt(d['人员数']) || 0), 0),
          nodeType: 'department',
          viewType: 'department',
          avatarUrl: null,
          path: '0',
        },
        update: {
          headcount: companyDepts.reduce((sum, d) => sum + (parseInt(d['人员数']) || 0), 0),
          viewType: 'department',
        },
      })
    } catch (e: any) {
      console.log(`   根节点创建失败 ${cnName}: ${e.message}`)
      continue
    }

    // 创建各个职能部门 (level 1)
    for (const dept of companyDepts) {
      const deptName = cnFunc(dept['部门/职能名称'])
      const deptSlug = dept['部门/职能名称'].replace(/\s+/g, '-').toLowerCase()
      const deptId = `${companyId}:dept:${deptSlug}`

      try {
        await prisma.orgNode.upsert({
          where: { id: deptId },
          create: {
            id: deptId,
            companyId,
            name: deptName,
            title: dept['表观负责人职位'] || null,
            level: 1,
            parentId: rootId,
            headcount: parseInt(dept['人员数']) || 0,
            nodeType: 'department',
            viewType: 'department',
            avatarUrl: null,
            path: `0.1`,
          },
          update: {
            name: deptName,
            title: dept['表观负责人职位'] || null,
            headcount: parseInt(dept['人员数']) || 0,
            viewType: 'department',
          },
        })
        deptCount++
      } catch (e: any) {
        // skip
      }
    }

    console.log(`   ✓ ${cnName}: ${companyDepts.length} 个职能分类`)
  }

  console.log(`   ✓ 职能分类节点: ${deptCount + companyIdMap.size} 条 (含根节点)`)

  // ============================================
  // 4. 验证 & 统计
  // ============================================
  console.log('\n4. 数据验证...')
  const totalCompanies = await prisma.company.count()
  const totalReporting = await prisma.orgNode.count({ where: { viewType: 'reporting' } })
  const totalDept = await prisma.orgNode.count({ where: { viewType: 'department' } })

  console.log(`   公司总数: ${totalCompanies}`)
  console.log(`   汇报线节点: ${totalReporting}`)
  console.log(`   职能分类节点: ${totalDept}`)

  console.log('\n=== 导入完成 ===')
  console.log('⚠️  此数据为 evaluation_only 内部评估版，不得外部分发')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
