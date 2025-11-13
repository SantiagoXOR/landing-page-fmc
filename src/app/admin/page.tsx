'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

interface UpdateResult {
  success: boolean;
  message: string;
  estadisticas?: {
    totalLeads: number;
    leadsActualizados: number;
    leadsConNombreGenericoRestantes: number;
  };
  ejemplos?: Array<{
    id: string;
    nombreAnterior: string;
    nombreNuevo: string;
    cambios: string[];
  }>;
  error?: string;
  details?: string;
}

export default function AdminPage() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [result, setResult] = useState<UpdateResult | null>(null);

  const handleUpdateNames = async () => {
    setIsUpdating(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/update-names', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: 'Error de conexión',
        error: 'Error de conexión',
        details: error instanceof Error ? error.message : 'Error desconocido'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Panel de Administración</h1>
        <p className="text-gray-600">Herramientas para gestionar y mejorar los datos del CRM</p>
      </div>

      <div className="grid gap-6">
        {/* Actualizar Nombres */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Actualizar Nombres y Datos
            </CardTitle>
            <CardDescription>
              Mejora los datos de los leads reemplazando nombres genéricos por nombres argentinos realistas
              y completando información faltante como teléfonos, zonas e ingresos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Button 
                onClick={handleUpdateNames}
                disabled={isUpdating}
                className="flex items-center gap-2"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Actualizar Datos
                  </>
                )}
              </Button>
              
              {isUpdating && (
                <div className="text-sm text-gray-600">
                  Este proceso puede tomar varios minutos...
                </div>
              )}
            </div>

            {/* Resultados */}
            {result && (
              <div className="mt-6 space-y-4">
                <Alert className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <AlertDescription className={result.success ? 'text-green-800' : 'text-red-800'}>
                      {result.message || result.error}
                      {result.details && (
                        <div className="mt-1 text-sm opacity-75">
                          {result.details}
                        </div>
                      )}
                    </AlertDescription>
                  </div>
                </Alert>

                {/* Estadísticas */}
                {result.success && result.estadisticas && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Estadísticas de Actualización</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {result.estadisticas.totalLeads}
                          </div>
                          <div className="text-sm text-blue-800">Total de Leads</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {result.estadisticas.leadsActualizados}
                          </div>
                          <div className="text-sm text-green-800">Leads Actualizados</div>
                        </div>
                        <div className="text-center p-4 bg-orange-50 rounded-lg">
                          <div className="text-2xl font-bold text-orange-600">
                            {result.estadisticas.leadsConNombreGenericoRestantes}
                          </div>
                          <div className="text-sm text-orange-800">Nombres Genéricos Restantes</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Ejemplos */}
                {result.success && result.ejemplos && result.ejemplos.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Ejemplos de Actualizaciones</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {result.ejemplos.map((ejemplo, index) => (
                          <div key={ejemplo.id} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">
                                  <span className="text-red-600 line-through">{ejemplo.nombreAnterior}</span>
                                  {' → '}
                                  <span className="text-green-600">{ejemplo.nombreNuevo}</span>
                                </div>
                                <div className="text-sm text-gray-600">
                                  Cambios: {ejemplo.cambios.join(', ')}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Información adicional */}
        <Card>
          <CardHeader>
            <CardTitle>Información</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• Esta herramienta actualiza leads con nombres genéricos (&quot;Nombre&quot;) por nombres argentinos realistas</p>
              <p>• Completa teléfonos incompletos con números de Formosa</p>
              <p>• Asigna zonas aleatorias de Formosa a leads sin zona</p>
              <p>• Genera ingresos realistas para leads sin esta información</p>
              <p>• El proceso es seguro y solo actualiza datos incompletos o genéricos</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
