"use client"

import Image from "next/image"
import { Phone, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { getWhatsAppUrl, WHATSAPP_NUMBER_E164 } from "@/lib/utils"

function formatWhatsAppHuman(e164: string) {
  const local = e164.replace(/^549/, "")
  return `${local.slice(0, 3)} ${local.slice(3, 6)}-${local.slice(6)}`
}

export function Footer() {
  const whatsappHuman = formatWhatsAppHuman(WHATSAPP_NUMBER_E164)

  return (
    <footer className="bg-fmc-purple text-white py-14">
      <div className="container mx-auto px-4">
        {/* Logo centrado y más grande */}
        <div className="mb-10 flex justify-center">
          <Image
            src="/logofmc.svg"
            alt="Formosa Moto Crédito"
            width={240}
            height={72}
            className="h-20 md:h-24 w-auto mx-auto"
            priority
          />
        </div>

        {/* Información y contacto */}
        <div className="space-y-4 max-w-4xl mx-auto">
            <p className="text-white/90 font-acto-regular leading-relaxed">
              Te brindamos la oportunidad de cumplir tu sueño de tener una moto propia a través de créditos rápidos y
              accesibles. Con un proceso simple y personalizado, te ayudamos a dar el primer paso hacia la libertad y
              la aventura. ¡No esperes más, tu moto te está esperando!
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-fmc-blue" />
                <span className="text-lg font-acto-semibold">370 428-5453</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-fmc-green" />
                <a
                  href={getWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-acto-semibold hover:underline"
                  aria-label="Abrir WhatsApp"
                >
                  {whatsappHuman}
                </a>
                <Button
                  asChild
                  className="ml-2 bg-fmc-green hover:bg-fmc-green/90 text-white"
                >
                  <a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer">
                    WhatsApp
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <Separator className="bg-white/20" />

        {/* Legales */}
        <div className="text-center text-sm text-white/70 max-w-4xl mx-auto leading-relaxed pt-8">
          <p className="mb-4 font-acto-regular">
            Los préstamos otorgados por Banco de Formosa S.A. a personas humanas con garantía prendaria en primer grado
            sobre moto vehículos 0 km están sujetos a disponibilidad de stock en las concesionarias y a la aprobación
            del riesgo crediticio. El monto y el plazo del financiamiento dependerán de la capacidad crediticia del
            solicitante, y las tasas de interés serán las vigentes al momento de la aprobación. El préstamo estará
            respaldado por la prenda del vehículo adquirido, que deberá estar asegurado durante el período del
            préstamo. Las promociones están sujetas a condiciones específicas y la disponibilidad de unidades en las
            concesionarias. Además, se aplicarán comisiones, cargos administrativos y otros costos adicionales según
            las políticas del banco, y los pagos deberán realizarse dentro de los plazos establecidos.
          </p>
          <div className="border-t border-white/20 pt-8">
            <p className="font-acto-semibold">Copyright © 2025 FORMOSA MOTO CRÉDITO.</p>
            <p className="mt-2 font-acto-regular">Todos los derechos reservados.</p>
          </div>
        </div>
    </footer>
  )
}

export default Footer