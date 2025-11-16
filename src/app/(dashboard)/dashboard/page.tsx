'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/Header'
import { useSidebar } from '@/contexts/SidebarContext'
import {
  MessageSquare,
  Plus,
  MoreHorizontal
} from 'lucide-react'
import Link from 'next/link'
import { IndicatorCard } from '@/components/dashboard/IndicatorCard'
import { AddIndicatorCard } from '@/components/dashboard/AddIndicatorCard'
import { ConversationsByChannel } from '@/components/dashboard/ConversationsByChannel'
import { WeeklyTrendChart } from '@/components/dashboard/WeeklyTrendChart'
import { cn } from '@/lib/utils'

interface DashboardMetrics {
  totalLeads: number
  newLeadsToday: number
  conversionRate: number
  leadsThisWeek: number
  leadsThisMonth: number
  projectedRevenue: number
  leadsByStatus: Record<string, number>
  recentLeads: Array<{
    id: string
    nombre: string
    telefono: string
    email?: string
    estado: string
    origen?: string
    createdAt: string
  }>
  trendData: Array<{
    date: string
    month?: string
    leads: number
    conversions: number
  }>
  leadsByZone?: Array<{
    zona: string
    count: number
    percentage: number
  }>
  revenueData?: Array<{
    month: string
    ingresos: number
    proyectado: number
  }>
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sidebar = useSidebar()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="space-y-8 p-6">
          <div className="h-20 bg-gray-200 rounded animate-pulse"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header
        title="Dashboard"
        subtitle="Resumen de actividad y métricas principales de FMC"
        showDateFilter={true}
        showExportButton={true}
        showNewButton={true}
        newButtonText="Nuevo Lead"
        newButtonHref="/leads/new"
        onSidebarToggle={sidebar.toggle}
      />

      <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 lg:space-y-8">
        {/* Sección de Indicadores */}
        <div>
          <div className="mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Indicadores</h2>
            <p className="text-xs sm:text-sm text-gray-500">Agrega o modifícalos según tus preferencias</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Card de Conversaciones */}
            <IndicatorCard
              title="Conversaciones"
              value="18"
              icon={<MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />}
            />
            
            {/* Cards de Añadir Indicador */}
            <AddIndicatorCard />
            <AddIndicatorCard />
            <AddIndicatorCard />
          </div>
        </div>

        {/* Gráfico de Tendencia Semanal */}
        <WeeklyTrendChart />

        {/* Grid inferior */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Conversaciones por Moderador (vacío por ahora) */}
          <Card className="bg-white border-gray-200">
            <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-2 sm:pb-4">
              <CardTitle className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">
                CONVERSACIONES POR MODERADOR
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="h-48 sm:h-64 flex items-center justify-center text-gray-400">
                <p className="text-xs sm:text-sm">No hay datos disponibles</p>
              </div>
            </CardContent>
          </Card>

          {/* Conversaciones por Canal */}
          <ConversationsByChannel />
        </div>
      </div>
    </div>
  )
}
