# Последний пассажир | Last Passenger

**SoloDefStudio** — атмосферная 2D Action RPG / Roguelite для Android.

## Первый прототип

- Ландшафтная ориентация и полноэкранный режим.
- Сенсорный виртуальный стик.
- Автоматическое преследование врагами.
- Ручная атака, огненный импульс и рывок.
- Сбор осколков памяти.
- Первый тестовый сектор: «Город без людей».

## Сборка APK

Каждый push в ветку `main` запускает GitHub Actions. Ручной запуск доступен во вкладке **Actions → Build Android APK → Run workflow**.

Готовый debug APK появится в разделе Artifacts соответствующего запуска. Это тестовая сборка, не релиз для Google Play.

## Техническая основа

Android WebView + HTML5 Canvas. Application ID: `com.solodefstudio.lastpassenger`.
