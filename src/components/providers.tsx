'use client'

import { SessionProvider } from 'next-auth/react'
import { ToastProvider } from '@/components/ui/toast'
import { TRPCProvider } from '@/components/trpc-provider'
import { NotificationProvider } from '@/providers/NotificationProvider'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <TRPCProvider>
        <ToastProvider>
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </ToastProvider>
      </TRPCProvider>
    </SessionProvider>
  )
}

export default Providers
