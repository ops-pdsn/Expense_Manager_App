@echo off
echo Committing changes...
git add .
git commit -m "Fix 500 error on vouchers endpoint and add debugging tools"
echo Pushing to GitHub...
git push origin main
echo Done!
pause
