@echo off
title FiveM Moderation Bot
:start
echo Bot baslatiliyor (npm start)...
npm start
echo Bot kapandi, 5 saniye icinde tekrar baslatiliyor...
timeout /t 5
goto start
