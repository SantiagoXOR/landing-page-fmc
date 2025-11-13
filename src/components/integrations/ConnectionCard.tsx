'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { RefreshCw, Copy, Edit, Phone, Camera, Facebook } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConnectionCardProps {
  platform: 'whatsapp' | 'instagram' | 'facebook'
  status: 'connected' | 'disconnected' | 'pending'
  value?: string
  placeholder?: string
  onConnect?: () => void
  onRefresh?: () => void
  onEdit?: () => void
  onCopy?: () => void
  className?: string
}

const platformConfig = {
  whatsapp: {
    name: 'WhatsApp',
    icon: Phone,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  instagram: {
    name: 'Instagram',
    icon: Camera,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200'
  },
  facebook: {
    name: 'Facebook',
    icon: Facebook,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  }
}

export function ConnectionCard({
  platform,
  status,
  value,
  placeholder,
  onConnect,
  onRefresh,
  onEdit,
  onCopy,
  className
}: ConnectionCardProps) {
  const config = platformConfig[platform]
  const Icon = config.icon

  const getStatusBadge = () => {
    switch (status) {
      case 'connected':
        return <Badge className="status-connected">CONECTADO</Badge>
      case 'pending':
        return <Badge className="status-pending">PENDIENTE</Badge>
      default:
        return <Badge className="status-disconnected">NO CONECTADO</Badge>
    }
  }

  const getButtonText = () => {
    switch (status) {
      case 'connected':
        return 'Conectado'
      case 'pending':
        return 'Conectando...'
      default:
        return 'Conectar'
    }
  }

  const getButtonVariant = () => {
    switch (status) {
      case 'connected':
        return 'default'
      case 'pending':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const getButtonClassName = () => {
    switch (status) {
      case 'connected':
        return 'bg-purple-600 hover:bg-purple-700 text-white'
      case 'pending':
        return 'bg-gray-100 text-gray-600'
      default:
        return 'bg-purple-100 hover:bg-purple-200 text-purple-700'
    }
  }

  return (
    <Card className={cn(
      'bg-white border-gray-200 hover:shadow-md transition-shadow',
      status === 'connected' && 'border-t-4 border-t-purple-500',
      className
    )}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={cn(
              'p-2 rounded-lg',
              config.bgColor
            )}>
              <Icon className={cn('h-5 w-5', config.color)} />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">
                {config.name}
              </CardTitle>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {status === 'connected' && value ? (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Input
                value={value}
                readOnly
                className="bg-gray-50"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={onCopy}
                className="h-9 w-9 p-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
                className="h-9 w-9 p-0"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                className={getButtonClassName()}
                disabled
              >
                {getButtonText()}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                className="h-9 w-9 p-0"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              {placeholder || 'Conecta para ver información'}
            </p>
            
            <Button
              onClick={onConnect}
              className={getButtonClassName()}
              disabled={status === 'pending'}
            >
              {getButtonText()}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
