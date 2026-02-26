@echo off
cd /d "%~dp0"
node "%~dp0scripts\convert.js" %*
