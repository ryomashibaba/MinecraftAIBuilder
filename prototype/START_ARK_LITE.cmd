@echo off
setlocal
chcp 65001 >nul
pushd "%~dp0"
if errorlevel 1 goto ERROR
where node >nul 2>nul
if errorlevel 1 goto ERROR
node --version
if not exist "node_modules\socket-be\package.json" (
  echo First run: installing the previously verified socket-be 2.8.0 library.
  call npm.cmd install --ignore-scripts --no-audit --no-fund --omit=dev
  if errorlevel 1 goto ERROR
)
echo.
echo ARK-LITE-P0 48x40 Education TEST WORLD terminal.
echo 1 = READ-ONLY full site inspection ^(default^)
echo 2 = BUILD only after explicit approval and typed test-world confirmation
echo 3 = CLEAN UP blocks from this prototype's own matching journal
echo 4 = offline geometry summary
set /p MODE=Choose 1 / 2 / 3 / 4 [1]:
if "%MODE%"=="" set "MODE=1"
if "%MODE%"=="1" goto SURVEY
if "%MODE%"=="2" goto BUILD
if "%MODE%"=="3" goto CLEAN
if "%MODE%"=="4" goto INSPECT
goto ERROR
:SURVEY
node runner.mjs --survey
goto END
:BUILD
echo WARNING: You must already have explicitly authorized THIS test world in Chat.
echo No project-wide construction permission is granted.
node runner.mjs --build
goto END
:CLEAN
node runner.mjs --cleanup
goto END
:INSPECT
node runner.mjs --inspect
goto END
:ERROR
echo STOP: No game blocks were intentionally modified by this launcher.
set "RC=1"
goto FINISH
:END
set "RC=%errorlevel%"
:FINISH
echo.
echo Diagnostic: data\ARK_LITE_LAST_REPORT.json
echo Durable journal: data\ARK_LITE_STAGE_JOURNAL.json
pause
popd
endlocal & exit /b %RC%
