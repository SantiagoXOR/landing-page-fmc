'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Phone, MessageCircle } from 'lucide-react'
import { type Dealer, getWhatsAppUrl } from '@/lib/dealers-data'
import { cn } from '@/lib/utils'

interface DealerCardProps {
  dealer: Dealer
  isSelected?: boolean
  onClick?: () => void
}

export function DealerCard({ dealer, isSelected = false, onClick }: DealerCardProps) {
  const waUrl = getWhatsAppUrl(dealer)

  return (
    <Card 
      className={cn(
        "group relative h-full flex flex-col bg-white border-fmc-purple/20 hover:border-fmc-purple/40 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer",
        isSelected && "border-fmc-purple ring-2 ring-fmc-purple/50"
      )}
      onClick={onClick}
    >
      <CardContent className="p-6 flex flex-col flex-1">
        {/* Header con nombre y badge de zona */}
        <div className="mb-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-acto-bold text-lg text-fmc-purple leading-tight flex-1">
              {dealer.name}
            </h3>
            <Badge
              variant="outline"
              className={cn(
                "shrink-0 text-xs font-acto-semibold",
                dealer.zone === 'Capital'
                  ? "border-fmc-green/50 bg-fmc-green/10 text-fmc-green"
                  : "border-fmc-blue/50 bg-fmc-blue/10 text-fmc-blue"
              )}
            >
              {dealer.zone}
            </Badge>
          </div>
        </div>

        {/* Dirección */}
        <div className="flex items-start gap-2 mb-3 text-sm text-gray-600">
          <MapPin className="w-4 h-4 text-fmc-blue mt-0.5 shrink-0" />
          <p className="font-acto-regular leading-relaxed">{dealer.address}</p>
        </div>

        {/* Teléfono */}
        <div className="flex items-center gap-2 mb-4 text-sm">
          <Phone className="w-4 h-4 text-fmc-blue shrink-0" />
          <a
            href={`tel:${dealer.phone.replace(/\D/g, '')}`}
            className="font-acto-regular text-fmc-blue hover:text-fmc-purple hover:underline transition-colors"
          >
            {dealer.phone}
          </a>
        </div>

        {/* Marcas */}
        <div className="mb-4 flex-1">
          <p className="text-xs font-acto-semibold text-gray-500 mb-2 uppercase tracking-wide">
            Marcas
          </p>
          <div className="flex flex-wrap gap-1.5">
            {dealer.brands.map((brand) => (
              <Badge
                key={brand}
                variant="outline"
                className="text-xs font-acto-medium border-fmc-purple/30 text-fmc-purple/80 bg-fmc-purple/5"
              >
                {brand}
              </Badge>
            ))}
          </div>
        </div>

        {/* Botón de WhatsApp */}
        <Button
          asChild
          className="w-full bg-[#25D366] hover:bg-[#20BA5A] text-white font-acto-semibold mt-auto"
        >
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            Contactar por WhatsApp
          </a>
        </Button>
      </CardContent>
    </Card>
  )
}
