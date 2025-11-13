# 🚀 Prompt Completo para v0.dev - CRM Phorencial Frontend

## 📋 Descripción General

Crear un sistema CRM completo para gestión de leads de Phorencial, empresa financiera argentina especializada en préstamos y productos financieros en la provincia de Formosa.

## 🛠 Stack Tecnológico Requerido

- **Framework**: Next.js 14+ con App Router
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS
- **Componentes UI**: shadcn/ui (estilo "new-york")
- **Gráficos**: Recharts
- **Iconos**: Lucide React
- **Autenticación**: NextAuth.js
- **Base de datos**: Supabase (PostgreSQL)
- **Validación**: Zod

## 🏗 Estructura de Páginas Principales

### 1. Dashboard Principal (`/dashboard`)

- **Métricas KPI**: Total leads, nuevos hoy, tasa conversión, ingresos proyectados
- **Gráficos interactivos**: Tendencias mensuales, distribución por estado, top zonas
- **Lista de leads recientes** con acciones rápidas
- **Navegación responsive** con sidebar colapsible

### 2. Gestión de Leads (`/leads`)

- **Sistema de filtros avanzado** por estado, origen, zona, búsqueda
- **Tabla responsive** con paginación y ordenamiento
- **Contadores dinámicos exactos** (ej: "Leads (35)(filtrado por estado: RECHAZADO)")
- **Exportación CSV** con filtros aplicados
- **Vista detallada** de cada lead con historial de eventos

### 3. Reportes (`/reports`)

- **Estadísticas por período** con filtros de fecha
- **Gráficos de rendimiento** por vendedor y zona
- **Análisis de conversión** por origen y producto
- **Exportación de reportes** en múltiples formatos

### 4. Administración (`/admin`)

- **Gestión de usuarios** y roles (ADMIN, ANALISTA, VENDEDOR)
- **Configuración de reglas** de scoring automático
- **Importación masiva** de leads desde Excel
- **Logs de auditoría** y eventos del sistema

## 📊 Tipos TypeScript Principales

```typescript
interface Lead {
  id: string;
  nombre: string;
  telefono: string;
  email?: string | null;
  dni?: string | null;
  ingresos?: number | null;
  zona?: string | null;
  producto?: string | null;
  monto?: number | null;
  origen?: string | null;
  utmSource?: string | null;
  estado:
    | "NUEVO"
    | "EN_REVISION"
    | "PREAPROBADO"
    | "RECHAZADO"
    | "DOC_PENDIENTE"
    | "DERIVADO";
  agencia?: string | null;
  notas?: string | null;
  createdAt: string;
  updatedAt: string;
  events?: Event[];
}

interface Event {
  id: string;
  leadId?: string;
  tipo: string;
  payload?: any;
  createdAt: string;
}

interface User {
  id: string;
  nombre: string;
  email: string;
  rol: "ADMIN" | "ANALISTA" | "VENDEDOR";
  createdAt: string;
}
```

## 🎨 Sistema de Diseño

### Configuración shadcn/ui

```json
{
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  }
}
```

### Componentes UI Requeridos

- `button`, `card`, `input`, `label`, `badge`, `table`
- `dialog`, `form`, `select`, `calendar`, `sheet`
- `tooltip`, `progress`, `skeleton`, `alert`

### Paleta de Colores para Estados

- **NUEVO**: `default` (azul)
- **EN_REVISION**: `secondary` (gris)
- **PREAPROBADO**: `default` (verde)
- **RECHAZADO**: `destructive` (rojo)
- **DOC_PENDIENTE**: `outline` (borde)
- **DERIVADO**: `secondary` (gris)

## 🗺 Datos Específicos de Formosa

### Zonas Geográficas

```typescript
const ZONAS_FORMOSA = [
  "Formosa Capital",
  "Clorinda",
  "Pirané",
  "El Colorado",
  "Las Lomitas",
  "Ingeniero Juárez",
  "Ibarreta",
  "Comandante Fontana",
  "Villa Dos Trece",
  "General Güemes",
  "Laguna Blanca",
  "Pozo del Mortero",
  "Estanislao del Campo",
  "Villa del Rosario",
  "Namqom",
  "La Nueva Formosa",
  "Solidaridad",
  "San Antonio",
  "Obrero",
  "GUEMES",
];
```

