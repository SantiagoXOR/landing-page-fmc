/**
 * Script para importar contactos desde CSV exportado de ManyChat
 * 
 * ManyChat permite exportar contactos desde la interfaz web.
 * Este script importa esos contactos al CRM.
 * 
 * Pasos:
 * 1. En ManyChat: Contacts → Filtrar por etiqueta → Seleccionar todos → Exportar
 * 2. Guardar el CSV como "manychat-export.csv" en la carpeta scripts/
 * 3. Ejecutar: npm run manychat:import-csv
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function success(message) {
  log(`✓ ${message}`, 'green')
}

function error(message) {
  log(`✗ ${message}`, 'red')
}

function info(message) {
  log(`ℹ ${message}`, 'blue')
}

function warn(message) {
  log(`⚠ ${message}`, 'yellow')
}

function section(message) {
  log(`\n${'='.repeat(60)}`, 'cyan')
  log(message, 'cyan')
  log('='.repeat(60), 'cyan')
}

// Configuración
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  error('Error: Variables de entorno de Supabase no configuradas')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

/**
 * Parsear CSV simple
 */
function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length === 0) return []
  
  // Detectar delimitador (coma o punto y coma)
  const firstLine = lines[0]
  const delimiter = firstLine.includes(';') ? ';' : ','
  
  // Obtener headers
  const headers = lines[0].split(delimiter).map(h => h.trim().replace(/"/g, ''))
  
  // Parsear datos
  const data = []
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''))
    if (values.length === headers.length) {
      const row = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      data.push(row)
    }
  }
  
  return data
}

/**
 * Normalizar teléfono
 */
function normalizePhone(phone) {
  if (!phone) return null
  
  // Remover espacios, guiones, paréntesis
  let normalized = phone.replace(/[\s\-\(\)]/g, '')
  
  // Si no empieza con +, agregar código de país (Argentina por defecto)
  if (!normalized.startsWith('+')) {
    if (normalized.startsWith('54')) {
      normalized = '+' + normalized
    } else if (normalized.startsWith('9')) {
      normalized = '+549' + normalized.substring(1)
    } else {
      normalized = '+549' + normalized
    }
  }
  
  return normalized
}

/**
 * Extraer tags desde diferentes formatos posibles del CSV
 */
function extractTags(row) {
  const tags = []
  
  // Buscar columna de tags
  const tagColumns = ['tags', 'tag', 'etiquetas', 'etiqueta', 'Labels', 'Tag']
  for (const col of tagColumns) {
    if (row[col]) {
      const tagValue = row[col]
      // Puede venir como JSON, separado por comas, o como string simple
      try {
        const parsed = JSON.parse(tagValue)
        if (Array.isArray(parsed)) {
          tags.push(...parsed.map(t => typeof t === 'string' ? t : t.name || t))
        }
      } catch {
        // No es JSON, intentar separar por comas
        const splitTags = tagValue.split(',').map(t => t.trim()).filter(Boolean)
        tags.push(...splitTags)
      }
      break
    }
  }
  
  return tags
}

/**
 * Sincronizar contacto desde CSV al CRM
 */
