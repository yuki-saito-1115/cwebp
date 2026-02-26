@echo off
for %%f in (%*) do (
    "%~dp0node_modules\cwebp-bin\vendor\cwebp.exe" -q 100 "%%f" -o "%~dp0%%~nf.webp"
)
