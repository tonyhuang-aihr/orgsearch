import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t bg-gray-50 mt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-muted-foreground">
            © 2024 OrgQuery. 组织架构查询平台
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-primary transition-colors">首页</Link>
            <Link href="/compare" className="hover:text-primary transition-colors">对比</Link>
            <span>联系我们: contact@orgquery.com</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
