"use client"

import { useParams } from "next/navigation"
import CompanyDetail from "@/components/company-detail"
import { useEffect, useState } from "react"

export default function CompanyPage() {
  const params = useParams()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !params.id) {
    return <div className="container mx-auto px-4 py-8">加载中...</div>
  }

  return <CompanyDetail companyId={params.id as string} />
}
