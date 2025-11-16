'use client'

import { Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { FMCLogo } from '@/components/branding/FMCLogo'

function SignInForm() {
  // Ya no hay formulario ni estados de email/contraseña; solo Google
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('from') || '/dashboard'
  const error = searchParams.get('error')
  
  // Mensajes de error según el tipo
  const getErrorMessage = () => {
    switch (error) {
      case 'AccessDenied':
        return 'Tu cuenta no está autorizada para acceder al sistema. Si ya solicitaste acceso, tu solicitud está pendiente de aprobación por un administrador. Por favor, contacta al administrador para más información.'
      case 'Configuration':
        return 'Error de configuración. Por favor, contacta al administrador.'
      case 'Verification':
        return 'Error de verificación. Por favor, intenta nuevamente.'
      default:
        if (error) {
          return 'Ocurrió un error al iniciar sesión. Por favor, intenta nuevamente.'
        }
        return null
    }
  }
  
  const errorMessage = getErrorMessage()

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-neutral-900/90 bg-gradient-to-br from-purple-900/40 via-neutral-900 to-indigo-900/40 px-4 py-10">
      <div className="w-full max-w-5xl rounded-2xl shadow-2xl ring-1 ring-white/10 overflow-hidden bg-neutral-900/60 backdrop-blur md:min-h-[600px] lg:min-h-[680px]">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Columna izquierda: imagen con overlay y logo */}
          <div className="relative block h-72 sm:h-96 lg:h-[680px]">
            <Image
              src="/landing/hero/bg5.png"
              alt="Formosa Moto Crédito"
              fill
              priority
              sizes="(max-width: 1024px) 0px, 50vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/70 via-neutral-900/20 to-neutral-900/40" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white/70 backdrop-blur-md rounded-xl p-4 sm:p-5 shadow-lg ring-1 ring-white/60">
                <FMCLogo variant="icon" size="lg" />
              </div>
            </div>
            <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 right-4 sm:right-6">
              <p className="text-white/90 text-lg font-medium drop-shadow">
                Capturando oportunidades, gestionando resultados
              </p>
            </div>
          </div>

          {/* Columna derecha: contenido del login */}
          <div className="p-6 md:p-10 flex items-center justify-center">
            <div className="w-full max-w-md">
              <div className="mb-6 text-left">
                <h1 className="text-white text-3xl md:text-4xl font-extrabold tracking-tight">
                  Accede a tu cuenta
                </h1>
                <p className="text-white/70 mt-2">
                  CRM PHRONENCIAL · Gestión de leads de Formosa
                </p>
                
                {/* Mensaje de error si existe */}
                {errorMessage && (
                  <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                    <p className="text-red-200 text-sm">{errorMessage}</p>
                  </div>
                )}
              </div>

              {/* Botón único de Google */}
              <Button
                type="button"
                aria-label="Iniciar sesión con Google"
                className="w-full bg-white text-neutral-900 hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-purple-500 focus-visible:ring-offset-neutral-900 h-11 shadow-md"
                onClick={() => signIn('google', { callbackUrl })}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Iniciar sesión con Google
              </Button>

              <div className="mt-4 text-center">
                <a
                  href="/"
                  className="text-white/70 hover:text-white underline underline-offset-4 transition-colors"
                >
                  Volver al sitio
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SignIn() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Cargando...</div>}>
      <SignInForm />
    </Suspense>
  )
}
