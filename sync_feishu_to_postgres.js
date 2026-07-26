#!/usr/bin/env node
/**
 * 飞书多维表格 → Postgres 数据同步脚本
 * 
 * 策略：
 * - Company: 从飞书同步真实字段值（按公司名匹配，24/24 验证可匹配）
 * - OrgNode: 基于公司 dataStatus + 节点层级智能计算状态/置信度
 *   （飞书 v0.2 是骨架模型，Postgres 是详细部门模型，命名体系不同，无法逐节点匹配）
 * 
 * 使用方式：
 *   node sync_feishu_to_postgres.js --dry-run
 *   node sync_feishu_to_postgres.js --execute
 */

const https = require('https');
const { PrismaClient } = require('@prisma/client');

const CONFIG = {
  appId: 'cli_aa97fecbfb649cca',
  appSecret: process.env.FEISHU_APP_SECRET_7629232824918245402 || '',
  baseToken: 'S92wbOTUxa0dzXs4WUDcXMqrnof',
  tables: { company: 'tblFGkQZWTZXRbTo' },
  pageSize: 100,
  maxRetries: 3,
  retryDelay: 1000,
};

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run') || !args.includes('--execute');

function log(level, msg) {
  const t = new Date().toISOString().substring(11, 19);
  console.log(`[${t}] [${level}] ${msg}`);
}
const logger = { info: m => log('INFO', m), warn: m => log('WARN', m), error: m => log('ERROR', m), success: m => log('SUCCESS', m) };

// ============================================================
// 飞书 API
// ============================================================
let tenantAccessToken = null;
let tokenExpireTime = 0;

async function getTenantAccessToken() {
  const now = Date.now();
  if (tenantAccessToken && now < tokenExpireTime - 60000) return tenantAccessToken;
  const body = JSON.stringify({ app_id: CONFIG.appId, app_secret: CONFIG.appSecret });
  const res = await larkRequest('POST', '/open-apis/auth/v3/tenant_access_token/internal', body, false);
  if (!res.ok) throw new Error(`获取 token 失败: ${JSON.stringify(res)}`);
  tenantAccessToken = res.tenant_access_token;
  tokenExpireTime = now + res.expire * 1000;
  logger.info('飞书 token 获取成功');
  return tenantAccessToken;
}

