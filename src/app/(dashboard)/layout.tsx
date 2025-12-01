'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext'
import { FMCLogo } from '@/components/branding/FMCLogo'
import { LoadingSpinner } from '@/components/ui/loading-states'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'
import { cn } from '@/lib/utils'

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const sidebar = useSidebar()

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="relative">
          {/* Spinner más grande que rodea el logo */}
          <div className="absolute inset-0 flex items-center justify-center -m-8">
            <div className="w-48 h-48 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          </div>
          {/* Logo centrado */}
          <div className="relative z-10">
            <FMCLogo variant="icon" size="lg" />
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    router.push('/auth/signin')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar moderno */}
      <Sidebar 
        isOpen={sidebar.isOpen}
        onToggle={sidebar.toggle}
        onClose={sidebar.close}
      />

      {/* Contenido principal */}
      <div className={cn(
        "transition-all duration-300",
        sidebar.isOpen ? "md:pl-64" : "md:pl-0",
        "lg:pl-64"
      )}>
        {/* Header superior con botón de notificación */}
        <header className={cn(
          "fixed top-0 right-0 z-40 bg-white border-b border-gray-200 h-16 flex items-center justify-end px-4 md:px-6 transition-all duration-300",
          "left-0 lg:left-64",
          sidebar.isOpen ? "md:left-64" : "md:left-0"
        )}>
          <div className="flex items-center space-x-4">
            {/* Botón de notificación en el margen superior derecho */}
            <NotificationCenter />
            
            {/* Información del usuario */}
            <div className="hidden sm:flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {session?.user?.name || 'Usuario'}
                </p>
                <p className="text-xs text-gray-500">
                  {session?.user?.role || 'Usuario'}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Contenido con padding superior para el header */}
        <main className="min-h-screen pt-16">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  )
}
