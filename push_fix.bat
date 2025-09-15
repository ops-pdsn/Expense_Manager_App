@echo off
cd /d "F:\website\PDSN_Expense_Manager_App"
git add vercel.json
git commit -m "Fix vercel.json runtime to nodejs18.x format"
git push ops-pdsn main
echo Done!
pause
