import { ManychatBulkSync } from '@/components/manychat/ManychatBulkSync'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Info } from 'lucide-react'

export const metadata = {
  title: 'Sincronización Chatbot | CRM',
  description: 'Sincroniza todos los contactos del chatbot al CRM'
}

export default function ManychatSyncPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sincronización del Chatbot</h1>
        <p className="text-muted-foreground mt-2">
          Importa y sincroniza todos los contactos del chatbot al CRM
        </p>
      </div>

      {/* Información */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Información sobre la Sincronización
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="font-medium text-blue-900 mb-2">⚠️ Limitación de la API del Chatbot</p>
            <p className="text-blue-800">
              El chatbot <strong>no proporciona un endpoint</strong> para listar todos los contactos directamente. 
              Por esta razón, la sincronización masiva solo puede procesar contactos que ya existen en el CRM.
            </p>
          </div>
          
          <div>
            <p className="font-medium text-gray-900 mb-2">¿Cómo se capturan los contactos del chatbot?</p>
            <p className="mb-2">
              Los contactos se capturan <strong>automáticamente</strong> a través de los webhooks cuando:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2 mb-3">
              <li>Un usuario envía un mensaje a través del chatbot</li>
              <li>Se crea un nuevo subscriber en el chatbot</li>
              <li>Hay cualquier interacción con los flujos del chatbot</li>
            </ul>
            <p className="text-xs text-gray-600 italic">
              Los webhooks están configurados y funcionando automáticamente. Cada vez que hay actividad 
              en el chatbot, el contacto se sincroniza al CRM.
            </p>
          </div>

          <div>
            <p className="font-medium text-gray-900 mb-2">¿Qué hace la sincronización masiva?</p>
            <p className="mb-2">
              La sincronización masiva procesará todos los contactos que ya existen en el CRM y:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Buscará su información correspondiente en el chatbot</li>
              <li>Actualizará los datos con la información más reciente</li>
              <li>Sincronizará tags y custom fields</li>
              <li>Creará conversaciones si no existen</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Componente de sincronización */}
      <ManychatBulkSync />
    </div>
  )
}

