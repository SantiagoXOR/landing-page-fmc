
/**
 * Página de prueba para Analytics
 * 
 * Accede a esta página en: http://localhost:3000/analytics-test
 * 
 * Esta página te permite probar que la integración de Google Analytics
 * y Meta Pixel está funcionando correctamente.
 */

'use client'

import { useState, useEffect } from 'react'
import AnalyticsTestPanel from '@/components/analytics/AnalyticsTestPanel'

export default function AnalyticsTestPage() {
  const [gaConfigured, setGaConfigured] = useState(false)
  const [metaConfigured, setMetaConfigured] = useState(false)

  useEffect(() => {
    // Verificar si Google Analytics está configurado
    const checkGA = setInterval(() => {
      if (typeof window !== 'undefined' && (window as any).gtag) {
        setGaConfigured(true)
        clearInterval(checkGA)
      }
    }, 500)

    // Verificar si Meta Pixel está configurado
    const checkMeta = setInterval(() => {
      if (typeof window !== 'undefined' && (window as any).fbq) {
        setMetaConfigured(true)
        clearInterval(checkMeta)
      }
    }, 500)

    return () => {
      clearInterval(checkGA)
      clearInterval(checkMeta)
    }
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 20px',
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 'bold',
          marginBottom: '8px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          📊 Prueba de Analytics
        </h1>
        
        <p style={{ color: '#666', marginBottom: '32px' }}>
          Verifica que la integración de Google Analytics y Meta Pixel esté funcionando correctamente.
        </p>

        {/* Estado de la configuración */}
        <div style={{
          background: '#f8f9fa',
          padding: '24px',
          borderRadius: '12px',
          marginBottom: '32px',
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
            Estado de Configuración
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <StatusItem
              icon="📈"
              label="Google Analytics"
              status={gaConfigured ? 'success' : 'pending'}
              message={gaConfigured ? 'Configurado correctamente' : 'Verificando...'}
            />

            <StatusItem
              icon="📱"
              label="Meta Pixel"
              status={metaConfigured ? 'success' : 'pending'}
              message={metaConfigured ? 'Configurado correctamente' : 'Verificando...'}
            />
          </div>
        </div>

        {/* Extensiones recomendadas */}
        <div style={{
          background: '#eff6ff',
          border: '2px solid #3b82f6',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '32px',
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', color: '#1e40af' }}>
            🔧 Extensiones Recomendadas
          </h3>
          
          <p style={{ color: '#1e40af', marginBottom: '12px', fontSize: '14px' }}>
            Instala estas extensiones de Chrome para verificar que los eventos se están enviando:
          </p>

          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ marginBottom: '8px' }}>
              <a
                href="https://chrome.google.com/webstore/detail/google-analytics-debugger/jnkmfdileelhofjcijamephohjechhna"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#2563eb',
                  textDecoration: 'none',
                  fontWeight: '500',
                  fontSize: '14px',
                }}
              >
                📈 Google Analytics Debugger →
              </a>
            </li>
            <li>
              <a
                href="https://chrome.google.com/webstore/detail/meta-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#2563eb',
                  textDecoration: 'none',
                  fontWeight: '500',
                  fontSize: '14px',
                }}
              >
                📱 Meta Pixel Helper →
              </a>
            </li>
          </ul>
        </div>

        {/* Instrucciones */}
        <div style={{
          background: '#f0fdf4',
          border: '2px solid #22c55e',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '32px',
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', color: '#15803d' }}>
            📝 Cómo Usar Esta Página
          </h3>
          
          <ol style={{ color: '#15803d', marginLeft: '20px', fontSize: '14px', lineHeight: '1.8' }}>
            <li>Asegúrate de tener las extensiones instaladas</li>
            <li>Haz clic en el panel flotante en la esquina inferior derecha</li>
            <li>Prueba los diferentes botones de eventos</li>
            <li>Verifica en las extensiones que los eventos se están enviando</li>
            <li>Abre DevTools (F12) → Console para ver los detalles</li>
          </ol>
        </div>

        {/* Información adicional */}
        <div style={{
          background: '#fef9c3',
          border: '2px solid #eab308',
          padding: '20px',
          borderRadius: '12px',
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', color: '#854d0e' }}>
            💡 Nota Importante
          </h3>
          
          <p style={{ color: '#854d0e', fontSize: '14px', lineHeight: '1.6' }}>
            Si no ves que los servicios estén configurados, verifica que:
          </p>
          
          <ul style={{ color: '#854d0e', marginLeft: '20px', fontSize: '14px', lineHeight: '1.8' }}>
            <li>Hayas configurado las variables de entorno en <code>.env.local</code></li>
            <li>Hayas reiniciado el servidor después de agregar las variables</li>
            <li>Las IDs sean correctas (Google Analytics: G-XXXXX, Meta: solo números)</li>
          </ul>
        </div>
      </div>

      {/* Panel de prueba flotante */}
      <AnalyticsTestPanel />
    </div>
  )
}

function StatusItem({ 
  icon, 
  label, 
  status, 
  message 
}: { 
  icon: string
  label: string
  status: 'success' | 'pending' | 'error'
  message: string 
}) {
  const statusColors = {
    success: { bg: '#dcfce7', text: '#15803d', border: '#22c55e' },
    pending: { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
    error: { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' },
  }

  const colors = statusColors[status]

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px',
      background: colors.bg,
      border: `2px solid ${colors.border}`,
      borderRadius: '8px',
    }}>
      <span style={{ fontSize: '24px' }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 'bold', color: colors.text }}>
          {label}
        </div>
        <div style={{ fontSize: '13px', color: colors.text }}>
          {message}
        </div>
      </div>
      <div>
        {status === 'success' && <span style={{ fontSize: '24px' }}>✅</span>}
        {status === 'pending' && <span style={{ fontSize: '24px' }}>⏳</span>}
        {status === 'error' && <span style={{ fontSize: '24px' }}>❌</span>}
      </div>
    </div>
  )
}

