'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageCircle } from 'lucide-react'
import {
  DEFAULT_REMARKETING_TEMPLATE_ID,
  getRemarketingTemplatesForUi,
  formatRemarketingPreview,
} from '@/lib/remarketing-templates'

interface RemarketingTemplateModalProps {
  open: boolean
  leadName?: string | null
  onConfirm: (templateId: string) => void
  onCancel: () => void
  isLoading?: boolean
}

export function RemarketingTemplateModal({
  open,
  leadName,
  onConfirm,
  onCancel,
  isLoading = false,
}: RemarketingTemplateModalProps) {
  const templates = getRemarketingTemplatesForUi()
  const [selectedId, setSelectedId] = useState<string>(DEFAULT_REMARKETING_TEMPLATE_ID)

  if (!open || typeof window === 'undefined') return null

  const selected = templates.find((t) => t.id === selectedId)

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5 text-emerald-600" />
            <span>Remarketing — Elegir plantilla WhatsApp</span>
          </CardTitle>
          <CardDescription>
            Se enviará una plantilla de Meta al mover el lead
            {leadName ? ` (${leadName})` : ''} a Remarketing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {templates.map((template) => {
              const isSelected = selectedId === template.id
              return (
                <Button
                  key={template.id}
                  type="button"
                  variant={isSelected ? 'default' : 'outline'}
                  onClick={() => setSelectedId(template.id)}
                  className="justify-start text-left h-auto py-3 px-4 w-full"
                >
                  <div className="flex flex-col items-start w-full gap-1">
                    <span className={`font-medium ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                      {template.label}
                    </span>
                    <span
                      className={`text-xs ${isSelected ? 'text-gray-100' : 'text-gray-600'}`}
                    >
                      {template.description}
                    </span>
                  </div>
                </Button>
              )
            })}
          </div>

          {selected && (
            <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
              <div className="text-sm font-semibold text-gray-900 mb-2">Vista previa</div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {formatRemarketingPreview(selected.preview, leadName)}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
            <Button
              type="button"
              className="flex-1"
              disabled={!selectedId || isLoading}
              onClick={() => onConfirm(selectedId)}
            >
              {isLoading ? 'Moviendo…' : 'Mover a Remarketing y enviar'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>,
    document.body
  )
}
