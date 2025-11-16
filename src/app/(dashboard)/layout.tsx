'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext'
import { FMCLogo } from '@/components/branding/FMCLogo'
import { LoadingSpinner } from '@/components/ui/loading-states'
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
        <main className="min-h-screen">
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
