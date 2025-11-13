'use client'

import { useState } from 'react'
import { ManychatTagManagerProps } from '@/types/manychat-ui'
import { useManychatTags } from '@/hooks/useManychatTags'
import { TagPill } from './TagPill'
import { ManychatBadge } from './ManychatBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Loader2, AlertCircle, Tag } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

export function ManychatTagManager({
  leadId,
  initialTags = [],
  onTagsChange,
  readonly = false,
}: ManychatTagManagerProps) {
  const { addToast } = useToast()
  const {
    availableTags,
    leadTags,
    addTag,
    removeTag,
    loading,
    error: tagsError,
    refreshTags,
  } = useManychatTags(leadId)

  const [searchQuery, setSearchQuery] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [showAvailable, setShowAvailable] = useState(false)

  // Filtrar tags disponibles
  const filteredAvailableTags = availableTags.filter(tag => 
    !leadTags.includes(tag.name) &&
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAddTag = async (tagName: string) => {
    try {
      setIsAdding(true)
      await addTag(tagName)
      addToast({
        title: 'Tag agregado',
        description: `El tag "${tagName}" fue agregado exitosamente`,
        type: 'success',
      })
      onTagsChange?.([...leadTags, tagName])
      setSearchQuery('')
      setShowAvailable(false)
    } catch (error) {
      addToast({
        title: 'Error al agregar tag',
        description: error instanceof Error ? error.message : 'Error desconocido',
        type: 'error',
      })
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemoveTag = async (tagName: string) => {
    try {
      await removeTag(tagName)
      addToast({
        title: 'Tag removido',
        description: `El tag "${tagName}" fue removido exitosamente`,
        type: 'success',
      })
      onTagsChange?.(leadTags.filter(t => t !== tagName))
    } catch (error) {
      addToast({
        title: 'Error al remover tag',
        description: error instanceof Error ? error.message : 'Error desconocido',
        type: 'error',
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-lg">Tags de Manychat</CardTitle>
          </div>
          {leadTags.length > 0 && (
            <Badge variant="outline">{leadTags.length} tags</Badge>
          )}
        </div>
        <CardDescription>
          Gestiona los tags aplicados a este contacto en Manychat
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Error state */}
        {tagsError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800">{tagsError}</p>
          </div>
        )}

        {/* Tags actuales */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700">Tags actuales</h4>
            {!readonly && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAvailable(!showAvailable)}
                className="h-7 text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Agregar tag
              </Button>
            )}
          </div>

          {leadTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {leadTags.map((tag) => (
                <TagPill
                  key={tag}
                  tag={tag}
                  onRemove={readonly ? undefined : () => handleRemoveTag(tag)}
                  readonly={readonly}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
              <Tag className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                {readonly ? 'No hay tags asignados' : 'No hay tags. Agrega algunos para organizar tus contactos'}
              </p>
            </div>
          )}
        </div>

        {/* Agregar tags */}
        {!readonly && showAvailable && (
          <div className="space-y-3 pt-3 border-t">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar tags disponibles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : filteredAvailableTags.length > 0 ? (
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredAvailableTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => handleAddTag(tag.name)}
                    disabled={isAdding}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors',
                      isAdding && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <span className="font-medium text-gray-700">{tag.name}</span>
                    <Plus className="w-4 h-4 text-gray-400" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                {searchQuery ? 'No se encontraron tags' : 'No hay tags disponibles para agregar'}
              </p>
            )}
          </div>
        )}

        {/* Info footer */}
        <div className="pt-3 border-t">
          <ManychatBadge variant="info" size="sm">
            Sincronizado con Manychat
          </ManychatBadge>
        </div>
      </CardContent>
    </Card>
  )
}

