@echo off
setlocal
cd /d "%~dp0"
title D-Flow Setup and Launcher
echo.
echo ==================================================
echo               D-Flow Setup and Launcher
echo ==================================================
echo.
py -3 -c "import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)" >nul 2>&1
if not errorlevel 1 goto use_py
python -c "import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)" >nul 2>&1
if not errorlevel 1 goto use_python
echo Python 3.10 or newer is required.
echo Install Python from https://www.python.org/downloads/windows/
echo Enable the Python launcher or Add Python to PATH during installation.
echo Then run this file again.
pause
exit /b 1

:use_py
py -3 "%~dp0setup_dflow.py"
goto finished

:use_python
python "%~dp0setup_dflow.py"

:finished
if errorlevel 1 (
    echo.
    echo Setup or startup could not finish. See the message above.
    pause
    exit /b 1
)
endlocal
