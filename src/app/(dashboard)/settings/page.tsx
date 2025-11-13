"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Settings as SettingsIcon,
  MapPin,
  Phone,
  DollarSign,
  Users,
  Bell,
  Shield,
  Palette,
  Save,
  RefreshCw,
  Plus,
  Trash2,
  Edit
} from "lucide-react"
import { cn } from "@/lib/utils"
import { NotificationSettings } from "@/components/notifications/NotificationSettings"

// Datos específicos de Formosa
const ZONAS_FORMOSA = [
  'Formosa Capital', 'Clorinda', 'Pirané', 'El Colorado', 'Las Lomitas',
  'Ingeniero Juárez', 'Ibarreta', 'Comandante Fontana', 'Villa Dos Trece',
  'General Güemes', 'Laguna Blanca', 'Pozo del Mortero', 'Estanislao del Campo',
  'Villa del Rosario', 'Namqom', 'La Nueva Formosa', 'Solidaridad',
  'San Antonio', 'Obrero', 'GUEMES'
]

const CODIGOS_AREA = [
  { codigo: '+543704', descripcion: 'Formosa Capital' },
  { codigo: '+543705', descripcion: 'Clorinda' },
  { codigo: '+543711', descripcion: 'Interior' },
  { codigo: '+543718', descripcion: 'Zonas rurales' }
]

interface SettingsSection {
  id: string
  title: string
  description: string
  icon: any
  gradient: string
}

const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: "general",
    title: "Configuración General",
    description: "Configuración básica del sistema",
    icon: SettingsIcon,
    gradient: "from-blue-100 to-purple-100"
  },
  {
    id: "formosa",
    title: "Configuración de Formosa",
    description: "Zonas geográficas y códigos de área locales",
    icon: MapPin,
    gradient: "from-green-100 to-emerald-100"
  },
  {
    id: "users",
    title: "Gestión de Usuarios",
    description: "Usuarios y roles del sistema",
    icon: Users,
    gradient: "from-yellow-100 to-orange-100"
  },
  {
    id: "notifications",
    title: "Notificaciones",
    description: "Configuración de alertas y notificaciones",
    icon: Bell,
    gradient: "from-purple-100 to-pink-100"
  }
]

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("general")
  const [saving, setSaving] = useState(false)

  // Estados para configuración general
  const [generalSettings, setGeneralSettings] = useState({
    companyName: "Phorencial",
    companyEmail: "admin@phorencial.com",
    companyPhone: "+543704123456",
    address: "Formosa Capital, Formosa, Argentina",
    timezone: "America/Argentina/Buenos_Aires",
    currency: "ARS"
  })

  // Estados para configuración de Formosa
  const [formosaSettings, setFormosaSettings] = useState({
    zonas: ZONAS_FORMOSA,
    codigosArea: CODIGOS_AREA,
    rangoIngresoMin: 69400000,
    rangoIngresoMax: 215400000
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      // Simular guardado
      await new Promise(resolve => setTimeout(resolve, 1000))
      console.log("Settings saved:", { generalSettings, formosaSettings })
    } catch (error) {
      console.error("Error saving settings:", error)
    } finally {
      setSaving(false)
    }
  }

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <Card className="formosa-card">
        <CardHeader>
          <CardTitle>Información de la Empresa</CardTitle>
          <CardDescription>
            Configuración básica de Phorencial
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nombre de la Empresa</Label>
              <Input
                id="companyName"
                value={generalSettings.companyName}
                onChange={(e) => setGeneralSettings(prev => ({
                  ...prev,
                  companyName: e.target.value
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyEmail">Email Corporativo</Label>
              <Input
                id="companyEmail"
                type="email"
                value={generalSettings.companyEmail}
                onChange={(e) => setGeneralSettings(prev => ({
                  ...prev,
                  companyEmail: e.target.value
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyPhone">Teléfono Principal</Label>
              <Input
                id="companyPhone"
                value={generalSettings.companyPhone}
                onChange={(e) => setGeneralSettings(prev => ({
                  ...prev,
                  companyPhone: e.target.value
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Moneda</Label>
              <select
                id="currency"
                value={generalSettings.currency}
                onChange={(e) => setGeneralSettings(prev => ({
                  ...prev,
                  currency: e.target.value
                }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="ARS">Peso Argentino (ARS)</option>
                <option value="USD">Dólar Estadounidense (USD)</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Textarea
              id="address"
              value={generalSettings.address}
              onChange={(e) => setGeneralSettings(prev => ({
                ...prev,
                address: e.target.value
              }))}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderFormosaSettings = () => (
    <div className="space-y-6">
      {/* Zonas Geográficas */}
      <Card className="formosa-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Zonas Geográficas de Formosa</span>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Zona
            </Button>
          </CardTitle>
          <CardDescription>
            Gestión de zonas geográficas para clasificación de leads
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {formosaSettings.zonas.map((zona, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200"
              >
                <span className="text-sm font-medium">{zona}</span>
                <div className="flex items-center space-x-1">
                  <Button variant="ghost" size="sm">
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Códigos de Área */}
      <Card className="formosa-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Códigos de Área Locales</span>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Código
            </Button>
          </CardTitle>
          <CardDescription>
            Códigos de área telefónicos de Formosa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {formosaSettings.codigosArea.map((codigo, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200"
              >
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">{codigo.codigo}</p>
                    <p className="text-sm text-muted-foreground">{codigo.descripcion}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderUsersSettings = () => (
    <Card className="formosa-card">
      <CardHeader>
        <CardTitle>Gestión de Usuarios</CardTitle>
        <CardDescription>
          Administración de usuarios y roles del sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            Próximamente
          </h3>
          <p className="text-gray-500">
            La gestión de usuarios estará disponible en una próxima actualización
          </p>
        </div>
      </CardContent>
    </Card>
  )

  const renderNotificationsSettings = () => (
    <NotificationSettings />
  )

  const renderContent = () => {
    switch (activeSection) {
      case "general":
        return renderGeneralSettings()
      case "formosa":
        return renderFormosaSettings()
      case "users":
        return renderUsersSettings()
      case "notifications":
        return renderNotificationsSettings()
      default:
        return renderGeneralSettings()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="space-y-8 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold gradient-text" data-testid="settings-title">Configuración</h1>
            <p className="text-muted-foreground mt-2">
              Configuración del sistema CRM Phorencial
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gradient-primary text-white hover-lift"
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar de secciones */}
          <div className="lg:col-span-1">
            <Card className="formosa-card">
              <CardHeader>
                <CardTitle className="text-lg">Secciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {SETTINGS_SECTIONS.map((section) => {
                  const IconComponent = section.icon
                  const isActive = activeSection === section.id

                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg transition-all duration-200",
                        isActive
                          ? "bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200"
                          : "hover:bg-gray-50"
                      )}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          `bg-gradient-to-br ${section.gradient}`
                        )}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div>
                          <p className={cn(
                            "font-medium text-sm",
                            isActive ? "text-blue-700" : "text-gray-700"
                          )}>
                            {section.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {section.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </CardContent>
            </Card>
          </div>

          {/* Contenido principal */}
          <div className="lg:col-span-3">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  )
}
