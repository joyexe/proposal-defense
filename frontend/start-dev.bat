@echo off
echo Starting Next.js with increased memory (4GB)...
node --max-old-space-size=4096 node_modules\.bin\next dev
pause
