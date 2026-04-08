export interface ReportInsightInput {
  totalLeads: number
  pctNuevo: number
  tasaSalidaNuevo: number
  nuevoMas24h: number
  nuevoMas72h: number
  backlogInicio: number
  backlogFin: number
  leadsConConversacion: number
  leadsSinConversacion: number
  pipelineEstadoNuevoPeroAvanzado: number
  tasaExitoCierres: number | null
  operacionesCerradas: number
  truncated: boolean
}

export function buildReportInsights(m: ReportInsightInput): string[] {
  const lines: string[] = []

  if (m.truncated) {
    lines.push(
      'Se alcanzó el límite de 10.000 leads en el período; los totales pueden estar truncados. Acotá fechas o filtros.'
    )
  }

  if (m.totalLeads === 0) {
    lines.push('No hay leads en el período con los filtros aplicados.')
    return lines
  }

  if (m.pctNuevo >= 70) {
    lines.push(
      `Casi ${m.pctNuevo.toFixed(0)} % de los leads del período siguen en estado NUEVO: revisá SLA de primer contacto y actualización de estado.`
    )
  }

  if (m.nuevoMas72h > 0) {
    lines.push(
      `${m.nuevoMas72h} lead(s) en NUEVO llevan más de 72 h (referencia fin de rango): priorizar contacto o derivación.`
    )
  } else if (m.nuevoMas24h > 0) {
    lines.push(
      `${m.nuevoMas24h} lead(s) en NUEVO llevan más de 24 h: conviene revisar cola de primer contacto.`
    )
  }

  if (m.tasaSalidaNuevo < 15 && m.totalLeads >= 10) {
    lines.push(
      `Solo ${m.tasaSalidaNuevo.toFixed(1)} % de los leads del período salieron de NUEVO: el embudo no está avanzando respecto de las altas.`
    )
  }

  const deltaBacklog = m.backlogFin - m.backlogInicio
  if (Math.abs(deltaBacklog) >= 5 && m.backlogInicio + m.backlogFin > 0) {
    lines.push(
      deltaBacklog > 0
        ? `El stock en embudo creció (${m.backlogInicio} → ${m.backlogFin}): subió la presión operativa.`
        : `El stock en embudo bajó (${m.backlogInicio} → ${m.backlogFin}): se está drenando la cola.`
    )
  }

  if (m.leadsSinConversacion > 0 && m.leadsConConversacion + m.leadsSinConversacion === m.totalLeads) {
    const pctSin = (m.leadsSinConversacion / m.totalLeads) * 100
    if (pctSin >= 40) {
      lines.push(
        `${pctSin.toFixed(0)} % de los leads del período no tienen conversación vinculada: revisá integración de chat o asignación de lead_id.`
      )
    }
  }

  if (m.pipelineEstadoNuevoPeroAvanzado > 0) {
    lines.push(
      `${m.pipelineEstadoNuevoPeroAvanzado} lead(s) figuran NUEVO en CRM pero con etapa avanzada en pipeline: alinear estado del lead con el tablero de ventas.`
    )
  }

  if (m.operacionesCerradas > 0 && m.tasaExitoCierres !== null) {
    lines.push(
      `Entre cierres del período, ${m.tasaExitoCierres.toFixed(1)} % fueron ganados (${m.operacionesCerradas} operaciones cerradas).`
    )
  } else if (m.totalLeads >= 20 && m.operacionesCerradas === 0) {
    lines.push('No hay cierres registrados en el período: la conversión aún no aparece en datos.')
  }

  if (lines.length === 0) {
    lines.push('Métricas dentro de rangos habituales para el volumen mostrado.')
  }

  return lines
}
