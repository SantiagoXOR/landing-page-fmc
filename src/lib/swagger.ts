import swaggerJSDoc from 'swagger-jsdoc'

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Phorencial CRM API',
      version: '1.0.0',
      description: 'API documentation for Phorencial CRM system',
      contact: {
        name: 'Phorencial Team',
        email: 'support@phorencial.com'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://phorencial-crm.vercel.app'
          : 'http://localhost:3000',
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Lead: {
          type: 'object',
          required: ['nombre', 'telefono'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique identifier for the lead'
            },
            nombre: {
              type: 'string',
              description: 'Lead name',
              example: 'Juan Pérez'
            },
            telefono: {
              type: 'string',
              description: 'Phone number',
              example: '+5491155556789'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email address',
              example: 'juan.perez@example.com'
            },
            estado: {
              type: 'string',
              enum: ['NUEVO', 'CONTACTADO', 'CALIFICADO', 'PROPUESTA', 'GANADO', 'PERDIDO'],
              description: 'Lead status',
              example: 'NUEVO'
            },
            origen: {
              type: 'string',
              description: 'Lead source',
              example: 'WhatsApp'
            },
            notas: {
              type: 'string',
              description: 'Additional notes',
              example: 'Interesado en el producto premium'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            }
          }
        },
        User: {
          type: 'object',
          required: ['email', 'name'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique identifier for the user'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email',
              example: 'admin@phorencial.com'
            },
            name: {
              type: 'string',
              description: 'User name',
              example: 'Admin User'
            },
            role: {
              type: 'string',
              enum: ['ADMIN', 'MANAGER', 'AGENT'],
              description: 'User role',
              example: 'ADMIN'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            }
          }
        },
        Metrics: {
          type: 'object',
          properties: {
            totalLeads: {
              type: 'integer',
              description: 'Total number of leads',
              example: 150
            },
            newLeads: {
              type: 'integer',
              description: 'Number of new leads',
              example: 25
            },
            convertedLeads: {
              type: 'integer',
              description: 'Number of converted leads',
              example: 12
            },
            conversionRate: {
              type: 'number',
              format: 'float',
              description: 'Conversion rate percentage',
              example: 8.0
            },
            leadsByStatus: {
              type: 'object',
              properties: {
                NUEVO: { type: 'integer', example: 50 },
                CONTACTADO: { type: 'integer', example: 30 },
                CALIFICADO: { type: 'integer', example: 25 },
                PROPUESTA: { type: 'integer', example: 20 },
                GANADO: { type: 'integer', example: 12 },
                PERDIDO: { type: 'integer', example: 13 }
              }
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            },
            details: {
              type: 'string',
              description: 'Additional error details'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './src/app/api/**/*.ts',
    './src/app/api/**/**/*.ts'
  ]
}

export const swaggerSpec = swaggerJSDoc(options)

export default swaggerSpec