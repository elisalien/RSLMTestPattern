@echo off
rem Lance Mires Resolume en local (DXV / HAP / ProRes via ffmpeg)
cd /d "%~dp0"
if not exist node_modules (
  echo Installation des dependances...
  call npm install || goto :err
)
echo Construction de l app...
call npx vite build --logLevel warn || goto :err
node server\serve.mjs --open
goto :eof
:err
echo Echec. Verifie que Node.js est installe.
pause