async function syncContactFromCSV(row) {
  try {
    // Intentar obtener manychatId desde diferentes columnas posibles
    const manychatId = row['Subscriber ID'] || row['subscriber_id'] || row['ID'] || row['id'] || row['PSID'] || row['psid'] || null
    
    // Obtener teléfono
    const phone = normalizePhone(
      row['Phone'] || row['phone'] || row['WhatsApp Phone'] || row['whatsapp_phone'] || 
      row['Teléfono'] || row['telefono'] || row['Phone Number'] || row['phone_number'] || null
    )
    
    if (!phone && !manychatId) {
      return { success: false, reason: 'no_phone_or_id' }
    }
    
    // Obtener nombre
    const firstName = row['First Name'] || row['first_name'] || row['Nombre'] || row['nombre'] || ''
    const lastName = row['Last Name'] || row['last_name'] || row['Apellido'] || row['apellido'] || ''
    const nombre = [firstName, lastName].filter(Boolean).join(' ') || row['Name'] || row['name'] || 'Contacto Manychat'
    
    // Obtener email
    const email = row['Email'] || row['email'] || row['Correo'] || row['correo'] || null
    
    // Extraer tags
    const tags = extractTags(row)
    
    // Extraer custom fields comunes
    const customFields = {}
    const customFieldMappings = {
      'dni': ['DNI', 'dni', 'Documento', 'documento'],
      'ingresos': ['Ingresos', 'ingresos', 'Income', 'income'],
      'zona': ['Zona', 'zona', 'Zone', 'zone'],
      'producto': ['Producto', 'producto', 'Product', 'product'],
      'monto': ['Monto', 'monto', 'Amount', 'amount'],
      'origen': ['Origen', 'origen', 'Origin', 'origin'],
      'estado': ['Estado', 'estado', 'Status', 'status'],
      'agencia': ['Agencia', 'agencia', 'Agency', 'agency'],
      'banco': ['Banco', 'banco', 'Bank', 'bank'],
      'trabajo_actual': ['Trabajo Actual', 'trabajo_actual', 'Current Job', 'current_job'],
      'cuit': ['CUIT', 'cuit', 'CUIL', 'cuil']
    }
    
    for (const [field, columns] of Object.entries(customFieldMappings)) {
      for (const col of columns) {
        if (row[col]) {
          customFields[field] = row[col]
          break
        }
      }
    }
    
    // Buscar lead existente
    let query = supabase.from('Lead').select('*')
    
    if (manychatId) {
      query = query.eq('manychatId', String(manychatId))
    } else if (phone) {
      query = query.eq('telefono', phone)
    } else {
      return { success: false, reason: 'no_identifier' }
    }
    
    const { data: existingLeads } = await query.limit(1)
    
    const leadData = {
      nombre,
      telefono: phone || `manychat_${manychatId || 'unknown'}`,
      email: email || null,
      manychatId: manychatId ? String(manychatId) : null,
      dni: customFields.dni || null,
      cuil: customFields.cuit || customFields.cuil || null,
      ingresos: customFields.ingresos ? parseInt(customFields.ingresos) : null,
      zona: customFields.zona || null,
      producto: customFields.producto || null,
      monto: customFields.monto ? parseInt(customFields.monto) : null,
      origen: customFields.origen || 'whatsapp',
      estado: customFields.estado || 'NUEVO',
      agencia: customFields.agencia || null,
      banco: customFields.banco || null,
      trabajo_actual: customFields.trabajo_actual || null,
      tags: tags.length > 0 ? JSON.stringify(tags) : null,
      customFields: Object.keys(customFields).length > 0 ? JSON.stringify(customFields) : null,
      updatedAt: new Date().toISOString(),
    }
    
    if (existingLeads && existingLeads.length > 0) {
      // Actualizar lead existente
      const { data: updatedLead, error: updateError } = await supabase
        .from('Lead')
        .update(leadData)
        .eq('id', existingLeads[0].id)
        .select()
        .single()
      
      if (updateError) {
        throw updateError
      }
      return { success: true, action: 'updated', leadId: updatedLead.id }
    } else {
      // Crear nuevo lead
      const { data: newLead, error: createError } = await supabase
        .from('Lead')
        .insert({
          ...leadData,
          createdAt: new Date().toISOString(),
        })
        .select()
        .single()
      
      if (createError) {
        throw createError
      }
      return { success: true, action: 'created', leadId: newLead.id }
    }
  } catch (err) {
    return { success: false, reason: 'error', error: err.message }
  }
}

/**
 * Función principal
 */
