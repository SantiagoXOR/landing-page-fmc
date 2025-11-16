'use client'

import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Calendar, Download, Plus, Settings, Menu } from 'lucide-react'
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
  onSidebarToggle?: () => void
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
  actions,
  onSidebarToggle
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
    <div className={cn('bg-white border-b border-gray-200 px-3 py-2.5 sm:px-4 sm:py-3 lg:px-6 lg:py-4', className)}>
      <div className="flex flex-col space-y-2.5 sm:space-y-3 md:flex-row md:items-start md:justify-between md:space-y-0">
        {/* Lado izquierdo - Botón sidebar (mobile/tablet) y títulos */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start space-x-2 sm:space-x-3">
            {/* Botón del sidebar visible en mobile y tablet */}
            {onSidebarToggle && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSidebarToggle}
                className="lg:hidden h-9 w-9 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100 -ml-1 mt-1 flex-shrink-0"
                aria-label="Toggle sidebar"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <div className="flex-1 min-w-0">
              {/* Primera línea: Título principal */}
              <h1 className="text-lg sm:text-xl md:text-2xl lg:text-2xl font-bold text-gray-900 mb-1.5 sm:mb-2">
                {getGreeting()}, {session?.user?.name || 'Usuario'} 👋
              </h1>
              
              {/* Segunda línea: Fecha y subtítulo */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between sm:gap-4 mt-1.5 sm:mt-0">
                <div className="flex items-center space-x-2">
                  <span className="text-xs sm:text-sm text-gray-500">Hoy</span>
                  <span className="text-xs sm:text-sm font-medium text-gray-700">
                    {formatDate()}
                  </span>
                </div>
                {subtitle && (
                  <p className="text-xs sm:text-sm text-gray-600 mt-1 sm:mt-0">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Lado derecho - Filtros y acciones */}
        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2 md:space-x-2 lg:space-x-3 md:mt-0 md:flex-shrink-0">
          {/* Filtro de fecha */}
          {showDateFilter && (
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <span className="text-xs sm:text-sm text-gray-500 hidden lg:inline">Mostrando data desde:</span>
              <Button
                variant="outline"
                size="sm"
                className="text-gray-700 border-gray-300 hover:bg-gray-50 text-xs sm:text-sm h-9 sm:h-10 px-2.5 sm:px-3 lg:px-4"
              >
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1.5 lg:mr-2" />
                <span className="hidden sm:inline">Esta semana</span>
                <span className="sm:hidden">Semana</span>
              </Button>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            {actions ? (
              actions
            ) : (
              <>
                {showExportButton && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-gray-700 border-gray-300 hover:bg-gray-50 text-xs sm:text-sm h-9 sm:h-10 px-2.5 sm:px-3 lg:px-4 flex-1 sm:flex-initial"
                    onClick={onExport}
                  >
                    <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1.5 lg:mr-2" />
                    <span className="hidden sm:inline">Exportar</span>
                  </Button>
                )}

                {showNewButton && (
                  <Button
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm h-9 sm:h-10 px-2.5 sm:px-3 lg:px-4 flex-1 sm:flex-initial"
                    size="sm"
                    asChild
                  >
                    <a href={newButtonHref}>
                      <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1.5 lg:mr-2" />
                      <span className="hidden sm:inline">{newButtonText}</span>
                      <span className="sm:hidden">Nuevo</span>
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
