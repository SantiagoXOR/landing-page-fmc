// Datos de prueba para el CRM Phorencial

export const TEST_USERS = {
  ADMIN: {
    email: 'admin@phorencial.com',
    password: 'admin123',
    role: 'ADMIN',
    name: 'Admin'
  },
  ANALISTA: {
    email: 'ludmila@phorencial.com',
    password: 'ludmila123',
    role: 'ANALISTA',
    name: 'Ludmila'
  },
  VENDEDOR: {
    email: 'vendedor@phorencial.com',
    password: 'vendedor123',
    role: 'VENDEDOR',
    name: 'Vendedor Demo'
  }
} as const;

export const FORMOSA_DATA = {
  ZONAS: [
    'Formosa Capital',
    'Clorinda', 
    'Pirané',
    'El Colorado',
    'Las Lomitas',
    'Ingeniero Juárez',
    'Ibarreta',
    'Comandante Fontana',
    'Villa Dos Trece',
    'General Güemes',
    'Laguna Blanca',
    'Pozo del Mortero',
    'Estanislao del Campo',
    'Villa del Rosario',
    'Namqom',
    'La Nueva Formosa',
    'Solidaridad',
    'San Antonio',
    'Obrero',
    'GUEMES'
  ],
  
  CODIGOS_AREA: [
    '+543704', // Formosa Capital
    '+543705', // Clorinda
    '+543711', // Interior
    '+543718'  // Zonas rurales
  ],
  
  ESTADOS_LEAD: [
    'NUEVO',
    'EN_REVISION', 
    'PREAPROBADO',
    'RECHAZADO',
    'DOC_PENDIENTE',
    'DERIVADO'
  ],
  
  NOMBRES_ARGENTINOS: [
    'Karen Vanina Paliza',
    'Jorge Lino Bazan',
    'Barrios Norma Beatriz',
    'María Elena González',
    'Carlos Alberto Fernández',
    'Ana Sofía Rodríguez'
  ]
} as const;

export const TEST_LEAD_DATA = {
  NUEVO_LEAD: {
    nombre: 'Juan Carlos Pérez',
    telefono: '+543704123456',
    email: 'juan.perez@email.com',
    zona: 'Formosa Capital',
    ingresos: 150000000, // $150M ARS
    estado: 'NUEVO',
    origen: 'WhatsApp'
  },
  
  LEAD_PREAPROBADO: {
    nombre: 'María Fernanda López',
    telefono: '+543705987654',
    email: 'maria.lopez@email.com', 
    zona: 'Clorinda',
    ingresos: 200000000, // $200M ARS
    estado: 'PREAPROBADO',
    origen: 'Web'
  }
} as const;

export const EXPECTED_METRICS = {
  MIN_TOTAL_LEADS: 1000, // Esperamos al menos 1000 leads
  EXPECTED_ESTADOS: ['NUEVO', 'PREAPROBADO', 'RECHAZADO', 'EN_REVISION', 'DOC_PENDIENTE', 'DERIVADO'],
  EXPECTED_ZONAS_COUNT: 20, // 20 zonas de Formosa
  EXPECTED_CODIGOS_AREA: 4 // 4 códigos de área
} as const;

