import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import { PipelineLead } from '@/types/pipeline'

// Datos de ejemplo para el pipeline
const mockPipelineLeads: PipelineLead[] = [
  {
    id: 'lead-1',
    nombre: 'Juan Pérez',
    telefono: '+54 370 4123456',
    email: 'juan.perez@email.com',
    origen: 'WhatsApp',
    estado: 'NUEVO',
    stageId: 'nuevo',
    stageEntryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 días atrás
    lastActivity: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    score: 75,
    tags: ['Formosa Capital', 'Primera Vivienda'],
    priority: 'high',
    value: 25000000,
    probability: 60,
    assignedTo: 'user-1',
    notes: 'Cliente interesado en casa en zona céntrica',
    activities: [
      {
        id: 'activity-1',
        type: 'whatsapp',
        description: 'Primer contacto por WhatsApp',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        userId: 'user-1',
        userName: 'Agente Ventas'
      }
    ],
    tasks: [
      {
        id: 'task-1',
        title: 'Llamar para agendar visita',
        description: 'Contactar al cliente para coordinar visita a propiedades',
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        priority: 'high',
        status: 'pending',
        assignedTo: 'user-1',
        assignedBy: 'user-1',
        createdAt: new Date(),
        type: 'call'
      }
    ]
  },
  {
    id: 'lead-2',
    nombre: 'María González',
    telefono: '+54 370 5987654',
    email: 'maria.gonzalez@email.com',
    origen: 'Facebook',
    estado: 'CONTACTADO',
    stageId: 'contactado',
    stageEntryDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    lastActivity: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    score: 85,
    tags: ['Clorinda', 'Inversión'],
    priority: 'urgent',
    value: 45000000,
    probability: 80,
    assignedTo: 'user-2',
    notes: 'Inversora con experiencia, busca propiedades para alquiler',
    activities: [
      {
        id: 'activity-2',
        type: 'call',
        description: 'Llamada inicial - muy interesada',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        userId: 'user-2',
        userName: 'Agente Senior'
      }
    ],
    tasks: []
  },
  {
    id: 'lead-3',
    nombre: 'Carlos Rodríguez',
    telefono: '+54 371 1234567',
    origen: 'Referido',
    estado: 'CALIFICADO',
    stageId: 'calificado',
    stageEntryDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    lastActivity: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    score: 90,
    tags: ['Laguna Blanca', 'Familia'],
    priority: 'medium',
    value: 35000000,
    probability: 75,
    assignedTo: 'user-1',
    notes: 'Familia joven buscando primera vivienda en zona tranquila',
    customFields: {
      presupuesto: '35000000',
      financiacion: 'Crédito hipotecario',
      tiempoCompra: '3 meses'
    },
    activities: [
      {
        id: 'activity-3',
        type: 'meeting',
        description: 'Reunión en oficina - definió presupuesto',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        userId: 'user-1',
        userName: 'Agente Ventas'
      }
    ],
    tasks: [
      {
        id: 'task-3',
        title: 'Preparar propuestas de propiedades',
        description: 'Seleccionar 3-5 propiedades que coincidan con el perfil',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        priority: 'medium',
        status: 'in_progress',
        assignedTo: 'user-1',
        assignedBy: 'user-1',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        type: 'document'
      }
    ]
  },
  {
    id: 'lead-4',
    nombre: 'Ana Martínez',
    telefono: '+54 370 4567890',
    email: 'ana.martinez@email.com',
    origen: 'Web',
    estado: 'PROPUESTA',
    stageId: 'propuesta',
    stageEntryDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    lastActivity: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    score: 95,
    tags: ['Formosa Capital', 'Ejecutiva'],
    priority: 'high',
    value: 55000000,
    probability: 85,
    assignedTo: 'user-2',
    notes: 'Ejecutiva de empresa, decisión rápida',
    customFields: {
      presupuesto: '55000000',
      propuesta_url: 'https://docs.google.com/document/d/abc123',
      fecha_envio_propuesta: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    activities: [
      {
        id: 'activity-4',
        type: 'email',
        description: 'Propuesta comercial enviada por email',
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        userId: 'user-2',
        userName: 'Agente Senior'
      }
    ],
    tasks: [
      {
        id: 'task-4',
        title: 'Seguimiento de propuesta',
        description: 'Contactar para conocer feedback sobre la propuesta',
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        priority: 'high',
        status: 'pending',
        assignedTo: 'user-2',
        assignedBy: 'user-2',
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        type: 'follow_up'
      }
    ]
  },
  {
    id: 'lead-5',
    nombre: 'Roberto Silva',
    telefono: '+54 371 8765432',
    origen: 'WhatsApp',
    estado: 'NEGOCIACION',
    stageId: 'negociacion',
    stageEntryDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    lastActivity: new Date(),
    score: 88,
    tags: ['Pirané', 'Comercial'],
    priority: 'urgent',
    value: 75000000,
    probability: 90,
    assignedTo: 'user-1',
    notes: 'Negociando términos de pago y fecha de entrega',
    activities: [
      {
        id: 'activity-5',
        type: 'call',
        description: 'Negociación de términos - muy cerca del cierre',
        date: new Date(),
        userId: 'user-1',
        userName: 'Agente Ventas'
      }
    ],
    tasks: []
  }
]

/**
 * GET /api/pipeline/leads
 * Obtener leads del pipeline con filtros opcionales
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Debe iniciar sesión para acceder a los leads del pipeline'
      }, { status: 401 })
    }

    // Verificar permisos
    try {
      checkPermission(session.user.role, 'leads:read')
    } catch (error) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'No tiene permisos para acceder a los leads del pipeline'
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    
    // Obtener parámetros de filtro
    const stageId = searchParams.get('stageId')
    const priority = searchParams.get('priority')
    const assignedTo = searchParams.get('assignedTo')
    const search = searchParams.get('search')

    let filteredLeads = [...mockPipelineLeads]

    // Aplicar filtros
    if (stageId) {
      filteredLeads = filteredLeads.filter(lead => lead.stageId === stageId)
    }

    if (priority) {
      filteredLeads = filteredLeads.filter(lead => lead.priority === priority)
    }

    if (assignedTo) {
      filteredLeads = filteredLeads.filter(lead => lead.assignedTo === assignedTo)
    }

    if (search) {
      const searchLower = search.toLowerCase()
      filteredLeads = filteredLeads.filter(lead => 
        lead.nombre.toLowerCase().includes(searchLower) ||
        lead.telefono.includes(search) ||
        lead.email?.toLowerCase().includes(searchLower) ||
        lead.origen.toLowerCase().includes(searchLower)
      )
    }

    logger.info('Pipeline leads requested', {
      userId: session.user.id,
      userName: session.user.name,
      filters: { stageId, priority, assignedTo, search },
      resultCount: filteredLeads.length
    })

    return NextResponse.json(filteredLeads)

  } catch (error: any) {
    logger.error('Error getting pipeline leads', {
      error: error.message,
      stack: error.stack,
      userId: (await getServerSession(authOptions))?.user?.id
    })

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Error interno del servidor al obtener leads del pipeline'
    }, { status: 500 })
  }
}
