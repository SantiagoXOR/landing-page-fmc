@echo off
echo Iniciando servidor con configuracion SSL para desarrollo...
set NODE_TLS_REJECT_UNAUTHORIZED=0
npm run dev
