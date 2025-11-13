'use client'

import { Header } from '@/components/layout/Header'
import { ManychatMetrics } from '@/components/manychat/ManychatMetrics'
import { ManychatConnectionStatus } from '@/components/manychat/ManychatConnectionStatus'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bot, ExternalLink, Settings } from 'lucide-react'
import Link from 'next/link'

export default function ManychatDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Dashboard de Manychat"
        subtitle="Métricas y estadísticas de la integración con Manychat"
        showDateFilter={false}
        showExportButton={false}
        showNewButton={false}
        actions={
          <div className="flex items-center gap-2">
            <ManychatConnectionStatus />
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/settings/manychat">
                <Settings className="w-4 h-4 mr-2" />
                Configuración
              </Link>
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Banner de bienvenida */}
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl text-purple-900">
                  Integración Híbrida Manychat
                </CardTitle>
                <CardDescription className="text-purple-700">
                  Flujos automáticos + Gestión manual desde el CRM
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" asChild>
                <a
                  href="https://manychat.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  Abrir Manychat
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/manychat/broadcasts">
                  Crear Broadcast
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/manychat/flows">
                  Ver Flujos
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Métricas principales */}
        <ManychatMetrics />

        {/* Guía rápida */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Guía Rápida</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">📱 Enviar Mensajes</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Ve al detalle de un lead</li>
                  <li>• Usa el tab "Enviar" para mensajes</li>
                  <li>• Soporta texto, imágenes, videos, archivos</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">🏷️ Gestionar Tags</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Usa el tab "Tags" en detalle de lead</li>
                  <li>• Agrega/remueve tags fácilmente</li>
                  <li>• Sincronización automática con Manychat</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">🔄 Sincronización</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Sincronización bidireccional automática</li>
                  <li>• Usa "Sincronizar ahora" para forzar sync</li>
                  <li>• Revisa logs en el panel de sync</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">📢 Broadcasts</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Envía mensajes masivos por tags</li>
                  <li>• Requiere templates aprobados</li>
                  <li>• Cumple políticas de WhatsApp</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