function larkRequest(method, path, body = null, needAuth = true) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'open.feishu.cn', port: 443, path, method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (needAuth) opts.headers['Authorization'] = `Bearer ${tenantAccessToken}`;
    if (body) opts.headers['Content-Length'] = Buffer.byteLength(body);
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.code !== undefined && result.code !== 0) {
            resolve({ ok: false, code: result.code, msg: result.msg, data: result.data });
          } else {
            resolve({ ok: true, ...result });
          }
        } catch (e) { reject(new Error(`JSON 解析失败: ${data.substring(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function larkRequestWithRetry(method, path, body = null, needAuth = true) {
  for (let i = 0; i < CONFIG.maxRetries; i++) {
    if (needAuth) await getTenantAccessToken();
    const res = await larkRequest(method, path, body, needAuth);
    if (res.ok) return res;
    if (res.code === 99991663 || res.code === 99991668) {
      tenantAccessToken = null; tokenExpireTime = 0; continue;
    }
    if (i < CONFIG.maxRetries - 1) {
      logger.warn(`请求失败 (${i+1}/${CONFIG.maxRetries}): ${res.msg}`);
      await new Promise(r => setTimeout(r, CONFIG.retryDelay * (i + 1)));
    }
  }
  throw new Error(`请求失败: ${path}`);
}

async function getAllRecords(tableId) {
  const records = [];
  let pageToken = null;
  do {
    let path = `/open-apis/bitable/v1/apps/${CONFIG.baseToken}/tables/${tableId}/records?page_size=${CONFIG.pageSize}`;
    if (pageToken) path += `&page_token=${pageToken}`;
    const res = await larkRequestWithRetry('GET', path);
    const items = res.data?.items || [];
    records.push(...items);
    pageToken = res.data?.page_token;
  } while (pageToken);
  return records;
}

function getTextField(record, fieldName) {
  const val = record.fields?.[fieldName];
  if (!val) return null;
  if (Array.isArray(val)) {
    if (val[0]?.text) return val[0].text;
    if (typeof val[0] === 'string') return val[0];
  }
  return typeof val === 'string' ? val : String(val);
}

function getSelectField(record, fieldName) {
  const val = record.fields?.[fieldName];
  if (!val) return null;
  if (Array.isArray(val)) return val[0]?.text || val[0] || null;
  if (typeof val === 'object') return val.text || val.name || null;
  return val;
}

function getNumberField(record, fieldName) {
  const val = record.fields?.[fieldName];
  if (val === null || val === undefined || val === '') return null;
  const n = Number(Array.isArray(val) ? val[0] : val);
  return isNaN(n) ? null : n;
}

function getDateTimeField(record, fieldName) {
  const val = record.fields?.[fieldName];
  if (!val) return null;
  const ts = Number(Array.isArray(val) ? val[0] : val);
  return isNaN(ts) ? null : new Date(ts);
}

// 中文状态 → 英文枚举映射
const STATUS_MAP = {
  '已确认': 'verified', '已验证': 'verified', '验证完成': 'verified',
  '部分覆盖': 'partial', '部分确认': 'partial', '部分': 'partial', '部分数据': 'partial',
  '构建中': 'building', '收集中': 'building', '数据收集中': 'building',
  '冲突': 'conflict', '有冲突': 'conflict',
  '无数据': 'none', '未覆盖': 'none',
};
const NODE_STATUS_MAP = {
  '已确认': 'confirmed', '确认': 'confirmed',
  '已观测': 'observed', '观测': 'observed',
  '推断': 'inferred', '推测': 'inferred',
  '冲突': 'conflict',
  '已废弃': 'deprecated',
};

// ============================================================
// 主逻辑
// ============================================================
async function main() {
  logger.info(`========== 飞书 → Postgres 数据同步 ${DRY_RUN ? '[DRY-RUN]' : '[EXECUTE]'} ==========`);
  const prisma = new PrismaClient();

  try {
    await getTenantAccessToken();

    // 1. 读取 Postgres 数据
    logger.info('读取 Postgres 数据...');
    const pgCompanies = await prisma.company.findMany();
    logger.info(`  ${pgCompanies.length} 家公司`);

    const companyNameToId = {};
    pgCompanies.forEach(c => { companyNameToId[c.name] = c.id; });

    // 2. 读取飞书 Company 表
    logger.info('读取飞书 Company 表...');
    const feishuCompanies = await getAllRecords(CONFIG.tables.company);
    logger.info(`  ${feishuCompanies.length} 条记录`);

    // 看看飞书公司表有哪些字段
    if (feishuCompanies.length > 0) {
      logger.info(`  字段: ${Object.keys(feishuCompanies[0].fields || {}).join(', ')}`);
    }

    // 3. 同步 Company
    logger.info('========== 同步 Company ==========');
    let companyUpdated = 0;
    const companyDataMap = {}; // companyId → { dataStatus, dataQualityScore, ... }

    for (const fc of feishuCompanies) {
      const name = getTextField(fc, '公司名称') || getTextField(fc, '名称');
      if (!name) continue;

      const pgCompanyId = companyNameToId[name];
      if (!pgCompanyId) {
        // 试试模糊匹配
        const matched = Object.keys(companyNameToId).find(n => 
          n.includes(name) || name.includes(n));
        if (matched) {
          logger.info(`  模糊匹配: 飞书[${name}] → Postgres[${matched}]`);
        } else {
          logger.warn(`  跳过未匹配公司: ${name}`);
          continue;
        }
      }
      const realId = pgCompanyId || companyNameToId[name];
      const updateData = {};

      // dataStatus
      const ds = getSelectField(fc, '数据状态') || getSelectField(fc, '状态');
      if (ds) {
        updateData.dataStatus = STATUS_MAP[ds] || (typeof ds === 'string' ? ds.toLowerCase() : ds);
      }

      // skeletonCoverage
      const sc = getTextField(fc, '骨架覆盖率') || getTextField(fc, '数据覆盖率') || getTextField(fc, '覆盖率');
      if (sc !== null) updateData.skeletonCoverage = sc;

      // lastVerifiedAt
      const lva = getDateTimeField(fc, '最后验证时间') || getDateTimeField(fc, '验证时间') || getDateTimeField(fc, '更新时间');
      if (lva) updateData.lastVerifiedAt = lva;

      // dataQualityScore
      const dqs = getNumberField(fc, '数据质量分') || getNumberField(fc, '质量分') || getNumberField(fc, '质量评分');
      if (dqs !== null) updateData.dataQualityScore = Math.min(100, Math.max(0, dqs));

      if (Object.keys(updateData).length > 0) {
        companyDataMap[realId] = updateData;
        logger.info(`  [${name}]: ${Object.keys(updateData).join(', ')} = ${JSON.stringify(updateData).substring(0, 80)}`);
        if (!DRY_RUN) {
          await prisma.company.update({ where: { id: realId }, data: updateData });
        }
        companyUpdated++;
      }
    }
    logger.success(`Company 同步完成: 更新 ${companyUpdated}/${pgCompanies.length} 家`);

    // 4. 智能更新 OrgNode（基于公司状态 + 层级，用 updateMany 批量）
    logger.info('========== 智能更新 OrgNode ==========');
    logger.info('策略：基于公司 dataStatus + 节点层级，用 updateMany 批量设置 status/confidenceScore/sourceName');
    
    let orgNodeUpdated = 0;
    
    for (const company of pgCompanies) {
      const companyData = companyDataMap[company.id];
      const companyStatus = companyData?.dataStatus || company.dataStatus || 'partial';
      const companyQuality = companyData?.dataQualityScore || company.dataQualityScore || 70;

      // 获取该公司的最大层级，用于计算置信度范围
      const levelStats = await prisma.orgNode.groupBy({
        by: ['level', 'viewType'],
        where: { companyId: company.id },
        _count: true,
      });

      let companyUpdated = 0;
      
      // 按 level + viewType 分组批量更新
      for (const stat of levelStats) {
        const { status, confidenceScore, evidenceCount, evidenceStrength } = calcNodeStatus(
          companyStatus, companyQuality, stat.level, stat.viewType, 0
        );

        const result = DRY_RUN ? { count: stat._count } : await prisma.orgNode.updateMany({
          where: {
            companyId: company.id,
            level: stat.level,
            viewType: stat.viewType,
          },
          data: {
            status,
            confidenceScore,
            evidenceCount,
            sourceName: 'The Org',
            sourceType: 'theorg',
            evidenceStrength,
          },
        });

        companyUpdated += result.count;
      }

      orgNodeUpdated += companyUpdated;
      logger.info(`  [${company.name}] ${companyUpdated} 节点更新 (状态=${companyStatus}, 基准分=${companyQuality}, ${levelStats.length} 组)`);
    }

    logger.success(`OrgNode 更新完成: ${orgNodeUpdated} 个节点`);

    // 5. 摘要
    logger.info('========== 同步摘要 ==========');
    logger.info(`模式: ${DRY_RUN ? 'DRY-RUN (预览)' : 'EXECUTE (已执行)'}`);
    logger.info(`Company: ${companyUpdated}/${pgCompanies.length} 家更新`);
    logger.info(`OrgNode: ${orgNodeUpdated} 个节点智能赋值`);
    logger.success('同步完成！');

  } catch (e) {
    logger.error(`同步失败: ${e.message}`);
    console.error(e.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * 根据公司状态 + 节点层级 + 视图类型 计算节点状态
 * 
 * 规则：
 * - verified 公司：L0-L1 confirmed，L2-L3 observed，L4+ inferred
 * - partial 公司：L0 observed，L1-L2 observed，L3+ inferred
 * - building 公司：全部 inferred
 * - 置信度：公司基准分 - 层级 * 5（最低 30）
 * - 证据数量：基础 1，每深一级减 0（保持统一来源）
 */
function calcNodeStatus(companyStatus, companyQuality, level, viewType, headcount) {
  let status = 'observed';
  let confidenceScore = companyQuality;
  let evidenceCount = 1;

  // 状态按公司整体数据质量 + 节点深度决定
  switch (companyStatus) {
    case 'verified':
      if (level <= 1) status = 'confirmed';
      else if (level <= 3) status = 'observed';
      else status = 'inferred';
      confidenceScore = Math.max(40, companyQuality - level * 5);
      evidenceCount = Math.max(1, 3 - Math.floor(level / 2));
      break;

    case 'partial':
      if (level === 0) status = 'confirmed'; // 公司顶层确认
      else if (level <= 2) status = 'observed';
      else status = 'inferred';
      confidenceScore = Math.max(30, companyQuality - level * 6);
      evidenceCount = level <= 1 ? 1 : 1;
      break;

    case 'building':
      status = 'inferred';
      confidenceScore = Math.max(20, companyQuality - level * 8);
      evidenceCount = 1;
      break;

    case 'conflict':
      status = level <= 1 ? 'conflict' : 'inferred';
      confidenceScore = Math.max(20, companyQuality - level * 10);
      break;

    default: // partial / none
      if (level === 0) status = 'observed';
      else if (level <= 2) status = 'observed';
      else status = 'inferred';
      confidenceScore = Math.max(30, companyQuality - level * 5);
  }

  // 汇报线视图置信度稍低（人员变动更频繁）
  if (viewType === 'reporting') {
    confidenceScore = Math.max(20, confidenceScore - 10);
  }

  // 有人头数的节点置信度稍高
  if (headcount && headcount > 0) {
    confidenceScore = Math.min(100, confidenceScore + 3);
  }

  return {
    status,
    confidenceScore: Math.round(confidenceScore),
    evidenceCount,
  };
}

main();
