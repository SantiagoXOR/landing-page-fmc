"use client"

import {
  SalesTrendChart,
  PerformanceBarChart,
  LeadsDistributionChart,
  RevenueAreaChart,
  CRMMetrics
} from '@/components/charts'

// Datos de ejemplo para los gráficos
const salesTrendData = [
  { month: 'Ene', sales: 65, leads: 120 },
  { month: 'Feb', sales: 78, leads: 140 },
  { month: 'Mar', sales: 90, leads: 160 },
  { month: 'Abr', sales: 81, leads: 145 },
  { month: 'May', sales: 95, leads: 180 },
  { month: 'Jun', sales: 110, leads: 200 },
]

const performanceData = [
  { name: 'Juan Pérez', ventas: 85, meta: 100 },
  { name: 'María García', ventas: 120, meta: 100 },
  { name: 'Carlos López', ventas: 75, meta: 100 },
  { name: 'Ana Martín', ventas: 95, meta: 100 },
  { name: 'Luis Rodríguez', ventas: 110, meta: 100 },
]

const leadsDistributionData = [
  { name: 'Nuevos', value: 45, color: 'hsl(var(--primary))' },
  { name: 'Contactados', value: 30, color: 'hsl(var(--secondary))' },
  { name: 'Calificados', value: 20, color: 'hsl(var(--accent))' },
  { name: 'Cerrados', value: 15, color: 'hsl(var(--muted))' },
]

const revenueData = [
  { month: 'Ene', ingresos: 50000, proyectado: 45000 },
  { month: 'Feb', ingresos: 75000, proyectado: 70000 },
  { month: 'Mar', ingresos: 120000, proyectado: 100000 },
  { month: 'Abr', ingresos: 95000, proyectado: 110000 },
  { month: 'May', ingresos: 140000, proyectado: 130000 },
  { month: 'Jun', ingresos: 180000, proyectado: 160000 },
]

export default function ChartsDemoPage() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard de Gráficos CRM</h1>
        <p className="text-muted-foreground">
          Ejemplos de visualizaciones de datos para el sistema CRM usando Shadcn/ui y Recharts
        </p>
      </div>

      {/* Métricas principales */}
      <CRMMetrics />

      <div className="grid gap-6 md:grid-cols-2">
        <SalesTrendChart data={salesTrendData} />
        <PerformanceBarChart data={performanceData} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <LeadsDistributionChart data={leadsDistributionData} />
        <RevenueAreaChart data={revenueData} />
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Tipos de Gráficos Implementados</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium">Line Chart</h3>
            <p className="text-sm text-muted-foreground">
              Ideal para mostrar tendencias de ventas y leads a lo largo del tiempo
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium">Bar Chart</h3>
            <p className="text-sm text-muted-foreground">
              Perfecto para comparar rendimiento entre vendedores o productos
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium">Pie Chart</h3>
            <p className="text-sm text-muted-foreground">
              Excelente para mostrar distribución de leads por estado o fuente
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium">Area Chart</h3>
            <p className="text-sm text-muted-foreground">
              Útil para visualizar ingresos acumulados y proyecciones
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