async function main() {
  section('Importación de Contactos desde CSV de ManyChat')
  
  info('Iniciando importación...')
  info(`Supabase URL: ${SUPABASE_URL.substring(0, 30)}...`)
  
  // Buscar archivo CSV
  const csvFiles = [
    path.join(__dirname, 'manychat-export.csv'),
    path.join(__dirname, 'manychat-contacts.csv'),
    path.join(process.cwd(), 'manychat-export.csv'),
    path.join(process.cwd(), 'manychat-contacts.csv'),
  ]
  
  let csvPath = null
  for (const file of csvFiles) {
    if (fs.existsSync(file)) {
      csvPath = file
      break
    }
  }
  
  if (!csvPath) {
    error('No se encontró archivo CSV')
    info('\nArchivos buscados:')
    csvFiles.forEach(file => info(`  - ${file}`))
    info('\nInstrucciones:')
    info('1. Exporta contactos desde ManyChat (Contacts → Filtrar por etiqueta → Exportar)')
    info('2. Guarda el archivo como "manychat-export.csv" en la carpeta scripts/')
    info('3. Ejecuta nuevamente este script')
    process.exit(1)
  }
  
  info(`Archivo encontrado: ${csvPath}`)
  
  // Leer y parsear CSV
  info('Leyendo archivo CSV...')
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const rows = parseCSV(csvContent)
  
  if (rows.length === 0) {
    error('El archivo CSV está vacío o no tiene formato válido')
    process.exit(1)
  }
  
  info(`Encontradas ${rows.length} filas en el CSV`)
  info('Columnas encontradas:', rows[0] ? Object.keys(rows[0]).join(', ') : 'ninguna')
  log('')
  
  const startTime = Date.now()
  const stats = {
    total: rows.length,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    errorDetails: []
  }
  
  // Procesar cada fila
  info(`Procesando ${stats.total} contactos...`)
  log('')
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    
    try {
      const result = await syncContactFromCSV(row)
      
      if (result.success) {
        if (result.action === 'created') {
          stats.created++
          const nombre = row['First Name'] || row['Name'] || row['Nombre'] || 'Contacto'
          success(`✓ [${i + 1}/${stats.total}] ${nombre}: CREADO`)
        } else {
          stats.updated++
          success(`✓ [${i + 1}/${stats.total}]: ACTUALIZADO`)
        }
      } else {
        stats.skipped++
        warn(`⚠ [${i + 1}/${stats.total}]: Omitido - ${result.reason || result.error}`)
        if (result.error) {
          stats.errorDetails.push({ row: i + 1, error: result.error })
        }
      }
    } catch (err) {
      stats.errors++
      stats.errorDetails.push({ row: i + 1, error: err.message })
      error(`✗ [${i + 1}/${stats.total}]: Error - ${err.message}`)
    }
    
    // Mostrar progreso cada 10 registros
    if ((i + 1) % 10 === 0) {
      info(`Progreso: ${i + 1}/${stats.total} (${Math.round((i + 1) / stats.total * 100)}%)`)
    }
  }
  
  // Resumen final
  const duration = ((Date.now() - startTime) / 1000).toFixed(2)
  
  section('Resumen de Importación')
  success(`Total procesados: ${stats.total}`)
  success(`Creados en CRM: ${stats.created}`)
  success(`Actualizados en CRM: ${stats.updated}`)
  
  if (stats.skipped > 0) {
    warn(`Omitidos: ${stats.skipped}`)
  }
  
  if (stats.errors > 0) {
    warn(`Errores: ${stats.errors}`)
    if (stats.errorDetails.length > 0) {
      log('\nDetalles de errores:', 'yellow')
      stats.errorDetails.slice(0, 10).forEach(({ row, error }) => {
        warn(`  Fila ${row}: ${error}`)
      })
      if (stats.errorDetails.length > 10) {
        warn(`  ... y ${stats.errorDetails.length - 10} errores más`)
      }
    }
  }
  
  info(`Tiempo total: ${duration}s`)
  info(`Promedio: ${(duration / stats.total).toFixed(2)}s por contacto`)
  
  log('\n' + '='.repeat(60), 'cyan')
  
  if (stats.created > 0 || stats.updated > 0) {
    success(`¡Importación completada! ${stats.created} creados, ${stats.updated} actualizados`)
  } else {
    warn('No se crearon ni actualizaron contactos')
  }
}

// Ejecutar script
main()
  .then(() => {
    log('\nScript finalizado', 'cyan')
    process.exit(0)
  })
  .catch((err) => {
    error(`Error ejecutando script: ${err.message}`)
    console.error(err)
    process.exit(1)
  })

