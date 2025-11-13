'use client'

import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sparkles, Send, Construction, Bot, FileText } from 'lucide-react'
import { useState } from 'react'

export default function TestingPage() {
  const [activeTab, setActiveTab] = useState("crear")

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Testing"
        subtitle="Crea y testea tus asistentes virtuales de IA"
      />

      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-between items-center mb-6">
            <TabsList className="grid w-[400px] grid-cols-2">
              <TabsTrigger value="crear">Crear nuevo asistente</TabsTrigger>
              <TabsTrigger value="testear">Testear</TabsTrigger>
            </TabsList>
            
            <Button className="gradient-primary text-white">
              <Sparkles className="h-4 w-4 mr-2" />
              Crear con IA
            </Button>
          </div>

          <TabsContent value="crear" className="space-y-6">
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Configuración del Asistente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input
                    id="nombre"
                    placeholder="Nombre del asistente"
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea
                    id="descripcion"
                    placeholder="Descripción del asistente"
                    className="w-full min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instrucciones">Instrucciones</Label>
                  <div className="relative">
                    <Textarea
                      id="instrucciones"
                      placeholder="Instrucciones detalladas para el asistente"
                      className="w-full min-h-[150px] pr-10"
                    />
                    <div className="absolute bottom-2 right-2 flex space-x-2">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <FileText className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    '/' para mencionar los archivos
                  </p>
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" className="text-gray-700">
                    Revertir cambios
                  </Button>
                  <Button className="gradient-primary text-white">
                    Crear
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="testear" className="space-y-6">
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Área de Testing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4 min-h-[300px] border">
                    <div className="flex items-center space-x-2 mb-4">
                      <Bot className="h-5 w-5 text-purple-600" />
                      <span className="font-medium text-gray-900">Asistente Virtual</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-end">
                        <div className="bg-purple-100 text-purple-800 px-3 py-2 rounded-lg max-w-[80%]">
                          <p className="text-sm">¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?</p>
                        </div>
                      </div>
                      <div className="flex justify-start">
                        <div className="bg-gray-100 text-gray-800 px-3 py-2 rounded-lg max-w-[80%]">
                          <p className="text-sm">Hola, necesito información sobre los productos</p>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <div className="bg-purple-100 text-purple-800 px-3 py-2 rounded-lg max-w-[80%]">
                          <p className="text-sm">Perfecto, te puedo ayudar con información sobre nuestros productos. ¿Hay algún producto específico que te interese?</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Input
                      placeholder="Escribe un mensaje..."
                      className="flex-1"
                    />
                    <Button className="gradient-primary text-white">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Mensaje de Próximamente */}
        <Card className="max-w-2xl mx-auto mt-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Construction className="h-6 w-6 text-purple-600" />
              <span>Próximamente</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              La funcionalidad completa de testing de asistentes IA estará disponible próximamente.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-gray-500">
              <li>• Testing en tiempo real con diferentes escenarios</li>
              <li>• Análisis de respuestas y calidad de conversación</li>
              <li>• Métricas de rendimiento del asistente</li>
              <li>• Integración con diferentes canales de comunicación</li>
              <li>• Aprendizaje automático basado en interacciones</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
