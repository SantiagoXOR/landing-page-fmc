/**
 * Panel de prueba para verificar que Analytics está funcionando correctamente
 * 
 * Para usar este componente:
 * 1. Importa en cualquier página: import AnalyticsTestPanel from '@/components/analytics/AnalyticsTestPanel'
 * 2. Agrégalo: <AnalyticsTestPanel />
 * 3. Haz clic en los botones para probar los eventos
 * 4. Verifica en las extensiones del navegador que los eventos se envían
 */

'use client'

import { useState } from 'react'
import { useAnalytics } from '@/hooks/useAnalytics'

export default function AnalyticsTestPanel() {
  const [results, setResults] = useState<string[]>([])
  const analytics = useAnalytics()

  const addResult = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setResults(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)])
  }

  const testLeadCreated = () => {
    analytics.trackLeadCreated({
      source: 'test_panel',
      value: 1000,
      leadId: 'test-123',
    })
    addResult('✅ Evento enviado: Lead Created')
  }

  const testPipelineChange = () => {
    analytics.trackPipelineStageChange({
      leadId: 'test-123',
      fromStage: 'nuevo',
      toStage: 'contactado',
      dealValue: 5000,
    })
    addResult('✅ Evento enviado: Pipeline Stage Change')
  }

  const testSearch = () => {
    analytics.trackSearch('test search term', 42)
    addResult('✅ Evento enviado: Search')
  }

  const testLeadViewed = () => {
    analytics.trackLeadViewed({
      leadId: 'test-123',
      leadValue: 2500,
    })
    addResult('✅ Evento enviado: Lead Viewed')
  }

  const testFormSubmit = () => {
    analytics.trackFormSubmit('test_form', true)
    addResult('✅ Evento enviado: Form Submit')
  }

  const testError = () => {
    analytics.trackError({
      error_type: 'test_error',
      error_message: 'This is a test error',
      page: '/test',
    })
    addResult('⚠️ Evento enviado: Error')
  }

  const testConversion = () => {
    analytics.trackConversion('purchase', {
      value: 9999,
      currency: 'ARS',
      transaction_id: 'test-transaction-123',
    })
    addResult('💰 Evento enviado: Purchase Conversion')
  }

  const testCustomEvent = () => {
    analytics.trackCustomEvent('custom_test_event', {
      param1: 'value1',
      param2: 'value2',
      timestamp: Date.now(),
    })
    addResult('🎯 Evento enviado: Custom Event')
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '400px',
      maxHeight: '600px',
      background: 'white',
      border: '2px solid #333',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      zIndex: 9999,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        background: '#333',
        color: 'white',
        padding: '12px 16px',
        borderRadius: '6px 6px 0 0',
        fontWeight: 'bold',
      }}>
        📊 Panel de Prueba de Analytics
      </div>

      <div style={{ padding: '16px' }}>
        <div style={{ marginBottom: '16px', fontSize: '14px', color: '#666' }}>
          <strong>Instrucciones:</strong>
          <ol style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li>Instala las extensiones del navegador</li>
            <li>Haz clic en los botones para probar</li>
            <li>Verifica en las extensiones que los eventos se envían</li>
          </ol>
        </div>

        <div style={{ 
          display: 'grid', 
          gap: '8px',
          marginBottom: '16px'
        }}>
          <button
            onClick={testLeadCreated}
            style={buttonStyle}
          >
            🎯 Test: Lead Created
          </button>

          <button
            onClick={testPipelineChange}
            style={buttonStyle}
          >
            📊 Test: Pipeline Change
          </button>

          <button
            onClick={testSearch}
            style={buttonStyle}
          >
            🔍 Test: Search
          </button>

          <button
            onClick={testLeadViewed}
            style={buttonStyle}
          >
            👁️ Test: Lead Viewed
          </button>

          <button
            onClick={testFormSubmit}
            style={buttonStyle}
          >
            📝 Test: Form Submit
          </button>

          <button
            onClick={testConversion}
            style={buttonStyle}
          >
            💰 Test: Conversion
          </button>

          <button
            onClick={testCustomEvent}
            style={buttonStyle}
          >
            🎨 Test: Custom Event
          </button>

          <button
            onClick={testError}
            style={{ ...buttonStyle, background: '#ef4444' }}
          >
            ⚠️ Test: Error
          </button>
        </div>

        <div style={{
          background: '#f5f5f5',
          padding: '12px',
          borderRadius: '6px',
          maxHeight: '200px',
          overflow: 'auto',
          fontSize: '12px',
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
            📋 Log de Eventos:
          </div>
          {results.length === 0 ? (
            <div style={{ color: '#999', fontStyle: 'italic' }}>
              No hay eventos aún. Haz clic en los botones para probar.
            </div>
          ) : (
            <div>
              {results.map((result, index) => (
                <div key={index} style={{ 
                  marginBottom: '4px',
                  padding: '4px',
                  background: 'white',
                  borderRadius: '4px',
                  fontSize: '11px',
                }}>
                  {result}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ 
          marginTop: '12px', 
          fontSize: '11px', 
          color: '#666',
          textAlign: 'center'
        }}>
          💡 Abre las DevTools (F12) → Console para ver más detalles
        </div>
      </div>
    </div>
  )
}

const buttonStyle: React.CSSProperties = {
  padding: '10px 16px',
  background: '#3b82f6',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: '500',
  transition: 'background 0.2s',
}

