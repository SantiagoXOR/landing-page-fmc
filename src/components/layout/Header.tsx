'use client'

import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Calendar, Download, Plus, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HeaderProps {
  title: string
  subtitle?: string
  showDateFilter?: boolean
  showExportButton?: boolean
  showNewButton?: boolean
  newButtonText?: string
  newButtonHref?: string
  onExport?: () => void
  className?: string
  actions?: React.ReactNode
}

export function Header({
  title,
  subtitle,
  showDateFilter = true,
  showExportButton = true,
  showNewButton = true,
  newButtonText = "Nuevo",
  newButtonHref = "#",
  onExport,
  className,
  actions
}: HeaderProps) {
  const { data: session } = useSession()

  const formatDate = () => {
    const now = new Date()
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }
    return now.toLocaleDateString('es-ES', options)
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Buenos días'
    if (hour < 18) return 'Buenas tardes'
    return 'Buenas noches'
  }

  return (
    <div className={cn('bg-white border-b border-gray-200 px-6 py-4', className)}>
      <div className="flex items-center justify-between">
        {/* Lado izquierdo - Saludo y título */}
        <div className="flex-1">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {getGreeting()}, {session?.user?.name || 'Usuario'} 👋
              </h1>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-sm text-gray-500">Hoy</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatDate()}
                </span>
              </div>
            </div>
          </div>
          
          {subtitle && (
            <p className="text-sm text-gray-600 mt-1">
              {subtitle}
            </p>
          )}
        </div>

        {/* Lado derecho - Filtros y acciones */}
        <div className="flex items-center space-x-4">
          {/* Filtro de fecha */}
          {showDateFilter && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Mostrando data desde:</span>
              <Button
                variant="outline"
                size="sm"
                className="text-gray-700 border-gray-300 hover:bg-gray-50"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Esta semana
              </Button>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex items-center space-x-2">
            {actions ? (
              actions
            ) : (
              <>
                {showExportButton && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-gray-700 border-gray-300 hover:bg-gray-50"
                    onClick={onExport}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                )}

                {showNewButton && (
                  <Button
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                    size="sm"
                    asChild
                  >
                    <a href={newButtonHref}>
                      <Plus className="h-4 w-4 mr-2" />
                      {newButtonText}
                    </a>
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
