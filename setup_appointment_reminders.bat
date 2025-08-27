@echo off
echo ========================================
echo   Amieti Appointment Reminder Setup
echo ========================================
echo.

echo This script will help you set up the appointment reminder system.
echo.

REM Check if we're in the right directory
if not exist "manage.py" (
    echo Error: manage.py not found. Please run this script from the backend directory.
    echo Current directory: %CD%
    pause
    exit /b 1
)

echo Step 1: Running database migrations...
python manage.py migrate
if %errorlevel% neq 0 (
    echo Error: Database migration failed.
    pause
    exit /b 1
)
echo ✓ Database migrations completed successfully.
echo.

echo Step 2: Testing the reminder system (dry run)...
python manage.py send_appointment_reminders --dry-run
if %errorlevel% neq 0 (
    echo Error: Reminder system test failed.
    pause
    exit /b 1
)
echo ✓ Reminder system test completed successfully.
echo.

echo Step 3: Setting up automated reminders...
echo.
echo Choose an option:
echo 1. Create Windows Task Scheduler task (recommended)
echo 2. Manual setup instructions
echo 3. Exit
echo.
set /p choice="Enter your choice (1-3): "

if "%choice%"=="1" (
    echo.
    echo Creating Windows Task Scheduler task...
    echo.
    
    REM Get the current directory
    set "current_dir=%CD%"
    
    REM Create the task
    schtasks /create /tn "Amieti Appointment Reminders" /tr "python manage.py send_appointment_reminders" /sc minute /mo 1 /st 00:00 /sd %date% /f /ru "SYSTEM" /rl highest /it /np /s %computername% /ru "%username%" /rp "" /s %computername%
    
    if %errorlevel% equ 0 (
        echo ✓ Task created successfully!
        echo.
        echo Task details:
        echo - Name: Amieti Appointment Reminders
        echo - Schedule: Every minute
        echo - Command: python manage.py send_appointment_reminders
        echo - Working directory: %current_dir%
        echo.
        echo The task will start running immediately.
    ) else (
        echo Error: Failed to create task. You may need to run as administrator.
        echo.
        echo Manual setup instructions:
        echo 1. Open Task Scheduler as Administrator
        echo 2. Create a new Basic Task
        echo 3. Name: Amieti Appointment Reminders
        echo 4. Trigger: Every minute
        echo 5. Action: Start a program
        echo 6. Program: python
        echo 7. Arguments: manage.py send_appointment_reminders
        echo 8. Start in: %current_dir%
    )
) else if "%choice%"=="2" (
    echo.
    echo Manual Setup Instructions:
    echo =========================
    echo.
    echo 1. Open Task Scheduler (search in Start menu)
    echo 2. Click "Create Basic Task" in the right panel
    echo 3. Name: Amieti Appointment Reminders
    echo 4. Description: Send appointment reminders every minute
    echo 5. Click Next
    echo 6. Trigger: Daily
    echo 7. Click Next
    echo 8. Start time: 00:00:00
    echo 9. Click Next
    echo 10. Action: Start a program
    echo 11. Click Next
    echo 12. Program/script: python
    echo 13. Add arguments: manage.py send_appointment_reminders
    echo 14. Start in: %CD%
    echo 15. Click Next
    echo 16. Check "Open the Properties dialog for this task when I click Finish"
    echo 17. Click Finish
    echo 18. In Properties dialog:
    echo    - Go to Triggers tab
    echo    - Edit the trigger
    echo    - Change "Daily" to "At startup"
    echo    - Check "Repeat task every: 1 minute"
    echo    - Set "for a duration of: Indefinitely"
    echo 19. Click OK to save
    echo.
    echo The task will now run every minute and send appointment reminders.
) else (
    echo Exiting...
    exit /b 0
)

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo The appointment reminder system is now set up and will:
echo - Send email reminders 10 minutes before appointments
echo - Show reminder notifications in the web interface
echo - Track when reminders were sent to avoid duplicates
echo.
echo To test the system:
echo 1. Create an appointment for 10 minutes from now
echo 2. Wait for the reminder to be sent
echo 3. Check the notifications in the web interface
echo.
echo For more information, see APPOINTMENT_REMINDERS_README.md
echo.
pause
