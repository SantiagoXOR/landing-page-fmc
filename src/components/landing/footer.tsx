"use client"

import Image from "next/image"
import { Phone, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { getWhatsAppUrl, WHATSAPP_NUMBER_E164 } from "@/lib/utils"

function formatWhatsAppHuman(e164: string) {
  const local = e164.replace(/^549/, "")
  return `${local.slice(0, 3)} ${local.slice(3, 6)}-${local.slice(6)}`
}

export function Footer() {
  const whatsappHuman = formatWhatsAppHuman(WHATSAPP_NUMBER_E164)

  return (
    <footer className="bg-fmc-purple text-white py-12" data-aos="fade-up">
      <div className="container mx-auto px-6 sm:px-8">
        {/* Logo + texto con fuente ACTO para consistencia */}
        <div className="mb-8 flex items-center justify-center gap-3" data-aos="fade-down">
          <Image
            src="/landing/logofmcsimple.svg"
            alt="FMC"
            width={40}
            height={40}
            className="h-10 w-10 md:h-12 md:w-12 will-change-transform motion-safe:transition-transform motion-safe:duration-300 hover:scale-[1.03]"
            priority
          />
          <span className="font-acto-bold tracking-wide text-lg md:text-xl">
            FORMOSA MOTO CRÉDITO
          </span>
        </div>

        {/* Información y contacto */}
        <div className="space-y-4 max-w-4xl mx-auto" data-aos="fade-up" data-aos-delay="100">
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
                  className="text-lg font-acto-semibold hover:underline motion-safe:transition-transform motion-safe:duration-200 hover:-translate-y-[1px]"
                  aria-label="Abrir WhatsApp"
                >
                  {whatsappHuman}
                </a>
                <Button
                  asChild
                  className="ml-2 bg-fmc-green hover:bg-fmc-green/90 text-white will-change-transform motion-safe:transition-transform motion-safe:duration-200 hover:-translate-y-[1px] active:scale-[0.98]"
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
        <div className="text-center text-sm text-white/70 max-w-4xl mx-auto leading-relaxed pt-8 px-6 sm:px-8" data-aos="fade-up" data-aos-delay="150">
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
            {/* Atribución del desarrollador (estilo Built by con Badge) */}
            <div className="mt-6 flex justify-center opacity-100">
              <Badge
                variant="outline"
                className="text-white/85 border-white/25 bg-white/5 will-change-transform motion-safe:transition-transform motion-safe:duration-200 hover:-translate-y-[1px] active:scale-[0.98]"
              >
                <Image
                  src="/landing/xor.svg"
                  alt="XOR"
                  width={24}
                  height={24}
                  className="h-6 w-6 md:h-6 md:w-6 will-change-transform motion-safe:transition-transform motion-safe:duration-200 hover:scale-[1.03] active:scale-[0.98]"
                  priority
                />
                <span className="font-acto-regular">Built by XOR</span>
              </Badge>
            </div>
          </div>
        </div>
    </footer>
  )
}

export default Footer