### Códigos de Área Locales

- `+543704` (Formosa Capital)
- `+543705` (Clorinda)
- `+543711` (Interior)
- `+543718` (Zonas rurales)

### Rangos de Ingresos (ARS)

- Mínimo: $69.400.000
- Máximo: $215.400.000
- Distribución realista con mayoría en rango medio

## 🔧 Funcionalidades Clave

### Sistema de Filtros con Contadores Dinámicos

```typescript
// Implementación de filtrado en memoria para garantizar exactitud
const filteredLeads = allLeads.filter((lead) => {
  if (estadoFilter && lead.estado !== estadoFilter) return false;
  if (
    searchFilter &&
    !lead.nombre.toLowerCase().includes(searchFilter.toLowerCase())
  )
    return false;
  return true;
});

// Contador dinámico con indicador visual
const displayTitle = `Leads (${filteredLeads.length})${
  estadoFilter ? `(filtrado por estado: ${estadoFilter})` : ""
}`;
```

### Tabla Responsive con Acciones

- **Columnas**: Nombre, Teléfono, Estado, Zona, Ingresos, Fecha, Acciones
- **Ordenamiento** por cualquier columna
- **Paginación** con límites configurables
- **Acciones rápidas**: Ver, Editar, Cambiar estado, Eliminar

### Formularios de Gestión

- **Validación en tiempo real** con Zod
- **Campos condicionales** según tipo de producto
- **Autocompletado** para zonas y productos
- **Formateo automático** de teléfonos y montos

## 📱 Responsive Design

### Breakpoints

- **Mobile**: < 768px (stack vertical, sidebar oculto)
- **Tablet**: 768px - 1024px (grid 2 columnas)
- **Desktop**: > 1024px (grid completo, sidebar fijo)

### Navegación Móvil

- **Hamburger menu** para sidebar
- **Bottom navigation** para acciones principales
- **Swipe gestures** para cambiar entre secciones

## 🔌 Integración con API

### Endpoints Principales

```typescript
// GET /api/leads - Listar con filtros
const fetchLeads = async (filters: LeadFilters) => {
  const params = new URLSearchParams({
    page: filters.page.toString(),
    limit: filters.limit.toString(),
    ...(filters.estado && { estado: filters.estado }),
    ...(filters.search && { q: filters.search }),
  });

  const response = await fetch(`/api/leads?${params}`);
  return response.json();
};

// POST /api/leads - Crear/actualizar
const createLead = async (leadData: Partial<Lead>) => {
  const response = await fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(leadData),
  });
  return response.json();
};
```

### Manejo de Estados

- **Loading states** con skeletons
- **Error boundaries** con retry automático
- **Optimistic updates** para mejor UX
- **Cache invalidation** inteligente

## 🎯 Ejemplos de Datos Reales

### Lead de Ejemplo

```typescript
const sampleLead: Lead = {
  id: "lead_001",
  nombre: "Karen Vanina Paliza",
  telefono: "+543704861647",
  email: "karen.vanina@email.com",
  dni: "17968421",
  ingresos: 134000000, // $134.000.000 ARS
  zona: "Formosa Capital",
  producto: "Moto 110cc",
  monto: 50000000, // $50.000.000 ARS
  origen: "excel",
  estado: "PREAPROBADO",
  agencia: "Rio Bermejo",
  notas: "Trabajo: Empleada Provincial. BDF: Sí",
  createdAt: "2024-01-15T10:30:00Z",
  updatedAt: "2024-01-16T14:20:00Z",
};
```

### Distribución de Estados

- **NUEVO**: 60% (mayoría de leads)
- **RECHAZADO**: 35 leads exactos
- **PREAPROBADO**: 7 leads exactos
- **EN_REVISION**: 15%
- **DOC_PENDIENTE**: 8%
- **DERIVADO**: 2%

## 🚀 Instrucciones Específicas para v0.dev

