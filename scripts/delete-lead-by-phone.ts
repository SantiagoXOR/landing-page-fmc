/**
 * Elimina un lead por teléfono (y todos sus datos relacionados) para poder
 * re-probar flujos (ej. Solicitud de Crédito desde cero).
 *
 * Uso: npx tsx scripts/delete-lead-by-phone.ts [teléfono]
 * Ejemplo: npx tsx scripts/delete-lead-by-phone.ts +5493547527070
 *
 * Requiere .env con NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_KEY (o SUPABASE_SERVICE_ROLE_KEY).
 */

import 'dotenv/config'
import { SupabaseLeadService } from '../src/server/services/supabase-lead-service'

const telefono = process.argv[2] || '+5493547527070'

async function main() {
  console.log('Buscando lead con teléfono:', telefono)
  const service = new SupabaseLeadService()
  const lead = await service.findLeadByPhone(telefono)
  if (!lead || !lead.id) {
    console.log('No se encontró ningún lead con ese teléfono.')
    process.exit(1)
  }
  console.log('Lead encontrado:', lead.nombre, '(id:', lead.id, ')')
  await service.deleteLead(lead.id)
  console.log('Lead eliminado correctamente. Puedes volver a probar el flujo.')
}

main().catch((e) => {
  console.error('Error:', e.message)
  process.exit(1)
})
