'use client'

import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { MoreHorizontal, Bot, Settings, Plus, Construction } from 'lucide-react'

export default function AsistentesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Asistentes"
        subtitle="Gestiona tus asistentes virtuales de IA para automatizar conversaciones"
        showNewButton={true}
        newButtonText="Crear nuevo"
        newButtonHref="#"
      />

      <div className="p-6">
        {/* Botón de Ajustes */}
        <div className="mb-6 flex justify-end">
          <Button variant="outline" className="text-gray-700">
            <Settings className="h-4 w-4 mr-2" />
            Ajustes y horarios
          </Button>
        </div>

        {/* Tabla de Asistentes */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Asistentes Configurados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Nombre</TableHead>
                  <TableHead className="w-[300px]">Descripción</TableHead>
                  <TableHead className="w-[400px]">Instrucciones</TableHead>
                  <TableHead className="w-[120px]">Predeterminado</TableHead>
                  <TableHead className="w-[80px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">test 3</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-gray-600">test 3</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-gray-600">Sos la asistente virtual del Team Rivas...</p>
                  </TableCell>
                  <TableCell>
                    <Switch disabled />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Team Rivas</p>
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-xs">
                          Activo
                        </Badge>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-gray-600">Asistente para...</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-gray-600">**Script para el Chatbot del Team...</p>
                  </TableCell>
                  <TableCell>
                    <Switch defaultChecked />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Asistente 2</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-gray-600">Team Rivas...</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-gray-600">Objetivo 📌 Parámetros de Respuesta...</p>
                  </TableCell>
                  <TableCell>
                    <Switch disabled />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

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
              La funcionalidad completa de gestión de asistentes virtuales estará disponible próximamente.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-gray-500">
              <li>• Creación y configuración de asistentes IA personalizados</li>
              <li>• Scripts y respuestas automáticas</li>
              <li>• Horarios de funcionamiento y disponibilidad</li>
              <li>• Integración con WhatsApp y otros canales</li>
              <li>• Análisis de rendimiento y conversaciones</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
