import { ManychatBulkSync } from '@/components/manychat/ManychatBulkSync'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Info } from 'lucide-react'

export const metadata = {
  title: 'Sincronización ManyChat | CRM',
  description: 'Sincroniza todos los contactos de ManyChat al CRM'
}

export default function ManychatSyncPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sincronización ManyChat</h1>
        <p className="text-muted-foreground mt-2">
          Importa y sincroniza todos los contactos de ManyChat al CRM
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
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            La sincronización masiva procesará todos los contactos que ya existen en el CRM y buscará
            su información correspondiente en ManyChat para actualizarla.
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Se sincronizarán los contactos basándose en su teléfono o manychatId</li>
            <li>Los contactos nuevos se crearán automáticamente</li>
            <li>Los contactos existentes se actualizarán con la información más reciente</li>
            <li>El proceso puede tomar varios minutos dependiendo del número de contactos</li>
          </ul>
        </CardContent>
      </Card>

      {/* Componente de sincronización */}
      <ManychatBulkSync />
    </div>
  )
}

