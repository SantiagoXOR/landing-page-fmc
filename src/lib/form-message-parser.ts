/**
 * Parser para mensajes con formato "Solicitud de Crédito" (landing/WhatsApp).
 * Extrae datos estructurados y actualiza el lead en la DB.
 */

import { logger } from '@/lib/logger'

export interface ParsedForm {
  nombre?: string
  dni?: string
  cuil?: string
  telefono?: string
  email?: string
  ingresos?: number
  zona?: string
  marca?: string
  modelo?: string
  cuotas?: string
  comentarios?: string
  producto?: string
}

/**
 * Extrae CUIL/CUIT/DNI de un valor (puede estar dentro de texto).
 * Formato preferido: XX-XXXXXXXX-X para 11 dígitos.
 */
function extractCUILOrDNI(value: string | null | undefined): string | null {
  if (!value) return null
  const strValue = String(value).trim()
  const cuilWithDashes = strValue.match(/\b\d{2}-\d{8}-\d{1}\b/)
  if (cuilWithDashes) return cuilWithDashes[0]
  const cuilWithoutDashes = strValue.match(/\b\d{11}\b/)
  if (cuilWithoutDashes) {
    const digits = cuilWithoutDashes[0]
    if (/^\d{2}\d{8}\d{1}$/.test(digits)) {
      return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`
    }
  }
  const dni = strValue.match(/\b\d{8}\b/)
  if (dni) return dni[0]
  const onlyDigits = strValue.replace(/\D/g, '')
  if (onlyDigits.length >= 7 && onlyDigits.length <= 11) return onlyDigits
  return null
}

/**
 * Parsea el contenido de un mensaje con formato "Solicitud de Crédito"
 * (generado por credit-form.tsx / WhatsApp).
 */
export function parseFormMessage(content: string): ParsedForm | null {
  if (!content || !content.includes('Solicitud de Crédito')) return null

  const trim = (s: string | undefined) => (s && s.trim()) || undefined

  const mNombre = content.match(/Nombre:\s*(.+?)(?=\n|$)/im)
  const mDni = content.match(/DNI\/CUIT:\s*([\d\s\-]+?)(?=\n|$)/im)
  const mTelefono = content.match(/Teléfono:[\s\S]*?\s*([+\d][\d\s\-+]*?)(?=\n|$)/im)
  const mEmail = content.match(/Email:[\s\S]*?\s*([^\s•\n]+@[^\s•\n]+?)(?=\n|$)/im)
  const mIngresos = content.match(/Ingresos:[\s\S]*?\$?\s*([\d.,]+?)(?=\n|$)/im)
  const mZona = content.match(/Zona:[\s\S]*?\s*(.+?)(?=\n|$)/im)
  const mMarca = content.match(/Marca:\s*(.+?)(?=\n|$)/im)
  const mModelo = content.match(/Modelo:\s*(.+?)(?=\n|$)/im)
  const mCuotas = content.match(/Cuotas:[\s\S]*?(\d+)\s*meses/im)

  let comentarios: string | undefined
  const comentariosSection = content.match(/\*?\s*Comentarios:\s*\*?\s*\n([\s\S]*?)(?=\n\s*\n|\n\s*✅|$)/im)
  if (comentariosSection && comentariosSection[1]) {
    comentarios = trim(comentariosSection[1])
  }

  const nombre = trim(mNombre?.[1])
  const dniRaw = trim(mDni?.[1])
  const cuil = dniRaw ? extractCUILOrDNI(dniRaw) : undefined
  const telefono = trim(mTelefono?.[1])?.replace(/\s/g, '')
  const email = trim(mEmail?.[1])
  let ingresos: number | undefined
  if (mIngresos?.[1]) {
    const numStr = mIngresos[1].replace(/\./g, '').replace(',', '.')
    const n = parseInt(numStr, 10)
    if (!isNaN(n)) ingresos = n
  }
  const zona = trim(mZona?.[1])
  const marca = trim(mMarca?.[1])
  const modelo = trim(mModelo?.[1])
  const cuotas = mCuotas?.[1] ? String(mCuotas[1]) : undefined

  const hasAny =
    nombre || cuil || dniRaw || telefono || email || ingresos != null || zona || marca || modelo || cuotas || comentarios
  if (!hasAny) return null

  const producto =
    marca && modelo ? `${marca} ${modelo}` : marca || modelo

  return {
    nombre,
    dni: dniRaw || undefined,
    cuil: cuil || undefined,
    telefono,
    email,
    ingresos,
    zona,
    marca,
    modelo,
    cuotas,
    comentarios,
    producto
  }
}

/**
 * Actualiza el lead con los datos parseados: merge en customFields y columnas directas.
 */
export async function updateLeadFromParsedForm(
  leadId: string,
  parsed: ParsedForm,
  supabaseClient: { from: (table: string) => any }
): Promise<void> {
  const { data: current, error: fetchError } = await supabaseClient
    .from('Lead')
    .select('id, customFields, cuil, email, ingresos, zona, producto')
    .eq('id', leadId)
    .single()

  if (fetchError || !current) {
    logger.warn('updateLeadFromParsedForm: lead no encontrado', { leadId, error: fetchError?.message })
    throw new Error('Lead not found')
  }

  let customFields: Record<string, unknown> = {}
  if (current.customFields) {
    try {
      customFields =
        typeof current.customFields === 'string'
          ? JSON.parse(current.customFields)
          : (current.customFields as Record<string, unknown>)
    } catch {
      customFields = {}
    }
  }

  if (parsed.cuil) customFields.cuil = parsed.cuil
  if (parsed.dni) customFields.dni = parsed.dni
  if (parsed.ingresos != null) customFields.ingresos = parsed.ingresos
  if (parsed.zona) customFields.zona = parsed.zona
  if (parsed.producto) customFields.producto = parsed.producto
  if (parsed.marca) customFields.marca = parsed.marca
  if (parsed.modelo) customFields.modelo = parsed.modelo
  if (parsed.cuotas) customFields.cuotas = parsed.cuotas
  if (parsed.email) customFields.email = parsed.email
  if (parsed.nombre) customFields.nombre = parsed.nombre
  if (parsed.comentarios) customFields.comentarios = parsed.comentarios

  const updatePayload: Record<string, unknown> = {
    customFields: JSON.stringify(customFields),
    updatedAt: new Date().toISOString()
  }

  if (parsed.cuil) updatePayload.cuil = parsed.cuil
  if (parsed.email) updatePayload.email = parsed.email
  if (parsed.ingresos != null) updatePayload.ingresos = parsed.ingresos
  if (parsed.zona) updatePayload.zona = parsed.zona
  if (parsed.producto) updatePayload.producto = parsed.producto

  const { error: updateError } = await supabaseClient.from('Lead').update(updatePayload).eq('id', leadId)

  if (updateError) {
    logger.error('updateLeadFromParsedForm: error actualizando lead', { leadId, error: updateError.message })
    throw updateError
  }

  logger.info('Lead actualizado desde mensaje de formulario', {
    leadId,
    fields: Object.keys(parsed).filter((k) => (parsed as any)[k] != null)
  })
}
