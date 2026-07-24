-- OrgSearch v2 Migration: 汇报线视图 + 职能分类视图
-- evaluation_only 内部评估版
-- 执行方式：在 Vercel Postgres 中执行以下 SQL

-- 1. 为 OrgNode 表添加 viewType 字段（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'OrgNode' AND column_name = 'viewType'
    ) THEN
        ALTER TABLE "OrgNode" ADD COLUMN "viewType" TEXT NOT NULL DEFAULT 'department';
    END IF;
END $$;

-- 2. 添加 avatarUrl 字段（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'OrgNode' AND column_name = 'avatarUrl'
    ) THEN
        ALTER TABLE "OrgNode" ADD COLUMN "avatarUrl" TEXT;
    END IF;
END $$;

-- 3. 添加 path 字段（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'OrgNode' AND column_name = 'path'
    ) THEN
        ALTER TABLE "OrgNode" ADD COLUMN "path" TEXT NOT NULL DEFAULT '';
    END IF;
END $$;

-- 4. 为 viewType 创建索引（加速查询）
CREATE INDEX IF NOT EXISTS "OrgNode_companyId_viewType_idx" ON "OrgNode"("companyId", "viewType");

-- 5. 更新 Company 表添加更多元数据字段
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Company' AND column_name = 'theOrgId'
    ) THEN
        ALTER TABLE "Company" ADD COLUMN "theOrgId" TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Company' AND column_name = 'coverageLevel'
    ) THEN
        ALTER TABLE "Company" ADD COLUMN "coverageLevel" TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Company' AND column_name = 'peopleCount'
    ) THEN
        ALTER TABLE "Company" ADD COLUMN "peopleCount" INTEGER DEFAULT 0;
    END IF;
END $$;

-- 验证
SELECT 'Migration completed successfully' as status;
