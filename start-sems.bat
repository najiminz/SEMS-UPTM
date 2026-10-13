@echo off
setlocal
title SEMS Launcher
cd /d "%~dp0"

set "XAMPP=C:\xampp"
set "START_APACHE=1"
set "APP_URL=http://localhost:5173"

echo.
echo  === SEMS - Secure Event Management System ===
echo.

if not exist "%XAMPP%\mysql_start.bat" (
  echo [MySQL]    XAMPP not found at %XAMPP% - edit XAMPP= at the top of this file.
  goto :backend
)
netstat -ano | findstr /R /C:":3306 .*LISTENING" >nul
if %errorlevel%==0 (
  echo [MySQL]    already running
) else (
  echo [MySQL]    starting...
  start "SEMS MySQL - jangan tutup" /d "%XAMPP%" /min "%XAMPP%\mysql_start.bat"
)

if "%START_APACHE%"=="1" if exist "%XAMPP%\apache_start.bat" (
  netstat -ano | findstr /R /C:":80 .*LISTENING" >nul
  if errorlevel 1 (
    echo [Apache]   starting...
    start "SEMS Apache - jangan tutup" /d "%XAMPP%" /min "%XAMPP%\apache_start.bat"
  ) else (
    echo [Apache]   already running
  )
)

:backend
if not exist "backend\node_modules" (
  echo [Backend]  first run - installing dependencies...
  pushd backend
  call npm install
  popd
)
netstat -ano | findstr /R /C:":5000 .*LISTENING" >nul
if %errorlevel%==0 (
  curl -s http://localhost:5000/api/health | findstr /C:"ok" >nul
  if errorlevel 1 (
    echo [Backend]  WARNING: port 5000 is used by another program, not SEMS.
    echo            Close that program, then run this file again.
  ) else (
    echo [Backend]  already running
  )
) else (
  echo [Backend]  starting...
  start "SEMS Backend" /d "%~dp0backend" cmd /k npm run dev
)

if not exist "frontend\node_modules" (
  echo [Frontend] first run - installing dependencies...
  pushd frontend
  call npm install
  popd
)
netstat -ano | findstr /R /C:":5173 .*LISTENING" >nul
if %errorlevel%==0 (
  echo [Frontend] already running
) else (
  echo [Frontend] starting...
  start "SEMS Frontend" /d "%~dp0frontend" cmd /k npm run dev
)

echo.
echo Waiting for the app to be ready...
set /a tries=0
:wait
curl -s -o nul http://localhost:5173 && curl -s http://localhost:5000/api/health | findstr /C:"ok" >nul && goto :ready
set /a tries+=1
if %tries% geq 60 goto :timeout
timeout /t 1 /nobreak >nul
goto :wait

:ready
echo Ready. Opening %APP_URL%
start "" "%APP_URL%"
echo.
echo SEMS is running. To stop it, close the MySQL / Backend / Frontend windows.
timeout /t 4 /nobreak >nul
exit /b 0

:timeout
echo.
echo The app did not come up within 60 seconds. Check the Backend and Frontend
echo windows for errors (common cause: port 5000 already in use).
pause
exit /b 1
