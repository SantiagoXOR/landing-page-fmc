@echo off
echo.
echo 🔧 SOLUCIONADOR DE PROBLEMAS DE GITHUB PUSH
echo ==========================================
echo.

if "%1"=="" (
    echo ❌ Error: Debes proporcionar el nuevo token de GitHub
    echo.
    echo 📋 Uso: fix-github-push.cmd "tu_nuevo_token_aqui"
    echo.
    echo 🔗 Para crear un nuevo token, ve a:
    echo    https://github.com/settings/tokens/new
    echo.
    echo 📝 Scopes necesarios:
    echo    ✅ repo (Full control of private repositories)
    echo    ✅ workflow (Update GitHub Action workflows)
    echo    ✅ write:packages (Upload packages)
    echo.
    pause
    exit /b 1
)

set NEW_TOKEN=%1

echo 🧹 Limpiando configuración anterior...
git config --global --unset credential.helper 2>nul
cmdkey /delete:LegacyGeneric:target=git:https://github.com 2>nul

echo.
echo 🔗 Configurando nuevo remote con token...
git remote set-url origin https://SantiagoXOR:%NEW_TOKEN%@github.com/SantiagoXOR/phorencial-bot-crm.git

echo.
echo 🔐 Configurando credential helper...
git config --global credential.helper store

echo.
echo ✅ Verificando configuración...
git remote -v

echo.
echo 🚀 Intentando push...
git push origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo 🎉 ¡PUSH EXITOSO!
    echo ✅ El código se subió correctamente a GitHub
    echo 📦 Commit hash: 7087d05
    echo 📁 Archivos: 49 modificados, 14,208 líneas agregadas
) else (
    echo.
    echo ❌ Error en el push
    echo.
    echo 🔍 Posibles soluciones:
    echo    1. Verifica que el token tenga scope 'repo'
    echo    2. Verifica que el token no haya expirado
    echo    3. Verifica que tengas permisos en el repositorio
    echo.
    echo 🔗 Crear nuevo token: https://github.com/settings/tokens/new
)

echo.
pause
