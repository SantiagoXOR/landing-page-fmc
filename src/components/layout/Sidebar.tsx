"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  Home,
  MessageSquare,
  Layers,
  Bot,
  Sparkles,
  Tag,
  Users,
  TrendingUp,
  Zap,
  FileText,
  BarChart3,
  Settings,
  Shield,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Radio,
  Workflow
} from "lucide-react"
import { FMCLogo } from '@/components/branding/FMCLogo'
import NotificationCenter from '@/components/notifications/NotificationCenter'

interface NavigationItem {
  name: string
  href: string
  icon: any
  badge?: string | number
  children?: NavigationItem[]
  isHeader?: boolean
}

// Función para crear la navegación con contadores dinámicos
const createNavigation = (leadsCount: number): NavigationItem[] => [
  // Sección Principal
  {
    name: "Inicio",
    href: "/dashboard",
    icon: Home
  },
  {
    name: "Chats",
    href: "/chats",
    icon: MessageSquare,
    badge: "18" // TODO: hacer dinámico desde API
  },
  {
    name: "Conexiones",
    href: "/conexiones",
    icon: Layers
  },
  
  // Separador - Entrenamiento
  {
    name: "Entrenamiento",
    href: "#",
    icon: null,
    isHeader: true
  },
  {
    name: "Asistentes",
    href: "/asistentes",
    icon: Bot
  },
  {
    name: "Testing",
    href: "/testing",
    icon: Sparkles
  },
  
  // Separador - CRM
  {
    name: "CRM",
    href: "#",
    icon: null,
    isHeader: true
  },
  {
    name: "Smart Tags",
    href: "/tags",
    icon: Tag
  },
  {
    name: "Contactos",
    href: "/leads",
    icon: Users,
    badge: leadsCount.toLocaleString()
  },
  {
    name: "Pipeline",
    href: "/pipeline",
    icon: TrendingUp
  },
  {
    name: "Automatizaciones",
    href: "/automation",
    icon: Zap
  },
  {
    name: "Documentos",
    href: "/documents",
    icon: FileText,
    badge: "12" // TODO: hacer dinámico desde API
  },
  {
    name: "Reportes",
    href: "/reports",
    icon: BarChart3
  },
  
  // Separador - Manychat
  {
    name: "Manychat",
    href: "#",
    icon: null,
    isHeader: true
  },
  {
    name: "Dashboard",
    href: "/manychat/dashboard",
    icon: Bot
  },
  {
    name: "Broadcasts",
    href: "/manychat/broadcasts",
    icon: Radio
  },
  {
    name: "Flujos",
    href: "/manychat/flows",
    icon: Workflow
  },
  {
    name: "Configuración",
    href: "/settings/manychat",
    icon: Settings
  },
  
  // Separador - Sistema
  {
    name: "Sistema",
    href: "#",
    icon: null,
    isHeader: true
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings
  },
  {
    name: "Admin",
    href: "/admin",
    icon: Shield,
    children: [
      {
        name: "Usuarios",
        href: "/admin/users",
        icon: Users
      },
      {
        name: "Roles y Permisos",
        href: "/admin/roles",
        icon: Shield
      }
    ]
  }
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [leadsCount, setLeadsCount] = useState(0)
  const pathname = usePathname()
  const { data: session } = useSession()

  // Obtener contador de leads dinámicamente
  useEffect(() => {
    const fetchLeadsCount = async () => {
      try {
        const response = await fetch('/api/dashboard/metrics')
        if (response.ok) {
          const data = await response.json()
          setLeadsCount(data.totalLeads || 0)
        }
      } catch (error) {
        console.error('Error fetching leads count:', error)
        setLeadsCount(0)
      }
    }

    fetchLeadsCount()
  }, [])

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    )
  }

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/")
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="bg-white/90 backdrop-blur-sm border-gray-200"
        >
          {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full",
        className
      )} data-testid="sidebar">
        {/* Fondo claro estilo Prometheo */}
        <div className="absolute inset-0 bg-gray-50" />
        
        <div className="relative flex flex-col h-full">
          {/* Logo */}
          <div className="flex justify-center -my-6" data-testid="sidebar-logo">
            <FMCLogo variant="icon" size="lg" />
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
            {createNavigation(leadsCount).map((item, index) => {
              const active = isActive(item.href)
              const expanded = expandedItems.includes(item.name)
              
              // Si es un header, renderizar separador
              if (item.isHeader) {
                return (
                  <div key={item.name} className="my-4">
                    <Separator className="my-2" />
                    <div className="px-3 py-2">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {item.name}
                      </h3>
                    </div>
                  </div>
                )
              }
              
              return (
                <div key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      "group flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                      active
                        ? "bg-purple-100 text-purple-700 border border-purple-200"
                        : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                    )}
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="flex items-center space-x-3">
                      {item.icon && (
                        <item.icon className={cn(
                          "h-5 w-5 transition-colors",
                          active ? "text-purple-600" : "text-gray-500 group-hover:text-gray-700"
                        )} />
                      )}
                      <span>{item.name}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {item.badge && (
                        <Badge 
                          variant="secondary"
                          className={cn(
                            "text-xs",
                            active 
                              ? "bg-purple-200 text-purple-800" 
                              : "bg-gray-200 text-gray-600"
                          )}
                        >
                          {item.badge}
                        </Badge>
                      )}
                      
                      {item.children && (
                        <ChevronDown className={cn(
                          "h-4 w-4 transition-transform",
                          expanded ? "rotate-180" : ""
                        )} />
                      )}
                    </div>
                  </Link>

                  {/* Submenu */}
                  {item.children && expanded && (
                    <div className="ml-6 mt-2 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.name}
                          href={child.href}
                            className={cn(
                              "block px-3 py-2 text-sm rounded-md transition-colors",
                              isActive(child.href)
                                ? "text-purple-600 bg-purple-50"
                                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                            )}
                          onClick={() => setIsOpen(false)}
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-gray-200">
            {/* Notifications */}
            <div className="mb-4 flex justify-center">
              <NotificationCenter className="" />
            </div>

            {/* User info */}
            <div className="space-y-2">
              <div className="flex items-center space-x-3 p-2 rounded-lg bg-gray-100" data-testid="user-info">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {session?.user?.name?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate" data-testid="user-name">
                    {session?.user?.name || 'Usuario'}
                  </p>
                  <p className="text-xs text-gray-500 truncate" data-testid="user-email">
                    {session?.user?.email || 'email@ejemplo.com'}
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                data-testid="logout-button"
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span>Cerrar Sesión</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// Hook para obtener información de navegación
export function useNavigation() {
  const pathname = usePathname()
  const [leadsCount, setLeadsCount] = useState(0)

  // Obtener contador de leads para el hook
  useEffect(() => {
    const fetchLeadsCount = async () => {
      try {
        const response = await fetch('/api/dashboard/metrics')
        if (response.ok) {
          const data = await response.json()
          setLeadsCount(data.totalLeads || 0)
        }
      } catch (error) {
        console.error('Error fetching leads count:', error)
        setLeadsCount(0)
      }
    }

    fetchLeadsCount()
  }, [])

  const navigation = createNavigation(leadsCount)

  const getCurrentPage = () => {
    const currentItem = navigation.find(item =>
      pathname === item.href || pathname.startsWith(item.href + "/")
    )
    return currentItem?.name || "Dashboard"
  }

  const getBreadcrumbs = () => {
    const segments = pathname.split("/").filter(Boolean)
    return segments.map((segment, index) => ({
      name: segment.charAt(0).toUpperCase() + segment.slice(1),
      href: "/" + segments.slice(0, index + 1).join("/"),
      isLast: index === segments.length - 1
    }))
  }

  return {
    currentPage: getCurrentPage(),
    breadcrumbs: getBreadcrumbs(),
    navigation
  }
}