export const UI_SELECTORS = {
  // Autenticación
  LOGIN_FORM: 'form[data-testid="login-form"]',
  EMAIL_INPUT: 'input[data-testid="email-input"]',
  PASSWORD_INPUT: 'input[data-testid="password-input"]',
  LOGIN_BUTTON: 'button[data-testid="login-button"]',
  LOGOUT_BUTTON: 'button[data-testid="logout-button"]',
  
  // Dashboard
  DASHBOARD_TITLE: '[data-testid="dashboard-title"]',
  METRICS_CARDS: '[data-testid="metrics-card"]',
  DASHBOARD_CHARTS: '[data-testid="dashboard-charts"]',
  
  // Sidebar
  SIDEBAR: '[data-testid="sidebar"]',
  SIDEBAR_LOGO: '[data-testid="sidebar-logo"]',
  USER_INFO: '[data-testid="user-info"]',
  USER_NAME: '[data-testid="user-name"]',
  USER_EMAIL: '[data-testid="user-email"]',
  NAV_DASHBOARD: '[data-testid="sidebar"] a[href="/dashboard"]',
  NAV_LEADS: '[data-testid="sidebar"] a[href="/leads"]',
  NAV_DOCUMENTS: '[data-testid="sidebar"] a[href="/documents"]',
  NAV_SETTINGS: '[data-testid="sidebar"] a[href="/settings"]',
  NAV_CHATS: '[data-testid="sidebar"] a[href="/chats"], a[href*="/chats"]',
  
  // Leads
  LEADS_TITLE: 'h1:has-text("Gestión de Leads")',
  LEADS_TABLE: '[data-testid="leads-table"]',
  LEADS_FILTERS: '[data-testid="leads-filters"]',
  SEARCH_INPUT: 'input[placeholder*="Buscar"]',
  ESTADO_FILTER: 'select[name="estado"]',
  ZONA_FILTER: 'select[name="zona"]',
  NEW_LEAD_BUTTON: '[data-testid="new-lead-button"]',
  
  // Documents
  DOCUMENTS_TITLE: 'h1:has-text("Documentos")',
  UPLOAD_BUTTON: 'button:has-text("Subir Documento")',
  DOCUMENTS_GRID: '[data-testid="documents-grid"]',
  
  // Settings
  SETTINGS_TITLE: 'h1:has-text("Configuración")',
  SETTINGS_SECTIONS: '[data-testid="settings-sections"]',
  FORMOSA_SETTINGS: '[data-testid="formosa-settings"]',
  
      // Chats Panel
      CHATS_PAGE_TITLE: 'h1:has-text("Chats"), h2:has-text("Chats"), [class*="text-2xl"]:has-text("Chats"), [class*="text-xl"]:has-text("Chats")',
  CHATS_SUBTITLE: 'text=/Gestiona las conversaciones de WhatsApp e Instagram/i',
  CHATS_LIST_CONTAINER: '.divide-y.divide-gray-100',
  CONVERSATION_ITEM: '.flex.items-start.space-x-2.cursor-pointer:has(h4), .flex.items-start.space-x-3.cursor-pointer:has(h4)',
  CONVERSATION_ITEM_SELECTED: '.bg-purple-50.border-l-4.border-purple-600',
  CONVERSATION_NAME: 'h4.font-medium.text-gray-900',
  CONVERSATION_PREVIEW: 'p.text-gray-600.truncate',
  CONVERSATION_TIMESTAMP: 'span.text-gray-500.flex-shrink-0',
  CONVERSATION_UNREAD_BADGE: '.bg-purple-600.rounded-full:has(span)',
  CONVERSATION_BOT_ALERT: '.bg-pink-500:has-text("Bot Alert"), .bg-pink-500:has-text("Alert")',
  CHATS_SEARCH_INPUT: 'input[placeholder*="Buscar"]',
  CHATS_FILTER_ALL: 'button:has-text("Todos")',
  CHATS_FILTER_INSTAGRAM: 'button:has-text("Instagram"), button:has-text("IG")',
  CHATS_FILTER_WHATSAPP: 'button:has-text("WhatsApp"), button:has-text("WA")',
  CHATS_SYNC_BUTTON: 'button:has(svg[class*="RefreshCw"])',
  CHATS_SYNC_STATUS: '.bg-green-50, .bg-red-50, .bg-blue-50',
  CHAT_WINDOW_CONTAINER: '.flex.flex-col.h-full.bg-white',
  CHAT_WINDOW_HEADER: '.p-3.border-b, .p-4.border-b',
  CHAT_CONTACT_NAME: 'h3.font-semibold.text-gray-900',
  CHAT_CONTACT_PHONE: '.text-xs.text-gray-500, .text-sm.text-gray-500:has-text("+54")',
  CHAT_MESSAGES_CONTAINER: '[data-radix-scroll-area-viewport], .space-y-2, .space-y-3, .space-y-4',
  CHAT_MESSAGE_BUBBLE: '.rounded-2xl, .rounded-lg',
  CHAT_MESSAGE_INPUT: 'input[placeholder*="Escribe un mensaje"]',
  CHAT_SEND_BUTTON: 'button:has(svg[class*="Send"]), button:has-text("Enviar")',
  CHAT_EMPTY_STATE: '.flex.flex-col.items-center.justify-center.py-12, .flex.flex-col.items-center.justify-center.py-16',
  CHATS_SIDEBAR: '.w-80.bg-white.border-l, .bg-white.border-l',
  SIDEBAR_CONTACT_INFO: 'text="Información del Contacto"',
  SIDEBAR_CHATBOT_STATUS: 'text="Chatbot"',
  SIDEBAR_CONVERSATION_STATUS: 'text="Estado de la Conversación"',
  SIDEBAR_ASSIGN_USER: 'text="Asignar a Agente", select:has(option:has-text("Seleccionar agente"))',
  SIDEBAR_ASSIGN_BUTTON: 'button:has-text("Asignar")',
  SIDEBAR_CLOSE_CONVERSATION: 'button:has-text("Cerrar Conversación")',
  CHATS_EMPTY_STATE: 'text=/No hay conversaciones|No se encontraron conversaciones/i',
  
  // UI Elements
  GRADIENT_ELEMENTS: '.gradient-primary, .gradient-success, .gradient-warning',
  FORMOSA_BADGES: '.formosa-badge-nuevo, .formosa-badge-preaprobado, .formosa-badge-rechazado',
  HOVER_LIFT_CARDS: '.hover-lift',
  ANIMATED_ELEMENTS: '.animate-fade-in, .animate-slide-up'
} as const;

export const TIMEOUTS = {
  SHORT: 5000,    // 5 segundos
  MEDIUM: 10000,  // 10 segundos  
  LONG: 30000,    // 30 segundos
  NAVIGATION: 15000, // 15 segundos para navegación
  API_CALL: 20000,    // 20 segundos para llamadas API
  CHAT_SYNC: 30000,   // 30 segundos para sincronización de chats
  MESSAGE_SEND: 10000  // 10 segundos para envío de mensajes
} as const;
