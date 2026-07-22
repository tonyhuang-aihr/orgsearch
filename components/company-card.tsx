"use client"

import Link from "next/link"
import { Building2, Users, Layers, ArrowRight } from "lucide-react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface CompanyCardProps {
  id: string
  name: string
  industry: string
  totalLayers: number
  description: string
  headcount?: number
}

export function CompanyCard({ id, name, industry, totalLayers, description }: CompanyCardProps) {
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-fade-in">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-purple-400 flex items-center justify-center text-white font-bold text-lg">
              {name.charAt(0)}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{name}</h3>
              <Badge variant="secondary" className="mt-1">{industry}</Badge>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {description}
        </p>

        <div className="flex gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Layers className="w-4 h-4" />
            <span>{totalLayers} 层架构</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>完整数据</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Link href={`/companies/${id}`} className="w-full">
          <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-white transition-colors">
            查看组织架构
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
