'use client'

import { useEffect, useState } from 'react'
import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'
import { logger } from '@/lib/logger'

export default function ApiDocsPage() {
  const [spec, setSpec] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSpec = async () => {
      try {
        const response = await fetch('/api/docs/swagger.json')
        if (!response.ok) {
          throw new Error('Failed to fetch API specification')
        }
        const swaggerSpec = await response.json()
        setSpec(swaggerSpec)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchSpec()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando documentación de la API...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-blue-600 text-white py-6">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold">Phorencial CRM API</h1>
          <p className="text-blue-100 mt-2">
            Documentación interactiva de la API del sistema CRM
          </p>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        {spec && (
          <SwaggerUI 
            spec={spec}
            docExpansion="list"
            defaultModelsExpandDepth={2}
            defaultModelExpandDepth={2}
            tryItOutEnabled={true}
            filter={true}
            requestInterceptor={(request) => {
              // Add authentication header if available
              const token = localStorage.getItem('auth-token')
              if (token) {
                request.headers.Authorization = `Bearer ${token}`
              }
              return request
            }}
            onComplete={(system) => {
              logger.info('Swagger UI loaded successfully', system)
            }}
          />
        )}
      </div>
    </div>
  )
}