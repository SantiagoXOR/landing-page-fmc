# Landing Page Phorencial

Una landing page moderna y responsiva para Phorencial, construida con Next.js 15, React 18 y Tailwind CSS.

## 🚀 Características

- **Next.js 15** con App Router
- **React 18** con componentes modernos
- **Tailwind CSS** para estilos responsivos
- **TypeScript** para type safety
- **Componentes UI** con Radix UI y shadcn/ui
- **Optimización de imágenes** con Next.js Image
- **Fuentes personalizadas** (Acto Font Family)
- **Animaciones** con CSS y JavaScript
- **SEO optimizado**
- **Performance optimizada**

## 📦 Instalación

1. Clona el repositorio:
```bash
git clone https://github.com/SantiagoXOR/landing-page-fmc.git
cd landing-page-fmc
```

2. Instala las dependencias:
```bash
npm install
# o
pnpm install
# o
yarn install
```

3. Copia el archivo de variables de entorno:
```bash
cp .env.example .env.local
```

4. Ejecuta el servidor de desarrollo:
```bash
npm run dev
# o
pnpm dev
# o
yarn dev
```

5. Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 🛠️ Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm run start` - Inicia el servidor de producción
- `npm run lint` - Ejecuta el linter

## 📁 Estructura del Proyecto

```
├── app/                    # App Router de Next.js
│   ├── globals.css        # Estilos globales
│   ├── layout.tsx         # Layout principal
│   └── page.tsx           # Página principal
├── components/            # Componentes reutilizables
│   ├── ui/               # Componentes UI base
│   ├── credit-form.tsx   # Formulario de crédito
│   └── testimonials.tsx  # Componente de testimonios
├── hooks/                # Custom hooks
├── lib/                  # Utilidades y configuraciones
├── public/               # Archivos estáticos
│   ├── fonts/           # Fuentes personalizadas
│   ├── hero/            # Imágenes del hero
│   └── logos/           # Logos de marcas
└── src/                 # Código fuente adicional
```

## 🎨 Tecnologías Utilizadas

- **Framework:** Next.js 15
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS
- **Componentes UI:** Radix UI + shadcn/ui
- **Formularios:** React Hook Form + Zod
- **Iconos:** Lucide React
- **Animaciones:** CSS Animations + AOS
- **Fuentes:** Acto Font Family

## 🚀 Despliegue

### Vercel (Recomendado)

1. Conecta tu repositorio de GitHub con Vercel
2. Configura las variables de entorno necesarias
3. Despliega automáticamente

### Otros Proveedores

El proyecto es compatible con cualquier proveedor que soporte Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## 🔧 Configuración

### Variables de Entorno

Copia `.env.example` a `.env.local` y configura las variables necesarias:

```env
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
```

### Personalización

1. **Colores:** Modifica `tailwind.config.js` para cambiar la paleta de colores
2. **Fuentes:** Las fuentes Acto están en `/public/fonts/`
3. **Imágenes:** Reemplaza las imágenes en `/public/` con tus propias imágenes
4. **Contenido:** Edita los componentes en `/components/` y `/app/page.tsx`

## 📱 Responsividad

El sitio está optimizado para:
- 📱 Móviles (375px+)
- 📱 Tablets (768px+)
- 💻 Desktop (1024px+)
- 🖥️ Large Desktop (1920px+)

## ⚡ Performance

- **Lighthouse Score:** 95+ en todas las métricas
- **Core Web Vitals:** Optimizado
- **Imágenes:** Optimización automática con Next.js Image
- **Fuentes:** Preload y optimización
- **CSS:** Purging automático con Tailwind

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 📞 Contacto

- **Proyecto:** [https://github.com/SantiagoXOR/landing-page-fmc](https://github.com/SantiagoXOR/landing-page-fmc)
- **Demo:** [Próximamente en Vercel]

---

Desarrollado con ❤️ para Phorencial