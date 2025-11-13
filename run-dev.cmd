@echo off
echo Starting Next.js development server on port 3001...
set DATABASE_URL=file:./dev.db
set NEXTAUTH_SECRET=desarrollo-local-secret-key-muy-segura-2024
set NEXTAUTH_URL=http://localhost:3001
set JWT_SECRET=jwt-secret-para-desarrollo-local-2024
set ALLOWED_WEBHOOK_TOKEN=super-seguro
set APP_ENV=development

npx next dev -p 3001
