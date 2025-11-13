import { Metadata } from 'next'
import { AutomationRulesManager } from '@/components/automation/AutomationRulesManager'

export const metadata: Metadata = {
  title: 'Automatizaciones | Phorencial CRM',
  description: 'Gestiona reglas de automatización para el pipeline de ventas',
}

export default function AutomationPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <AutomationRulesManager />
    </div>
  )
}
