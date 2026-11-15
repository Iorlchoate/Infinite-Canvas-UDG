@echo off
cd /d "%~dp0"

set "PYEXE=%~dp0python\python.exe"
if not exist "%PYEXE%" set "PYEXE=python"

REM ---- Dependency self-check: auto-install if missing (offline packages first) ----
"%PYEXE%" -c "import requests, fastapi, uvicorn, PIL, multipart, httpx" >nul 2>&1
if errorlevel 1 (
    echo [INFO] Missing dependencies. Installing...
    echo.
    call "%~dp0install-deps.bat" nopause
    if errorlevel 1 (
        echo.
        echo [ERROR] Dependency installation failed.
        echo Please run install-deps.bat manually and check the messages above.
        pause
        exit /b 1
    )
    REM Re-check after install
    "%PYEXE%" -c "import requests, fastapi, uvicorn, PIL, multipart, httpx" >nul 2>&1
    if errorlevel 1 (
        echo.
        echo [ERROR] Dependencies still missing after install.
        echo Please run install-deps.bat manually and check the messages above.
        pause
        exit /b 1
    )
    echo [OK] Dependencies ready.
    echo.
)

REM ---- Port probe: fall back to next free port if 3000 is taken ----
set "PORTFILE=%TEMP%\infinite_canvas_udg.port"
set "PORT=3000"
"%PYEXE%" "%~dp0tools\pick_port.py" 3000 20 > "%PORTFILE%" 2>nul
if exist "%PORTFILE%" set /p PORT=<"%PORTFILE%"
del "%PORTFILE%" >nul 2>&1
set "CANVAS_PORT=%PORT%"

echo Starting Infinite Canvas ...
echo Visit: http://127.0.0.1:%PORT%/
set "IPFILE=%TEMP%\infinite_canvas_udg.ip"
if exist "%IPFILE%" del "%IPFILE%" >nul 2>&1
"%PYEXE%" "%~dp0tools\lan_ip.py" > "%IPFILE%" 2>nul
if exist "%IPFILE%" set /p LANIP=<"%IPFILE%"
del "%IPFILE%" >nul 2>&1
if defined LANIP if not "%LANIP%"=="127.0.0.1" echo Same Wi-Fi (phone/tablet): http://%LANIP%:%PORT%/
echo Press Ctrl+C to stop.
echo.

REM Open the browser from a separate process, after the port accepts connections.
REM This avoids relying on uvicorn's startup thread or the webbrowser controller.
REM A dedicated Chrome/Edge profile guarantees a visible window instead of a
REM background tab in the user's existing browser session.
set "CANVAS_NO_BROWSER=1"
start "" /b powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\open_browser.ps1" -Url "http://127.0.0.1:%PORT%/" -Profile "%~dp0data\browser-profile" >nul 2>&1
"%PYEXE%" main.py

echo.
echo Server stopped.
pause
