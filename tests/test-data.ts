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
  API_CALL: 20000    // 20 segundos para llamadas API
} as const;
