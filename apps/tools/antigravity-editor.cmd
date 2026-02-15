@echo off
setlocal enabledelayedexpansion

set "ARG=%~1"

REM Remove file:// if present
set "ARG=%ARG:file:///=%"
set "ARG=%ARG:file://=%"

REM -----------------------------
REM Extract :line:col (if present)
REM -----------------------------
set "LINE="
set "COL="
set "BASE=%ARG%"

for /f "tokens=1,2,3 delims=:" %%A in ("%ARG%") do (
  set "P1=%%A"
  set "P2=%%B"
  set "P3=%%C"
)

REM Handle Windows drive path: D:\... (P1 = D, P2 begins with \...)
REM Detect if token1 is a drive letter and token2 starts with "\"
echo(!P2! | findstr /B "\\" >nul
if not errorlevel 1 (
  REM It's a drive path.
  REM BASE = P1:P2, LINE = P3, COL = token4 (needs another split)
  set "BASE=!P1!:!P2!"
  set "REST=!P3!"

  REM REST is like "123:5" OR maybe just "123"
  for /f "tokens=1,2 delims=:" %%X in ("!REST!") do (
    set "LINE=%%X"
    set "COL=%%Y"
  )
) else (
  REM Not a drive path. Could be "LoginView.vue:123:5" or "path\file.vue:123:5"
  REM If it ends with :number:number treat as line/col
  for /f "tokens=1,2,3 delims=:" %%A in ("%ARG%") do (
    set "BASE=%%A"
    set "LINE=%%B"
    set "COL=%%C"
  )
)

REM If LINE or COL are not numbers, drop them
echo(!LINE!| findstr /R "^[0-9][0-9]*$" >nul || set "LINE="
echo(!COL!| findstr /R "^[0-9][0-9]*$" >nul || set "COL="

REM -----------------------------
REM If BASE is just a filename, search in project src roots
REM -----------------------------
set "FOUND=%BASE%"

echo %BASE% | findstr /R "[\\/]" >nul
if errorlevel 1 (
  set "ROOT=%CD%"
  set "CAND1=%ROOT%\apps\ui\src"
  set "CAND2=%ROOT%\apps\ui2\src"
  set "CAND3=%ROOT%\src"

  for /R "%CAND1%" %%F in ("%BASE%") do (set "FOUND=%%F" & goto :GOTO)
  for /R "%CAND2%" %%F in ("%BASE%") do (set "FOUND=%%F" & goto :GOTO)
  for /R "%CAND3%" %%F in ("%BASE%") do (set "FOUND=%%F" & goto :GOTO)
)

:GOTO
REM Re-attach line/col if present
if defined LINE (
  if defined COL (
    antigravity --goto "%FOUND%:%LINE%:%COL%"
    exit /b %ERRORLEVEL%
  )
  antigravity --goto "%FOUND%:%LINE%:1"
  exit /b %ERRORLEVEL%
)

REM -----------------------------
REM Open in Antigravity
REM -----------------------------

@REM DEBUG "%FOUND%"

REM antigravity --goto "%FOUND%"

antigravity --goto "%FOUND%"
exit /b %ERRORLEVEL%
