@echo off
echo Agregando variables de entorno a Vercel...

echo.
echo Agregando NEXTAUTH_SECRET...
echo produccion-secret-key-muy-segura-2024-phorencial-crm | vercel env add NEXTAUTH_SECRET production

echo.
echo Agregando NEXTAUTH_URL...
echo https://phorencial-bot-8ztgzbllz-xorarg.vercel.app | vercel env add NEXTAUTH_URL production

echo.
echo Agregando JWT_SECRET...
echo jwt-secret-para-produccion-2024-phorencial | vercel env add JWT_SECRET production

echo.
echo Agregando ALLOWED_WEBHOOK_TOKEN...
echo super-seguro-webhook-token-produccion | vercel env add ALLOWED_WEBHOOK_TOKEN production

echo.
echo Agregando APP_ENV...
echo production | vercel env add APP_ENV production

echo.
echo Variables agregadas. Ejecutando redeploy...
vercel --prod

echo.
echo Deployment completado!
