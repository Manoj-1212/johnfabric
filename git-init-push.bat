@echo off
:: ─────────────────────────────────────────────────────────────
::  git-init-push.bat
::  Run ONCE from C:\xampp\htdocs\johnfabric to initialise the
::  local git repo and push to GitHub for the first time.
::
::  Usage:
::    git-init-push.bat <github-repo-url>
::  Example:
::    git-init-push.bat https://github.com/yourname/johnfabric.git
:: ─────────────────────────────────────────────────────────────
setlocal

if "%~1"=="" (
  echo Usage: git-init-push.bat ^<github-repo-url^>
  exit /b 1
)

set REPO_URL=%~1
set ROOT=%~dp0

cd /d "%ROOT%"

echo [1/5] Initialising git repo...
git init
git branch -M main

echo [2/5] Adding all files...
git add .

echo [3/5] Initial commit...
git commit -m "feat: initial MVP scaffold — FastAPI backend + Next.js configurator"

echo [4/5] Adding remote origin...
git remote remove origin 2>nul
git remote add origin %REPO_URL%

echo [5/5] Pushing to main...
git push -u origin main

echo.
echo Done! Repo pushed to %REPO_URL%
echo Next step: run  deploy-ec2.sh  on your EC2 instance.