1. **Crear la estructura base** con Next.js 14 y TypeScript
2. **Configurar shadcn/ui** con el estilo "new-york"
3. **Implementar el dashboard principal** con métricas y gráficos
4. **Desarrollar la gestión de leads** con filtros y tabla
5. **Agregar formularios** de creación/edición con validación
6. **Incluir datos de ejemplo** realistas de Formosa
7. **Asegurar responsive design** en todos los componentes
8. **Implementar navegación** con sidebar y breadcrumbs

### Prioridades de Desarrollo

1. **Dashboard con métricas básicas**
2. **Lista de leads con filtros**
3. **Formulario de creación de leads**
4. **Vista detallada de lead**
5. **Sistema de reportes**
6. **Panel de administración**

## 💻 Ejemplos de Código Clave

### Dashboard Principal - Métricas KPI

```tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, DollarSign, Target } from "lucide-react";

interface DashboardMetrics {
  totalLeads: number;
  leadsThisMonth: number;
  conversionRate: number;
  projectedRevenue: number;
  leadsByStatus: Record<string, number>;
}

export function DashboardMetrics({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalLeads}</div>
          <p className="text-xs text-muted-foreground">
            {metrics.leadsThisMonth} este mes
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tasa Conversión</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.conversionRate}%</div>
          <p className="text-xs text-muted-foreground">+2.1% vs mes anterior</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Ingresos Proyectados
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${(metrics.projectedRevenue / 1000000).toFixed(1)}M
          </div>
          <p className="text-xs text-muted-foreground">
            ARS {metrics.projectedRevenue.toLocaleString()}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Estados</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(metrics.leadsByStatus).map(([estado, count]) => (
              <div key={estado} className="flex items-center justify-between">
                <Badge
                  variant={
                    estado === "PREAPROBADO"
                      ? "default"
                      : estado === "RECHAZADO"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {estado}
                </Badge>
                <span className="text-sm font-medium">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Sistema de Filtros con Contadores Dinámicos

```tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

interface LeadFilters {
  search: string;
  estado: string;
  origen: string;
}

interface FilteredLeadsProps {
  leads: Lead[];
  onFiltersChange: (filters: LeadFilters) => void;
}

