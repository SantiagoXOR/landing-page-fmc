#!/bin/bash
# Script para configurar Manychat en el CRM

echo "=================================================="
echo "  Configuración de Manychat para Phorencial CRM"
echo "=================================================="
echo ""

ENV_PATH=".env.local"
WEBHOOK_SECRET="manychat-webhook-secret-temporal-2024-formosa-moto-credito"

echo "📝 Variables de Manychat a configurar:"
echo ""
echo -e "\033[0;32mMANYCHAT_API_KEY=3724482:1bf0d7525e7c87d854d087f44afae137\033[0m"
echo -e "\033[0;32mMANYCHAT_BASE_URL=https://api.manychat.com\033[0m"
echo -e "\033[0;32mMANYCHAT_WEBHOOK_SECRET=$WEBHOOK_SECRET\033[0m"
echo -e "\033[0;32mWHATSAPP_PHONE_NUMBER=5493704069592\033[0m"
echo ""

echo "📋 Instrucciones:"
echo "1. Abre el archivo .env.local en tu editor"
echo "2. Agrega las líneas mostradas arriba"
echo "3. Guarda el archivo"
echo "4. Ejecuta: npm run db:push"
echo "5. Ejecuta: npm run manychat:test"
echo ""

# Verificar si existe .env.local
if [ -f "$ENV_PATH" ]; then
    echo "✅ Archivo .env.local encontrado"
    echo ""
    echo "⚠️  IMPORTANTE: Agrega las variables de Manychat al archivo existente"
else
    echo "❌ Archivo .env.local NO encontrado"
    echo ""
    echo "Creando archivo .env.local base..."
    
    cat > "$ENV_PATH" << 'EOF'
# Database - Supabase PostgreSQL
DATABASE_URL="postgresql://postgres.[PROJECT_ID]:[DB_PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.[PROJECT_ID]:[DB_PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT_ID].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."

# NextAuth
NEXTAUTH_SECRET="desarrollo-local-secret-key-muy-segura-2024"
NEXTAUTH_URL="http://localhost:3000"
JWT_SECRET="jwt-secret-para-desarrollo-local-2024"
ALLOWED_WEBHOOK_TOKEN="super-seguro"
APP_ENV="development"

# Manychat Configuration
MANYCHAT_API_KEY=3724482:1bf0d7525e7c87d854d087f44afae137
MANYCHAT_BASE_URL=https://api.manychat.com
MANYCHAT_WEBHOOK_SECRET=manychat-webhook-secret-temporal-2024-formosa-moto-credito

# WhatsApp
WHATSAPP_PHONE_NUMBER=5493704069592
EOF
    
    echo "✅ Archivo .env.local creado con configuración base"
    echo "⚠️  Recuerda actualizar las credenciales de Supabase"
fi

echo ""
echo "=================================================="
echo "  Próximos pasos:"
echo "=================================================="
echo ""
echo "1. Ejecutar migración: npm run db:push"
echo "2. Probar integración: npm run manychat:test"
echo "3. Iniciar servidor: npm run dev"
echo ""
echo "📚 Documentación completa en: MANYCHAT-QUICKSTART.md"
echo ""

