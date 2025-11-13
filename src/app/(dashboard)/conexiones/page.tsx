'use client'

import { Header } from '@/components/layout/Header'
import { ConnectionCard } from '@/components/integrations/ConnectionCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Folder } from 'lucide-react'

export default function ConexionesPage() {
  const handleWhatsAppConnect = () => {
    console.log('Conectar WhatsApp')
    // Implementar lógica de conexión
  }

  const handleInstagramConnect = () => {
    console.log('Conectar Instagram')
    // Implementar lógica de conexión
  }

  const handleFacebookConnect = () => {
    console.log('Conectar Facebook')
    // Implementar lógica de conexión
  }

  const handleRefresh = (platform: string) => {
    console.log(`Refrescar ${platform}`)
    // Implementar lógica de refresh
  }

  const handleEdit = (platform: string) => {
    console.log(`Editar ${platform}`)
    // Implementar lógica de edición
  }

  const handleCopy = (platform: string) => {
    console.log(`Copiar ${platform}`)
    // Implementar lógica de copia
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header
        title="Conexiones"
        subtitle="Gestiona las integraciones con tus plataformas de comunicación"
        showDateFilter={false}
        showExportButton={false}
        showNewButton={false}
      />

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna principal - Cards de conexión */}
          <div className="lg:col-span-2 space-y-6">
            {/* WhatsApp */}
            <ConnectionCard
              platform="whatsapp"
              status="connected"
              value="+541132049851"
              onRefresh={() => handleRefresh('WhatsApp')}
              onEdit={() => handleEdit('WhatsApp')}
              onCopy={() => handleCopy('WhatsApp')}
            />

            {/* Instagram */}
            <ConnectionCard
              platform="instagram"
              status="connected"
              value="@teamrivasremax"
              onRefresh={() => handleRefresh('Instagram')}
              onEdit={() => handleEdit('Instagram')}
              onCopy={() => handleCopy('Instagram')}
            />

            {/* Facebook */}
            <ConnectionCard
              platform="facebook"
              status="disconnected"
              placeholder="Conecta para ver información"
              onConnect={handleFacebookConnect}
            />
          </div>

          {/* Columna lateral - Navegación */}
          <div className="space-y-6">
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                  <Folder className="h-5 w-5 mr-2 text-gray-500" />
                  Conexiones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
                    Integraciones
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Información adicional */}
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  Estado de Conexiones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">WhatsApp</span>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Instagram</span>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Facebook</span>
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