export function LeadFilters({ leads, onFiltersChange }: FilteredLeadsProps) {
  const [filters, setFilters] = useState<LeadFilters>({
    search: "",
    estado: "",
    origen: "",
  });

  // Filtrado en memoria para contadores exactos
  const filteredLeads = leads.filter((lead) => {
    if (filters.estado && lead.estado !== filters.estado) return false;
    if (filters.origen && lead.origen !== filters.origen) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        lead.nombre.toLowerCase().includes(searchLower) ||
        lead.telefono.includes(filters.search) ||
        lead.email?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  // Contadores por estado
  const estadoCounts = leads.reduce((acc, lead) => {
    acc[lead.estado] = (acc[lead.estado] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const updateFilter = (key: keyof LeadFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar leads..."
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtro por Estado */}
          <select
            value={filters.estado}
            onChange={(e) => updateFilter("estado", e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Todos los estados</option>
            <option value="NUEVO">Nuevo ({estadoCounts.NUEVO || 0})</option>
            <option value="EN_REVISION">
              En Revisión ({estadoCounts.EN_REVISION || 0})
            </option>
            <option value="PREAPROBADO">
              Preaprobado ({estadoCounts.PREAPROBADO || 0})
            </option>
            <option value="RECHAZADO">
              Rechazado ({estadoCounts.RECHAZADO || 0})
            </option>
            <option value="DOC_PENDIENTE">
              Doc. Pendiente ({estadoCounts.DOC_PENDIENTE || 0})
            </option>
            <option value="DERIVADO">
              Derivado ({estadoCounts.DERIVADO || 0})
            </option>
          </select>

          {/* Filtro por Origen */}
          <select
            value={filters.origen}
            onChange={(e) => updateFilter("origen", e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Todos los orígenes</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="web">Web</option>
            <option value="excel">Excel</option>
          </select>

          {/* Contador dinámico */}
          <div className="flex items-center space-x-2">
            <Badge variant="outline">
              Leads ({filteredLeads.length})
              {filters.estado && ` (filtrado por estado: ${filters.estado})`}
              {filters.search && ` (búsqueda: "${filters.search}")`}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Tabla de Leads Responsive

```tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, Edit, Trash2, Phone } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface LeadsTableProps {
  leads: Lead[];
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function LeadsTable({
  leads,
  onView,
  onEdit,
  onDelete,
}: LeadsTableProps) {
  const getEstadoBadge = (estado: string) => {
    const variants = {
      NUEVO: "default",
      EN_REVISION: "secondary",
      PREAPROBADO: "default",
      RECHAZADO: "destructive",
      DOC_PENDIENTE: "outline",
      DERIVADO: "secondary",
    } as const;

    return (
      <Badge variant={variants[estado as keyof typeof variants] || "default"}>
        {estado}
      </Badge>
    );
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Teléfono</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Zona</TableHead>
            <TableHead>Ingresos</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.id}>
              <TableCell className="font-medium">
                <div>
                  <div className="font-semibold">{lead.nombre}</div>
                  {lead.email && (
                    <div className="text-sm text-muted-foreground">
                      {lead.email}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-sm">{lead.telefono}</span>
                </div>
              </TableCell>
              <TableCell>{getEstadoBadge(lead.estado)}</TableCell>
              <TableCell>
                <span className="text-sm">
                  {lead.zona || "No especificada"}
                </span>
              </TableCell>
              <TableCell>
                {lead.ingresos ? (
                  <div>
                    <div className="font-semibold">
                      {formatCurrency(lead.ingresos)}
                    </div>
                    <div className="text-xs text-muted-foreground">ARS</div>
                  </div>
                ) : (
                  <span className="text-muted-foreground">No especificado</span>
                )}
              </TableCell>
              <TableCell>
                <div className="text-sm">{formatDate(lead.createdAt)}</div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onView(lead.id)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(lead.id)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(lead.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

### Formulario de Creación de Lead

```tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Save, X } from "lucide-react";

const ZONAS_FORMOSA = [
  "Formosa Capital",
  "Clorinda",
  "Pirané",
  "El Colorado",
  "Las Lomitas",
  "Ingeniero Juárez",
  "Ibarreta",
  "Comandante Fontana",
  "Villa Dos Trece",
  "General Güemes",
  "Laguna Blanca",
  "Pozo del Mortero",
  "Estanislao del Campo",
  "Villa del Rosario",
  "Namqom",
  "La Nueva Formosa",
  "Solidaridad",
  "San Antonio",
  "Obrero",
  "GUEMES",
];

const PRODUCTOS = [
  "Moto 110cc",
  "Moto 150cc",
  "Préstamo Personal",
  "Tarjeta de Crédito",
  "Refinanciación",
];

interface LeadFormProps {
  onSubmit: (leadData: Partial<Lead>) => void;
  onCancel: () => void;
  initialData?: Partial<Lead>;
}

export function LeadForm({ onSubmit, onCancel, initialData }: LeadFormProps) {
  const [formData, setFormData] = useState({
    nombre: initialData?.nombre || "",
    telefono: initialData?.telefono || "",
    email: initialData?.email || "",
    dni: initialData?.dni || "",
    ingresos: initialData?.ingresos?.toString() || "",
    zona: initialData?.zona || "",
    producto: initialData?.producto || "",
    monto: initialData?.monto?.toString() || "",
    origen: initialData?.origen || "web",
    estado: initialData?.estado || "NUEVO",
    notas: initialData?.notas || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = "El nombre es requerido";
    }

    if (!formData.telefono.trim()) {
      newErrors.telefono = "El teléfono es requerido";
    } else if (!/^\+54\d{10}$/.test(formData.telefono)) {
      newErrors.telefono = "Formato: +54XXXXXXXXXX";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email inválido";
    }

    if (formData.ingresos && isNaN(Number(formData.ingresos))) {
      newErrors.ingresos = "Debe ser un número";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const leadData = {
      ...formData,
      ingresos: formData.ingresos ? Number(formData.ingresos) : null,
      monto: formData.monto ? Number(formData.monto) : null,
    };

    onSubmit(leadData);
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {initialData ? "Editar Lead" : "Crear Nuevo Lead"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información Personal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre Completo *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => updateField("nombre", e.target.value)}
                placeholder="Juan Carlos Pérez"
                className={errors.nombre ? "border-red-500" : ""}
              />
              {errors.nombre && (
                <p className="text-sm text-red-500">{errors.nombre}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono *</Label>
              <Input
                id="telefono"
                value={formData.telefono}
                onChange={(e) => updateField("telefono", e.target.value)}
                placeholder="+543704123456"
                className={errors.telefono ? "border-red-500" : ""}
              />
              {errors.telefono && (
                <p className="text-sm text-red-500">{errors.telefono}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="juan.perez@email.com"
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dni">DNI</Label>
              <Input
                id="dni"
                value={formData.dni}
                onChange={(e) => updateField("dni", e.target.value)}
                placeholder="12345678"
              />
            </div>
          </div>

          {/* Información Financiera */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ingresos">Ingresos Mensuales (ARS)</Label>
              <Input
                id="ingresos"
                type="number"
                value={formData.ingresos}
                onChange={(e) => updateField("ingresos", e.target.value)}
                placeholder="150000000"
                className={errors.ingresos ? "border-red-500" : ""}
              />
              {errors.ingresos && (
                <p className="text-sm text-red-500">{errors.ingresos}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="monto">Monto Solicitado (ARS)</Label>
              <Input
                id="monto"
                type="number"
                value={formData.monto}
                onChange={(e) => updateField("monto", e.target.value)}
                placeholder="50000000"
              />
            </div>
          </div>

          {/* Ubicación y Producto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="zona">Zona</Label>
              <select
                id="zona"
                value={formData.zona}
                onChange={(e) => updateField("zona", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Seleccionar zona</option>
                {ZONAS_FORMOSA.map((zona) => (
                  <option key={zona} value={zona}>
                    {zona}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="producto">Producto</Label>
              <select
                id="producto"
                value={formData.producto}
                onChange={(e) => updateField("producto", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Seleccionar producto</option>
                {PRODUCTOS.map((producto) => (
                  <option key={producto} value={producto}>
                    {producto}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Estado y Origen */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <select
                id="estado"
                value={formData.estado}
                onChange={(e) => updateField("estado", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="NUEVO">Nuevo</option>
                <option value="EN_REVISION">En Revisión</option>
                <option value="PREAPROBADO">Preaprobado</option>
                <option value="RECHAZADO">Rechazado</option>
                <option value="DOC_PENDIENTE">Doc. Pendiente</option>
                <option value="DERIVADO">Derivado</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="origen">Origen</Label>
              <select
                id="origen"
                value={formData.origen}
                onChange={(e) => updateField("origen", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="web">Web</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="excel">Excel</option>
              </select>
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              value={formData.notas}
              onChange={(e) => updateField("notas", e.target.value)}
              placeholder="Información adicional sobre el lead..."
              rows={3}
            />
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-end space-x-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit">
              <Save className="h-4 w-4 mr-2" />
              {initialData ? "Actualizar" : "Crear"} Lead
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
```

## 🔧 Configuración de Utilidades

### Funciones de Formateo

```typescript
// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

export function formatPhone(phone: string): string {
  // Formatear teléfono argentino: +54 370 4123456 -> +54 370 412-3456
  if (phone.startsWith("+54")) {
    const number = phone.slice(3);
    if (number.length === 10) {
      return `+54 ${number.slice(0, 3)} ${number.slice(3, 6)}-${number.slice(
        6
      )}`;
    }
  }
  return phone;
}
```

### Validaciones Zod

```typescript
// lib/validators.ts
import { z } from "zod";

export const LeadCreateSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  telefono: z.string().regex(/^\+54\d{10}$/, "Formato de teléfono inválido"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  dni: z.string().optional(),
  ingresos: z.number().positive().optional(),
  zona: z.string().optional(),
  producto: z.string().optional(),
  monto: z.number().positive().optional(),
  origen: z
    .enum(["whatsapp", "instagram", "facebook", "web", "excel"])
    .optional(),
  estado: z
    .enum([
      "NUEVO",
      "EN_REVISION",
      "PREAPROBADO",
      "RECHAZADO",
      "DOC_PENDIENTE",
      "DERIVADO",
    ])
    .default("NUEVO"),
  agencia: z.string().optional(),
  notas: z.string().optional(),
});

export const LeadQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  q: z.string().optional(),
  estado: z.string().optional(),
  origen: z.string().optional(),
});
```

## 📱 Layout Responsive

### Sidebar Navigation

```tsx
// components/layout/sidebar.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Home,
  Users,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Leads", href: "/leads", icon: Users },
  { name: "Reportes", href: "/reports", icon: BarChart3 },
  { name: "Configuración", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button variant="outline" size="sm" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-4 border-b">
            <h1 className="text-xl font-bold text-primary">Phorencial CRM</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t">
            <Button variant="ghost" className="w-full justify-start">
              <LogOut className="mr-3 h-4 w-4" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
```

## 🎯 Datos de Ejemplo para v0.dev

### Leads de Muestra

```typescript
export const SAMPLE_LEADS: Lead[] = [
  {
    id: "lead_001",
    nombre: "Karen Vanina Paliza",
    telefono: "+543704861647",
    email: "karen.vanina@email.com",
    dni: "17968421",
    ingresos: 134000000,
    zona: "Formosa Capital",
    producto: "Moto 110cc",
    monto: 50000000,
    origen: "excel",
    estado: "PREAPROBADO",
    agencia: "Rio Bermejo",
    notas: "Trabajo: Empleada Provincial. BDF: Sí",
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-16T14:20:00Z",
  },
  {
    id: "lead_002",
    nombre: "Jorge Lino Bazan",
    telefono: "+543705182438",
    email: "jorge.lino@email.com",
    dni: "38542477",
    ingresos: 87700000,
    zona: "Villa del Rosario",
    producto: "Moto 110cc",
    monto: 50000000,
    origen: "excel",
    estado: "RECHAZADO",
    agencia: "C",
    notas: "Trabajo: Personal Policial. Hist. crediticio malo. BDF: Sí",
    createdAt: "2024-01-14T09:15:00Z",
    updatedAt: "2024-01-15T11:30:00Z",
  },
  {
    id: "lead_003",
    nombre: "Barrios Norma Beatriz",
    telefono: "+543704947119",
    email: "norma.beatriz@email.com",
    dni: "14172033",
    ingresos: 69400000,
    zona: "Solidaridad",
    producto: "Préstamo Personal",
    monto: 30000000,
    origen: "whatsapp",
    estado: "NUEVO",
    agencia: null,
    notas: "Trabajo: Jubilada. Interesada en refinanciación",
    createdAt: "2024-01-16T16:45:00Z",
    updatedAt: "2024-01-16T16:45:00Z",
  },
];

export const SAMPLE_METRICS = {
  totalLeads: 1247,
  leadsThisMonth: 89,
  conversionRate: 23.5,
  projectedRevenue: 215400000,
  leadsByStatus: {
    NUEVO: 756,
    EN_REVISION: 187,
    PREAPROBADO: 7,
    RECHAZADO: 35,
    DOC_PENDIENTE: 98,
    DERIVADO: 164,
  },
};
```

## 🚀 Instrucciones Finales para v0.dev

**Prompt Principal:**
"Crear un CRM completo para Phorencial, empresa financiera argentina en Formosa. Usar Next.js 14, TypeScript, Tailwind CSS y shadcn/ui estilo 'new-york'. Incluir dashboard con métricas KPI, gestión de leads con filtros dinámicos y contadores exactos, formularios de creación/edición, tabla responsive, y datos realistas de Formosa con nombres argentinos y teléfonos locales (+543704, +543705). Sistema de estados: NUEVO, PREAPROBADO, RECHAZADO, etc. con badges de colores. Implementar filtrado en memoria para contadores precisos. Responsive design completo."

**Componentes Prioritarios:**

1. Dashboard con métricas y gráficos
2. Tabla de leads con filtros y paginación
3. Formulario de creación/edición de leads
4. Sistema de navegación responsive
5. Componentes UI de shadcn/ui configurados

**Datos de Ejemplo:**
Usar los SAMPLE_LEADS y SAMPLE_METRICS proporcionados con datos reales de Formosa, Argentina.

¿Necesitas algún ajuste específico en la documentación?
