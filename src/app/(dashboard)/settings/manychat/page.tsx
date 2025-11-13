'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { ManychatConnectionStatus } from '@/components/manychat/ManychatConnectionStatus'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Settings, 
  Key, 
  Link as LinkIcon, 
  Tag, 
  Database,
  Copy,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  FileText
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

export default function ManychatSettingsPage() {
  const { addToast } = useToast()
  const [config, setConfig] = useState({
    apiKeyConfigured: false,
    webhookUrl: '',
    webhookConfigured: false,
  })
  const [webhookLogs, setWebhookLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchConfiguration()
  }, [])

  const fetchConfiguration = async () => {
    try {
      setLoading(true)
      
      // Verificar estado de Manychat
      const healthResponse = await fetch('/api/manychat/health')
      const healthData = await healthResponse.json()
      
      setConfig({
        apiKeyConfigured: healthData.status === 'healthy',
        webhookUrl: `${window.location.origin}/api/whatsapp/webhook`,
        webhookConfigured: true, // Simplificado
      })
    } catch (error) {
      console.error('Error fetching configuration:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    addToast({
      title: 'Copiado',
      description: `${label} copiado al portapapeles`,
      type: 'success',
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Configuración de Manychat"
        subtitle="Gestiona la integración con Manychat API"
        showDateFilter={false}
        showExportButton={false}
        showNewButton={false}
      />

      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {/* Estado de conexión */}
        <ManychatConnectionStatus showDetails />

        {/* Tabs de configuración */}
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">
              <Settings className="w-4 h-4 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="webhook">
              <LinkIcon className="w-4 h-4 mr-2" />
              Webhook
            </TabsTrigger>
            <TabsTrigger value="mapping">
              <Database className="w-4 h-4 mr-2" />
              Mapeo
            </TabsTrigger>
            <TabsTrigger value="docs">
              <FileText className="w-4 h-4 mr-2" />
              Documentación
            </TabsTrigger>
          </TabsList>

          {/* Tab: General */}
          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  API Key
                </CardTitle>
                <CardDescription>
                  Configuración de la clave de API de Manychat
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {config.apiKeyConfigured ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-medium text-gray-900">API Key Configurada</p>
                          <p className="text-sm text-gray-500">La API está funcionando correctamente</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5 text-yellow-600" />
                        <div>
                          <p className="font-medium text-gray-900">API Key No Configurada</p>
                          <p className="text-sm text-gray-500">Agrega MANYCHAT_API_KEY a tu .env</p>
                        </div>
                      </>
                    )}
                  </div>
                  <Badge variant={config.apiKeyConfigured ? 'default' : 'outline'}>
                    {config.apiKeyConfigured ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium text-sm mb-2">Cómo obtener tu API Key:</h4>
                  <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                    <li>Ve a Manychat → Settings → API</li>
                    <li>Haz clic en "Generate your API Key"</li>
                    <li>Copia la key (empieza con MCAPIKey-)</li>
                    <li>Agrégala a tu archivo .env.local</li>
                  </ol>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    asChild
                  >
                    <a
                      href="https://manychat.com/settings/api"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Ir a configuración de API
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Webhook */}
          <TabsContent value="webhook" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="w-5 h-5" />
                  Configuración de Webhook
                </CardTitle>
                <CardDescription>
                  URL de webhook para recibir eventos de Manychat
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Webhook URL */}
                <div>
                  <Label htmlFor="webhookUrl">Webhook URL</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      id="webhookUrl"
                      value={config.webhookUrl}
                      readOnly
                      className="font-mono text-sm bg-gray-50"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(config.webhookUrl, 'Webhook URL')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Usa esta URL en la configuración de webhooks de Manychat
                  </p>
                </div>

                {/* Eventos soportados */}
                <div>
                  <Label>Eventos Soportados</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {[
                      'new_subscriber',
                      'message_received',
                      'tag_added',
                      'tag_removed',
                      'custom_field_changed',
                    ].map((event) => (
                      <div
                        key={event}
                        className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded"
                      >
                        <CheckCircle2 className="w-3 h-3 text-green-600" />
                        <span className="text-xs text-green-900">{event}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Instrucciones */}
                <div className="border-t pt-4">
                  <h4 className="font-medium text-sm mb-2">Configurar en Manychat:</h4>
                  <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                    <li>Ve a Manychat → Settings → API → Webhooks</li>
                    <li>Haz clic en "Add Webhook"</li>
                    <li>Pega la Webhook URL de arriba</li>
                    <li>Agrega tu MANYCHAT_WEBHOOK_SECRET como verify token</li>
                    <li>Selecciona todos los eventos listados arriba</li>
                    <li>Haz clic en "Verify" y luego "Save"</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Mapeo */}
          <TabsContent value="mapping" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Mapeo de Campos
                </CardTitle>
                <CardDescription>
                  Mapeo automático entre CRM y Manychat
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { crm: 'nombre', manychat: 'first_name + last_name', description: 'Nombre completo' },
                    { crm: 'telefono', manychat: 'phone / whatsapp_phone', description: 'Número de teléfono' },
                    { crm: 'email', manychat: 'email', description: 'Correo electrónico' },
                    { crm: 'dni', manychat: 'custom_field: dni', description: 'Documento de identidad' },
                    { crm: 'ingresos', manychat: 'custom_field: ingresos', description: 'Ingresos mensuales' },
                    { crm: 'zona', manychat: 'custom_field: zona', description: 'Zona geográfica' },
                    { crm: 'producto', manychat: 'custom_field: producto', description: 'Producto de interés' },
                    { crm: 'monto', manychat: 'custom_field: monto', description: 'Monto solicitado' },
                    { crm: 'estado', manychat: 'custom_field: estado', description: 'Estado del lead' },
                    { crm: 'tags', manychat: 'tags', description: 'Tags aplicados' },
                  ].map((mapping, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-sm">
                          <code className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                            {mapping.crm}
                          </code>
                          <span className="text-gray-400">→</span>
                          <code className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                            {mapping.manychat}
                          </code>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{mapping.description}</p>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    ℹ️ El mapeo es automático. Los cambios en el CRM se sincronizan a Manychat
                    y viceversa según la configuración de webhooks.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Documentación */}
          <TabsContent value="docs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Documentación
                </CardTitle>
                <CardDescription>
                  Guías y recursos para la integración de Manychat
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  asChild
                >
                  <Link href="/docs/MANYCHAT-SETUP.md">
                    <span>Guía de Configuración Completa</span>
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-between"
                  asChild
                >
                  <Link href="/docs/MANYCHAT-INTEGRATION.md">
                    <span>Documentación Técnica</span>
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-between"
                  asChild
                >
                  <a
                    href="https://api.manychat.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span>API de Manychat (Oficial)</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-between"
                  asChild
                >
                  <a
                    href="https://help.manychat.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span>Centro de Ayuda de Manychat</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>

                <div className="pt-4 border-t">
                  <h4 className="font-medium text-sm mb-3">Variables de Entorno Requeridas:</h4>
                  <div className="space-y-2">
                    <div className="p-2 bg-gray-50 rounded font-mono text-xs">
                      <span className="text-purple-600">MANYCHAT_API_KEY</span>
                      <span className="text-gray-400">=</span>
                      <span className="text-gray-600">MCAPIKey-xxx...</span>
                    </div>
                    <div className="p-2 bg-gray-50 rounded font-mono text-xs">
                      <span className="text-purple-600">MANYCHAT_BASE_URL</span>
                      <span className="text-gray-400">=</span>
                      <span className="text-gray-600">https://api.manychat.com</span>
                    </div>
                    <div className="p-2 bg-gray-50 rounded font-mono text-xs">
                      <span className="text-purple-600">MANYCHAT_WEBHOOK_SECRET</span>
                      <span className="text-gray-400">=</span>
                      <span className="text-gray-600">tu-secreto-seguro</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Troubleshooting */}
        <Card className="border-yellow-200 bg-yellow-50/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              Troubleshooting
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-gray-900">❓ No se reciben webhooks</p>
                <ul className="text-gray-600 ml-4 mt-1 space-y-0.5">
                  <li>• Verifica que la URL sea accesible públicamente</li>
                  <li>• Confirma que el webhook secret coincida</li>
                  <li>• Revisa los logs en Manychat Settings → API → Webhooks</li>
                </ul>
              </div>

              <div>
                <p className="font-medium text-gray-900">❓ Error al enviar mensajes</p>
                <ul className="text-gray-600 ml-4 mt-1 space-y-0.5">
                  <li>• Verifica que el subscriber exista en Manychat</li>
                  <li>• Confirma que el teléfono esté en formato E.164 (+51...)</li>
                  <li>• Revisa que la API Key sea válida</li>
                </ul>
              </div>

              <div>
                <p className="font-medium text-gray-900">❓ Tags no se sincronizan</p>
                <ul className="text-gray-600 ml-4 mt-1 space-y-0.5">
                  <li>• Los tags son case-sensitive</li>
                  <li>• Verifica que el tag exista en Manychat</li>
                  <li>• Revisa logs de sincronización en ManychatSync</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

