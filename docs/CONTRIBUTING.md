# 🤝 Guía de Contribución - CRM Phorencial

> **Bienvenido!** Gracias por tu interés en contribuir al CRM Phorencial.  
> Esta guía te ayudará a hacer contribuciones de calidad.

---

## 📋 Índice

1. [Código de Conducta](#-código-de-conducta)
2. [Cómo Empezar](#-cómo-empezar)
3. [Proceso de Desarrollo](#-proceso-de-desarrollo)
4. [Estándares de Código](#-estándares-de-código)
5. [Testing](#-testing)
6. [Pull Requests](#-pull-requests)
7. [Estructura de Commits](#-estructura-de-commits)

---

## 📜 Código de Conducta

### Nuestro Compromiso

Este proyecto y sus participantes se rigen por un código de conducta profesional. Al participar, te comprometes a:

- ✅ Ser respetuoso con todos los contribuyentes
- ✅ Aceptar críticas constructivas
- ✅ Enfocarte en lo mejor para la comunidad
- ✅ Mostrar empatía hacia otros miembros

### Comportamiento Inaceptable

- ❌ Lenguaje ofensivo o comentarios despectivos
- ❌ Ataques personales o trolling
- ❌ Acoso público o privado
- ❌ Publicar información privada sin permiso

---

## 🚀 Cómo Empezar

### 1. Configurar el Entorno

```bash
# Fork el repositorio en GitHub

# Clonar tu fork
git clone https://github.com/TU_USUARIO/phorencial-bot-crm.git
cd phorencial-bot-crm

# Agregar upstream
git remote add upstream https://github.com/SantiagoXOR/phorencial-bot-crm.git

# Instalar dependencias
npm install

# Configurar .env.local
cp .env.example .env.local
# Editar .env.local con tus credenciales

# Verificar que todo funciona
npm run dev
npm run test:jest
```

### 2. Sincronizar con Upstream

```bash
# Antes de empezar a trabajar, sincroniza
git checkout main
git fetch upstream
git merge upstream/main
git push origin main
```

### 3. Encontrar una Tarea

**Opciones:**

1. **Issues con etiqueta `good first issue`**
   - Ideales para nuevos contribuyentes
   - Bien documentados
   - Alcance limitado

2. **Issues con etiqueta `help wanted`**
   - Necesitan contribuyentes
   - Pueden ser más complejos

3. **Crear un nuevo issue**
   - Si encuentras un bug
   - Si tienes una idea de feature

**Antes de empezar:**
- Comenta en el issue que lo tomarás
- Espera confirmación del mantenedor
- Pregunta si tienes dudas

---

## 💻 Proceso de Desarrollo

### 1. Crear una Rama

```bash
# Formato: tipo/descripcion-corta
git checkout -b feat/whatsapp-integration
git checkout -b fix/pipeline-creation-bug
git checkout -b docs/update-api-reference
```

**Tipos de rama:**
- `feat/` - Nueva funcionalidad
- `fix/` - Corrección de bug
- `docs/` - Documentación
- `refactor/` - Refactorización
- `test/` - Tests
- `chore/` - Mantenimiento

### 2. Hacer Cambios

```bash
# Hacer cambios en tu editor

# Ver cambios
git status
git diff

# Agregar archivos
git add src/components/NewComponent.tsx

# Commit (ver sección de commits)
git commit -m "feat: agregar componente de conversaciones"
```

### 3. Mantener Actualizado

```bash
# Regularmente sincroniza con upstream
git fetch upstream
git rebase upstream/main

# Si hay conflictos, resuélvelos y continúa
git add .
git rebase --continue
```

### 4. Push y Pull Request

```bash
# Push a tu fork
git push origin feat/whatsapp-integration

# Ir a GitHub y crear Pull Request
```

---

## 📏 Estándares de Código

### TypeScript

**✅ Usar tipos explícitos**
```typescript
// ❌ EVITAR
function createLead(data: any) {
  return data;
}

// ✅ CORRECTO
interface CreateLeadDto {
  nombre: string;
  telefono: string;
  email?: string;
}

function createLead(data: CreateLeadDto): Promise<Lead> {
  return supabase.createLead(data);
}
```

**✅ Evitar `any`**
```typescript
// ❌ EVITAR
const response: any = await fetch('/api/leads');

// ✅ CORRECTO
interface LeadsResponse {
  leads: Lead[];
  total: number;
}

const response: LeadsResponse = await fetch('/api/leads').then(r => r.json());
```

**✅ Usar interfaces para objetos**
```typescript
// ✅ CORRECTO
interface Lead {
  id: string;
  nombre: string;
  telefono: string;
  email?: string;
  createdAt: Date;
}
```

### React Components

**✅ Componentes funcionales con TypeScript**
```typescript
// ❌ EVITAR
export default function LeadCard(props) {
  return <div>{props.lead.name}</div>;
}

// ✅ CORRECTO
interface LeadCardProps {
  lead: Lead;
  onEdit?: (lead: Lead) => void;
  onDelete?: (id: string) => void;
}

export function LeadCard({ lead, onEdit, onDelete }: LeadCardProps) {
  return (
    <div>
      <h3>{lead.nombre}</h3>
      {onEdit && (
        <button onClick={() => onEdit(lead)}>Editar</button>
      )}
    </div>
  );
}
```

**✅ Usar hooks correctamente**
```typescript
// ✅ CORRECTO
function LeadsList() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchLeads() {
      const data = await getLeads();
      setLeads(data);
      setLoading(false);
    }
    
    fetchLeads();
  }, []); // Dependencias claras
  
  if (loading) return <Spinner />;
  
  return <div>{/* ... */}</div>;
}
```

### Naming Conventions

**Archivos:**
```
✅ components/LeadCard.tsx          (PascalCase para componentes)
✅ lib/utils.ts                     (camelCase para utilidades)
✅ hooks/useLeads.ts                (camelCase con prefijo use)
✅ types/lead.ts                    (lowercase para types)
```

**Variables y funciones:**
```typescript
// ✅ CORRECTO
const totalLeads = 100;
const newLeadsToday = 5;

function calculateConversionRate(leads: Lead[]): number {
  // ...
}

async function fetchLeadsFromDatabase(): Promise<Lead[]> {
  // ...
}
```

**Constantes:**
```typescript
// ✅ CORRECTO
const MAX_LEADS_PER_PAGE = 10;
const DEFAULT_ESTADO = 'NUEVO';
const API_BASE_URL = 'http://localhost:3000';
```

### Formateo

**Usar Prettier:**
```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "tabWidth": 2,
  "printWidth": 100
}
```

**Ejecutar antes de commit:**
```bash
# Format manual
npx prettier --write "src/**/*.{ts,tsx,js,jsx}"

# O instalar extensión de VS Code y configurar format on save
```

### Linting

```bash
# Verificar errores
npm run lint

# Corregir automáticamente
npm run lint --fix
```

**Configuración ESLint:**
```javascript
// .eslintrc.js
module.exports = {
  extends: ['next/core-web-vitals', 'prettier'],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
};
```

---

## 🧪 Testing

### Escribir Tests

**Para componentes:**
```typescript
// src/components/__tests__/LeadCard.test.tsx
import { render, screen } from '@testing-library/react';
import { LeadCard } from '../LeadCard';

describe('LeadCard', () => {
  const mockLead: Lead = {
    id: '1',
    nombre: 'Test Lead',
    telefono: '+543704555123',
    estado: 'NUEVO',
    createdAt: new Date(),
  };
  
  it('debería renderizar el nombre del lead', () => {
    render(<LeadCard lead={mockLead} />);
    expect(screen.getByText('Test Lead')).toBeInTheDocument();
  });
  
  it('debería llamar onEdit cuando se hace click en editar', () => {
    const onEdit = jest.fn();
    render(<LeadCard lead={mockLead} onEdit={onEdit} />);
    
    screen.getByText('Editar').click();
    expect(onEdit).toHaveBeenCalledWith(mockLead);
  });
});
```

**Para APIs:**
```typescript
// src/app/api/leads/__tests__/route.test.ts
import { GET, POST } from '../route';
import { NextRequest } from 'next/server';

describe('/api/leads', () => {
  it('GET debería retornar lista de leads', async () => {
    const request = new NextRequest('http://localhost:3000/api/leads');
    const response = await GET(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.leads).toBeInstanceOf(Array);
  });
  
  it('POST debería crear un nuevo lead', async () => {
    const request = new NextRequest('http://localhost:3000/api/leads', {
      method: 'POST',
      body: JSON.stringify({
        nombre: 'Test',
        telefono: '+543704555999'
      })
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(201);
    expect(data.id).toBeDefined();
  });
});
```

**Para E2E:**
```typescript
// tests/leads.spec.ts
import { test, expect } from '@playwright/test';

test('debería crear un nuevo lead', async ({ page }) => {
  // Login
  await page.goto('/auth/signin');
  await page.fill('[name="email"]', 'admin@phorencial.com');
  await page.fill('[name="password"]', 'admin123');
  await page.click('[type="submit"]');
  
  // Ir a leads
  await page.goto('/leads');
  
  // Crear lead
  await page.click('[data-testid="new-lead-btn"]');
  await page.fill('[name="nombre"]', 'Test Lead');
  await page.fill('[name="telefono"]', '+543704555999');
  await page.click('[type="submit"]');
  
  // Verificar
  await expect(page.locator('text=Test Lead')).toBeVisible();
});
```

### Ejecutar Tests

```bash
# Todos los tests
npm test

# Tests unitarios
npm run test:jest

# Tests unitarios en watch
npm run test:jest:watch

# Tests E2E
npm run test:e2e

# Tests E2E específicos
npm run test:e2e:auth

# Con cobertura
npm run test:jest:coverage
```

### Cobertura Mínima

Tu PR debe mantener o mejorar la cobertura:

- ✅ **Servicios:** >80%
- ✅ **APIs:** >70%
- ✅ **Componentes:** >60%
- ✅ **Utilidades:** >90%

---

## 🔀 Pull Requests

### Antes de Crear el PR

**Checklist:**

```bash
# ✅ 1. Código formateado
npm run lint
npx prettier --write "src/**/*.{ts,tsx}"

# ✅ 2. Tests pasan
npm run test:jest
npm run test:e2e

# ✅ 3. Build funciona
npm run build

# ✅ 4. Type check
npm run type-check

# ✅ 5. Commits bien formados
git log --oneline
```

### Plantilla de PR

```markdown
## Descripción
Breve descripción de los cambios

## Tipo de Cambio
- [ ] Bug fix (cambio que corrige un issue)
- [ ] Nueva funcionalidad (cambio que agrega funcionalidad)
- [ ] Breaking change (cambio que rompe compatibilidad)
- [ ] Documentación

## ¿Cómo se ha probado?
Describe las pruebas realizadas

## Checklist
- [ ] Mi código sigue los estándares del proyecto
- [ ] He realizado self-review de mi código
- [ ] He comentado código complejo
- [ ] He actualizado la documentación
- [ ] Mis cambios no generan warnings
- [ ] He agregado tests que prueban mi fix/feature
- [ ] Tests nuevos y existentes pasan localmente
- [ ] Cambios dependientes han sido mergeados

## Screenshots (si aplica)
Agrega screenshots de cambios visuales
```

### Proceso de Review

1. **Crear PR**
   - Título descriptivo
   - Descripción completa
   - Screenshots si es UI

2. **Code Review**
   - Esperar review de mantenedor
   - Responder comentarios
   - Hacer cambios solicitados

3. **Aprobar y Merge**
   - Una vez aprobado
   - Squash merge (recomendado)
   - Delete branch después

---

## 📝 Estructura de Commits

### Conventional Commits

Usamos el formato [Conventional Commits](https://www.conventionalcommits.org/)

**Formato:**
```
<tipo>[alcance opcional]: <descripción>

[cuerpo opcional]

[footer opcional]
```

### Tipos de Commit

| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| `feat` | Nueva funcionalidad | `feat: agregar integración WhatsApp` |
| `fix` | Corrección de bug | `fix: corregir creación de pipeline` |
| `docs` | Documentación | `docs: actualizar API reference` |
| `style` | Formato (no afecta código) | `style: formatear con prettier` |
| `refactor` | Refactorización | `refactor: simplificar componente Lead` |
| `test` | Tests | `test: agregar tests de pipeline` |
| `chore` | Mantenimiento | `chore: actualizar dependencias` |
| `perf` | Performance | `perf: optimizar query de dashboard` |

### Ejemplos

**Commit simple:**
```bash
git commit -m "feat: agregar botón de exportar CSV"
```

**Commit con alcance:**
```bash
git commit -m "fix(auth): corregir validación de contraseña"
```

**Commit con cuerpo:**
```bash
git commit -m "feat: implementar sistema de permisos

- Agregar tabla de permisos
- Crear middleware de autorización
- Actualizar tipos TypeScript
- Agregar tests de permisos"
```

**Breaking change:**
```bash
git commit -m "feat!: migrar de Prisma a Supabase

BREAKING CHANGE: El cliente de base de datos cambió completamente.
Se requiere ejecutar migración manual de datos."
```

### Mensajes en Español

Para este proyecto, usamos mensajes en español:

```bash
✅ feat: agregar componente de conversaciones
✅ fix: corregir error en creación de pipeline
✅ docs: actualizar guía de setup
✅ refactor: simplificar lógica de autenticación
```

---

## 🎯 Buenas Prácticas

### Do's ✅

- ✅ Mantener PRs pequeños y enfocados
- ✅ Escribir tests para nuevo código
- ✅ Actualizar documentación relevante
- ✅ Hacer commits atómicos (un cambio lógico por commit)
- ✅ Responder reviews constructivamente
- ✅ Pedir ayuda cuando la necesites

### Don'ts ❌

- ❌ Commits con muchos cambios no relacionados
- ❌ Mensajes de commit vagos ("fix", "update")
- ❌ Pushear código sin testear
- ❌ Ignorar warnings del linter
- ❌ Cambiar múltiples cosas en un PR
- ❌ Comentar código en lugar de borrarlo

---

## 🏆 Reconocimiento

Los contribuyentes aparecerán en:
- README.md (sección Contributors)
- Release notes
- Changelog del proyecto

---

## 📞 ¿Necesitas Ayuda?

- 💬 **Issues de GitHub:** Para preguntas específicas
- 📧 **Email:** [contacto del proyecto]
- 💡 **Discussions:** Para ideas y propuestas

---

## 📄 Licencia

Al contribuir, aceptas que tus contribuciones se licenciarán bajo la misma licencia que el proyecto (MIT).

---

**¡Gracias por contribuir al CRM Phorencial!** 🎉

