import React from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface FMCLogoProps {
  variant?: 'full' | 'compact' | 'icon'
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function FMCLogo({ 
  variant = 'full', 
  className,
  size = 'md' 
}: FMCLogoProps) {
  const sizeClasses = {
    sm: 'h-20 w-20',
    md: 'h-24 w-24',
    lg: 'h-40 w-40'
  }

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl'
  }

  if (variant === 'icon') {
    return (
      <div className={cn(
        'flex items-center justify-center',
        sizeClasses[size],
        className
      )}>
        <Image
          src="/logofmc.svg"
          alt="FMC Logo"
          width={size === 'sm' ? 64 : size === 'md' ? 80 : 160}
          height={size === 'sm' ? 64 : size === 'md' ? 80 : 160}
        />
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <div className={cn(
          'flex items-center justify-center',
          sizeClasses[size]
        )}>
          <Image
            src="/logofmc.svg"
            alt="FMC Logo"
          width={size === 'sm' ? 64 : size === 'md' ? 80 : 160}
          height={size === 'sm' ? 64 : size === 'md' ? 80 : 160}
          />
        </div>
        <div>
          <h1 className={cn('font-bold text-white', textSizes[size])}>
            FMC
          </h1>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex items-center space-x-3', className)}>
      <div className={cn(
        'flex items-center justify-center',
        sizeClasses[size]
      )}>
        <Image
          src="/logofmc.svg"
          alt="FMC Logo"
          width={size === 'sm' ? 64 : size === 'md' ? 80 : 160}
          height={size === 'sm' ? 64 : size === 'md' ? 80 : 160}
        />
      </div>
      <div>
        <h1 className={cn('font-bold text-white', textSizes[size])}>
          FMC
        </h1>
        <p className={cn('text-xs text-gray-300', size === 'sm' ? 'text-xs' : 'text-sm')}>
          FORMOSA MOTO CREDITO
        </p>
      </div>
    </div>
  )
}
