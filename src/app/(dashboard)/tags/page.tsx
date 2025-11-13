'use client'

import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Search, Filter, Tag, Plus, Construction } from 'lucide-react'
import { useState } from 'react'

export default function SmartTagsPage() {
  const [activeFilter, setActiveFilter] = useState("todos")

  const tags = [
    { name: "Interesado Casas Pinamar Norte", count: 0, color: "bg-blue-100 text-blue-800" },
    { name: "Interesada Casas Valeria", count: 6, color: "bg-green-100 text-green-800" },
    { name: "Interesado Mohana", count: 1, color: "bg-red-100 text-red-800" },
    { name: "Interesa", count: 0, color: "bg-purple-100 text-purple-800" }
  ]

  const usersWithoutTags = [
    { name: "Diana", phone: "+54 9 3704 123456", avatar: "D", color: "bg-pink-500" },
    { name: "Margarita Fernanda...", phone: "+54 9 3704 234567", avatar: null, color: "bg-blue-500" },
    { name: "Roberto", phone: "+54 9 3704 345678", avatar: null, color: "bg-green-500" },
    { name: "Dani Echauri", phone: "+54 9 3704 456789", avatar: null, color: "bg-purple-500" },
    { name: "Vanessa Gama", phone: "@vanessa_gama", avatar: null, color: "bg-orange-500" },
    { name: "Ceci Isasa", phone: "+54 9 3704 567890", avatar: null, color: "bg-teal-500" }
  ]

  const usersWithTags = {
    "Interesada Casas Valeria": [
      { name: "CP", phone: "+54 9 3704 111111", avatar: "C", color: "bg-purple-500" },
      { name: "Daniel", phone: "+54 9 3704 222222", avatar: "D", color: "bg-green-500" },
      { name: "Ernesto Oscar Maluf", phone: "+54 9 3704 333333", avatar: null, color: "bg-blue-500" },
      { name: "Marcela", phone: "+54 9 3704 444444", avatar: null, color: "bg-pink-500" },
      { name: "Liliana", phone: "+54 9 3704 555555", avatar: null, color: "bg-yellow-500" }
    ],
    "Interesado Mohana": [
      { name: "Lau", phone: "+54 9 3704 666666", avatar: null, color: "bg-indigo-500" }
    ]
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Smart Tags"
        subtitle="Crea y edita tus Smart Tags para que Prometheo pueda clasificar a tus leads automáticamente"
      />

      <div className="p-6">
        {/* Filtros y búsqueda */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex space-x-1">
              <Button
                variant={activeFilter === "todos" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter("todos")}
                className={activeFilter === "todos" ? "bg-purple-600 text-white" : ""}
              >
                Todos
              </Button>
              {tags.map((tag) => (
                <Button
                  key={tag.name}
                  variant={activeFilter === tag.name ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter(tag.name)}
                  className={activeFilter === tag.name ? "bg-purple-600 text-white" : ""}
                >
                  {tag.name}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar..."
                className="pl-10 w-64"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
            <Button className="gradient-primary text-white">
              <Plus className="h-4 w-4 mr-2" />
              Tags
            </Button>
          </div>
        </div>

        {/* Sección Sin tags */}
        <Card className="bg-white border-gray-200 shadow-sm mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="text-lg font-semibold text-gray-900">Sin tags</span>
              <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                {usersWithoutTags.length} / 936
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {usersWithoutTags.map((user, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar ? undefined : ""} />
                    <AvatarFallback className={`text-white ${user.color}`}>
                      {user.avatar || user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.phone}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Secciones con tags */}
        {Object.entries(usersWithTags).map(([tagName, users]) => {
          const tag = tags.find(t => t.name === tagName)
          return (
            <Card key={tagName} className="bg-white border-gray-200 shadow-sm mb-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Tag className="h-5 w-5 text-purple-600" />
                    <span className="text-lg font-semibold text-gray-900">{tagName}</span>
                  </div>
                  <Badge className={tag?.color || "bg-gray-100 text-gray-600"}>
                    {users.length} / {users.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {users.map((user, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar ? undefined : ""} />
                        <AvatarFallback className={`text-white ${user.color}`}>
                          {user.avatar || user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user.phone}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}

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
              La funcionalidad completa de Smart Tags con clasificación automática de leads estará disponible próximamente.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-gray-500">
              <li>• Clasificación automática de leads con IA</li>
              <li>• Creación y gestión de tags personalizados</li>
              <li>• Análisis de patrones de comportamiento</li>
              <li>• Segmentación inteligente de contactos</li>
              <li>• Integración con el sistema de scoring</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
