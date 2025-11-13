'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/Header'
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
      />

      <div className="p-6 space-y-8">
        {/* Sección de Indicadores */}
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Indicadores</h2>
            <p className="text-sm text-gray-500">Agrega o modifícalos según tus preferencias</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card de Conversaciones */}
            <IndicatorCard
              title="Conversaciones"
              value="18"
              icon={<MessageSquare className="h-6 w-6 text-purple-600" />}
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Conversaciones por Moderador (vacío por ahora) */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                CONVERSACIONES POR MODERADOR
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-gray-400">
                <p>No hay datos disponibles</p>
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
