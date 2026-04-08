import type { SupabaseClient } from '@supabase/supabase-js'
import { LEAD_ESTADOS, type ReportAnalyticsQuery } from '@/lib/validators'
import { buildReportInsights } from '@/lib/report-insights'

const TERMINAL = new Set(['CERRADO_GANADO', 'CERRADO_PERDIDO', 'RECHAZADO'])
const EMBUDO_ESTADOS = LEAD_ESTADOS.filter((e) => !TERMINAL.has(e)) as string[]

const QUALIFIED_WORK = new Set([
  'CALIFICADO',
  'PROPUESTA',
  'NEGOCIACION',
  'PREAPROBADO',
  'EN_REVISION',
  'DOC_PENDIENTE',
  'DERIVADO',
  'CONTACTADO',
])

/** Etapas iniciales del pipeline (Supabase lead_pipeline.current_stage) */
const PIPELINE_ENTRY_STAGES = new Set(['CLIENTE_NUEVO', 'LEAD_NUEVO'])

export type DimensionFilters = Pick<
  ReportAnalyticsQuery,
  'origen' | 'estado' | 'zona' | 'agencia' | 'tag' | 'q'
>

function applyDims(query: any, dims: DimensionFilters) {
  let q = query
  if (dims.origen) q = q.eq('origen', dims.origen)
  if (dims.estado) q = q.eq('estado', dims.estado)
  if (dims.zona) q = q.eq('zona', dims.zona)
  if (dims.agencia) q = q.eq('agencia', dims.agencia)
  if (dims.tag) q = q.ilike('tags', `%${dims.tag}%`)
  if (dims.q) {
    const s = dims.q.replace(/%/g, '')
    q = q.or(`nombre.ilike.%${s}%,telefono.ilike.%${s}%,email.ilike.%${s}%,dni.ilike.%${s}%`)
  }
  return q
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function diasEnRangoInclusive(fromIso: string, toIso: string): number {
  const a = new Date(fromIso)
  const b = new Date(toIso)
  a.setHours(0, 0, 0, 0)
  b.setHours(0, 0, 0, 0)
  const diff = Math.ceil((b.getTime() - a.getTime()) / 86400000)
  return Math.max(1, diff + 1)
}

function aggregateLeadsByDay(leads: { createdAt: string }[]): { fecha: string; cantidad: number }[] {
  const map: Record<string, number> = {}
  for (const lead of leads) {
    const fecha = new Date(lead.createdAt).toISOString().split('T')[0]
    map[fecha] = (map[fecha] || 0) + 1
  }
  return Object.entries(map)
    .map(([fecha, cantidad]) => ({ fecha, cantidad }))
    .sort((x, y) => x.fecha.localeCompare(y.fecha))
}

async function countWhere(
  client: SupabaseClient,
  dims: DimensionFilters,
  extra: (q: any) => any
): Promise<number> {
  let q = client.from('Lead').select('*', { count: 'exact', head: true })
  q = applyDims(q, dims)
  q = extra(q)
  const { count, error } = await q
  if (error) {
    console.warn('[reports analytics] countWhere error', error.message)
    return 0
  }
  return count ?? 0
}

export async function runLeadAnalytics(
  client: SupabaseClient,
  query: ReportAnalyticsQuery
): Promise<Record<string, unknown>> {
  const { from, to } = query
  const dims: DimensionFilters = {
    origen: query.origen,
    estado: query.estado,
    zona: query.zona,
    agencia: query.agencia,
    tag: query.tag,
    q: query.q,
  }

  const limit = 10_000

  let periodQuery = client
    .from('Lead')
    .select('*', { count: 'exact' })
    .gte('createdAt', from)
    .lte('createdAt', to)
    .order('createdAt', { ascending: false })
    .limit(limit)

  periodQuery = applyDims(periodQuery, dims)

  const { data: periodLeadsRaw, error: periodErr, count: periodCount } = await periodQuery

  if (periodErr) {
    throw new Error(periodErr.message)
  }

  const periodLeads = (periodLeadsRaw || []) as Record<string, any>[]
  const truncated = (periodCount ?? periodLeads.length) > limit || periodLeads.length >= limit

  const totalLeads = periodLeads.length
  const days = diasEnRangoInclusive(from, to)
  const promedioDiario = totalLeads > 0 ? Math.round((totalLeads / days) * 10) / 10 : 0

  const lenMs = new Date(to).getTime() - new Date(from).getTime()
  const prevToMs = new Date(from).getTime() - 1
  const prevFromMs = prevToMs - lenMs
  const prevFrom = new Date(prevFromMs).toISOString()
  const prevTo = new Date(prevToMs).toISOString()

  let prevQuery = client
    .from('Lead')
    .select('createdAt')
    .gte('createdAt', prevFrom)
    .lte('createdAt', prevTo)
    .order('createdAt', { ascending: false })
    .limit(limit)
  prevQuery = applyDims(prevQuery, dims)
  const { data: prevRows } = await prevQuery
  const leadsPorDiaSemanaAnterior = aggregateLeadsByDay((prevRows || []) as { createdAt: string }[])

  const [backlogInicio, backlogFin, nuevoMas24h, nuevoMas72h] = await Promise.all([
    countWhere(client, dims, (q) => q.lt('createdAt', from).in('estado', EMBUDO_ESTADOS)),
    countWhere(client, dims, (q) => q.lte('createdAt', to).in('estado', EMBUDO_ESTADOS)),
    (() => {
      const toRef = new Date(to)
      const t24 = new Date(toRef.getTime() - 24 * 3600000).toISOString()
      return countWhere(client, dims, (q) =>
        q.eq('estado', 'NUEVO').lte('createdAt', t24).lte('createdAt', to)
      )
    })(),
    (() => {
      const toRef = new Date(to)
      const t72 = new Date(toRef.getTime() - 72 * 3600000).toISOString()
      return countWhere(client, dims, (q) =>
        q.eq('estado', 'NUEVO').lte('createdAt', t72).lte('createdAt', to)
      )
    })(),
  ])

  const salidosDeNuevo = periodLeads.filter((l) => l.estado && l.estado !== 'NUEVO').length
  const tasaSalidaNuevo = totalLeads > 0 ? (salidosDeNuevo / totalLeads) * 100 : 0

  const leadsPorOrigen: Record<string, number> = {}
  const leadsPorEstado: Record<string, number> = {}
  let cerradosGanados = 0
  let noConcretados = 0
  let embudoNuevos = 0
  let embudoSeguimiento = 0
  let valorTotal = 0
  let valorConMonto = 0
  const valorPorOrigen: Record<string, number> = {}
  const productoPorOrigen: Record<string, Record<string, number>> = {}

  const terminalEnPeriodo: Record<string, any>[] = []
  const qualifiedActivos = periodLeads.filter(
    (l) => l.estado && QUALIFIED_WORK.has(l.estado as string)
  ).length

  for (const lead of periodLeads) {
    const o = lead.origen || 'Sin origen'
    leadsPorOrigen[o] = (leadsPorOrigen[o] || 0) + 1
    const e = lead.estado as string
    leadsPorEstado[e] = (leadsPorEstado[e] || 0) + 1

    if (e === 'CERRADO_GANADO') cerradosGanados++
    else if (e === 'CERRADO_PERDIDO' || e === 'RECHAZADO') noConcretados++
    else if (e === 'NUEVO') embudoNuevos++
    else embudoSeguimiento++

    const m = typeof lead.monto === 'number' ? lead.monto : lead.monto ? Number(lead.monto) : 0
    if (m > 0) {
      valorTotal += m
      valorConMonto++
      valorPorOrigen[o] = (valorPorOrigen[o] || 0) + m
    }
    const prod = (lead.producto as string)?.trim() || 'Sin producto'
    if (!productoPorOrigen[o]) productoPorOrigen[o] = {}
    productoPorOrigen[o][prod] = (productoPorOrigen[o][prod] || 0) + 1

    if (e && TERMINAL.has(e)) {
      terminalEnPeriodo.push(lead)
    }
  }

  const pctNuevo = totalLeads > 0 ? ((leadsPorEstado['NUEVO'] || 0) / totalLeads) * 100 : 0
  const activosEnEmbudo = embudoNuevos + embudoSeguimiento

  const ganadosT = terminalEnPeriodo.filter((l) => l.estado === 'CERRADO_GANADO').length
  const perdidosT = terminalEnPeriodo.filter((l) =>
    ['CERRADO_PERDIDO', 'RECHAZADO'].includes(l.estado)
  ).length
  const operacionesCerradas = ganadosT + perdidosT
  const tasaExitoCierres =
    operacionesCerradas > 0 ? (ganadosT / operacionesCerradas) * 100 : null

  let diasPromedioHastaCierre: number | null = null
  if (terminalEnPeriodo.length > 0) {
    let sumD = 0
    let n = 0
    for (const l of terminalEnPeriodo) {
      const c = new Date(l.createdAt).getTime()
      const u = new Date(l.updatedAt || l.createdAt).getTime()
      if (u >= c) {
        sumD += (u - c) / 86400000
        n++
      }
    }
    diasPromedioHastaCierre = n > 0 ? Math.round((sumD / n) * 10) / 10 : null
  }

  const leadIds = periodLeads.map((l) => l.id).filter(Boolean)
  const leadIdSet = new Set(leadIds)

  let leadsConConversacion = 0
  const convByLead = new Map<string, string[]>()

  if (leadIds.length > 0) {
    try {
      for (const part of chunk(leadIds, 120)) {
        const { data: convs } = await client
          .from('conversations')
          .select('id, lead_id')
          .in('lead_id', part)
        for (const c of convs || []) {
          if (!c.lead_id) continue
          const arr = convByLead.get(c.lead_id) || []
          arr.push(c.id)
          convByLead.set(c.lead_id, arr)
        }
      }
      leadsConConversacion = Array.from(leadIdSet).filter(
        (id) => (convByLead.get(id)?.length ?? 0) > 0
      ).length
    } catch {
      /* tabla o permisos */
    }
  }

  const leadsSinConversacion = totalLeads - leadsConConversacion

  let horasPromedioPrimeraRespuesta: number | null = null
  if (convByLead.size > 0) {
    const allConvIds = Array.from(
      new Set(Array.from(convByLead.values()).flat() as string[])
    )
    const firstOut: Record<string, number> = {}
    try {
      for (const part of chunk(allConvIds, 80)) {
        const { data: msgs } = await client
          .from('messages')
          .select('conversation_id, sent_at, direction')
          .in('conversation_id', part)
          .eq('direction', 'outbound')
        for (const m of msgs || []) {
          const cid = m.conversation_id as string
          const t = new Date(m.sent_at).getTime()
          if (!Number.isFinite(t)) continue
          if (firstOut[cid] === undefined || t < firstOut[cid]) firstOut[cid] = t
        }
      }
      let sumH = 0
      let nh = 0
      for (const lead of periodLeads) {
        const cids = convByLead.get(lead.id)
        if (!cids?.length) continue
        const created = new Date(lead.createdAt).getTime()
        let best: number | undefined
        for (const cid of cids) {
          const fo = firstOut[cid]
          if (fo !== undefined && fo >= created && (best === undefined || fo < best)) best = fo
        }
        if (best !== undefined) {
          sumH += (best - created) / 3600000
          nh++
        }
      }
      horasPromedioPrimeraRespuesta = nh > 0 ? Math.round((sumH / nh) * 10) / 10 : null
    } catch {
      horasPromedioPrimeraRespuesta = null
    }
  }

  let pipelineEstadoNuevoPeroAvanzado = 0
  if (leadIds.length > 0) {
    try {
      const pipelines: { lead_id: string; current_stage: string }[] = []
      for (const part of chunk(leadIds, 120)) {
        const { data: rows } = await client
          .from('lead_pipeline')
          .select('lead_id, current_stage')
          .in('lead_id', part)
        if (rows) pipelines.push(...(rows as any[]))
      }
      const byLead = new Map(pipelines.map((p) => [p.lead_id, p.current_stage]))
      for (const lead of periodLeads) {
        if (lead.estado !== 'NUEVO') continue
        const st = byLead.get(lead.id)
        if (st && !PIPELINE_ENTRY_STAGES.has(st)) pipelineEstadoNuevoPeroAvanzado++
      }
    } catch {
      pipelineEstadoNuevoPeroAvanzado = 0
    }
  }

  const envGoal = parseFloat(process.env.REPORTS_DAILY_LEAD_GOAL || '25')
  const fromParam = query.dailyGoal ? parseFloat(query.dailyGoal) : NaN
  const dailyGoal =
    Number.isFinite(fromParam) && fromParam > 0
      ? fromParam
      : Number.isFinite(envGoal) && envGoal > 0
        ? envGoal
        : 25

  const insights = buildReportInsights({
    totalLeads,
    pctNuevo,
    tasaSalidaNuevo,
    nuevoMas24h,
    nuevoMas72h,
    backlogInicio,
    backlogFin,
    leadsConConversacion,
    leadsSinConversacion,
    pipelineEstadoNuevoPeroAvanzado,
    tasaExitoCierres,
    operacionesCerradas,
    truncated,
  })

  const leadsPorDia = aggregateLeadsByDay(periodLeads as { createdAt: string }[])

  const out: Record<string, unknown> = {
    meta: {
      from,
      to,
      days,
      dailyGoal,
      truncated,
      totalMatchingCount: periodCount ?? totalLeads,
    },
    summary: {
      totalLeads,
      promedioDiario,
      activosEnEmbudo,
      cerradosGanados,
      noConcretados,
      embudoNuevos,
      embudoSeguimiento,
      nuevoMas24h,
      nuevoMas72h,
      tasaSalidaNuevo: Math.round(tasaSalidaNuevo * 10) / 10,
      backlogInicio,
      backlogFin,
      leadsConConversacion,
      leadsSinConversacion,
      pipelineEstadoNuevoPeroAvanzado,
      operacionesCerradas,
      tasaExitoCierres: tasaExitoCierres !== null ? Math.round(tasaExitoCierres * 10) / 10 : null,
      qualifiedActivos,
      valorTotal,
      valorConMonto,
      valorPromedioConMonto: valorConMonto > 0 ? Math.round(valorTotal / valorConMonto) : null,
      valorPorOrigen,
      productoPorOrigen,
      diasPromedioHastaCierre,
      horasPromedioPrimeraRespuesta,
    },
    leadsPorOrigen,
    leadsPorEstado,
    leadsPorDia,
    leadsPorDiaSemanaAnterior,
    insights,
  }

  const includeLeads = query.includeLeads === 'true' || query.includeLeads === '1'
  if (includeLeads) {
    out.leads = periodLeads.map((l) => ({
      id: l.id,
      nombre: l.nombre,
      telefono: l.telefono,
      email: l.email,
      estado: l.estado,
      origen: l.origen,
      zona: l.zona,
      agencia: l.agencia,
      monto: l.monto,
      producto: l.producto,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
      tags: l.tags,
    }))
  }

  return out
}
