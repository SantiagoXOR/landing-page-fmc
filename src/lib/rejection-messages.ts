/**
 * Mensajes predefinidos para enviar cuando se rechaza un crédito
 * Estos mensajes se pueden seleccionar desde la UI cuando se rechaza un lead de Instagram
 */

export const REJECTION_MESSAGES = {
  INCOME_MISMATCH: {
    id: 'income_mismatch',
    label: 'Ingresos no acordes',
    message: `Lamentablemente, en esta oportunidad no podremos asistirlo, ya que no contamos con una línea de financiación acorde a los ingresos demostrables informados.
Agradecemos sinceramente su interés en Formosa Moto Créditos y quedamos a disposición para futuras consultas.`
  },
  BANK_REQUIREMENT: {
    id: 'bank_requirement',
    label: 'Requisito de banco',
    message: `Lamentablemente, en esta oportunidad no podremos asistirlo, ya que actualmente uno de los requisitos para acceder a la financiación es percibir los ingresos a través del Banco Formosa.
Agradecemos su comprensión y lo esperamos para futuras operaciones.`
  },
  CREDIT_HISTORY: {
    id: 'credit_history',
    label: 'Historial crediticio desfavorable',
    message: `Lamentablemente, en esta ocasión no podremos asistirlo, debido a que usted cuenta con un historial crediticio desfavorable, lo que impide que su perfil sea apto para continuar con la gestión.
Agradecemos su interés y lo invitamos a contactarnos ante cualquier novedad futura.`
  }
} as const

export type RejectionMessageId = keyof typeof REJECTION_MESSAGES

export const REJECTION_MESSAGE_OPTIONS = Object.values(REJECTION_MESSAGES)
