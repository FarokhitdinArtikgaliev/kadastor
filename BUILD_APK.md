# Сборка APK через GitHub Actions

1. Создайте новый приватный репозиторий на GitHub.
2. Загрузите содержимое этого проекта в репозиторий.
3. Перейдите во вкладку **Actions**.
4. Выберите **Build Android APK**.
5. Нажмите **Run workflow**.
6. После завершения откройте выполненный workflow.
7. Внизу страницы скачайте artifact **Kadastr-Marshrut-v5-debug**.
8. Внутри будет `Kadastr-Marshrut-v5-debug.apk`.

Workflow автоматически:
- устанавливает Node.js и Capacitor;
- создаёт Android-проект;
- добавляет Internet/GPS permissions;
- синхронизирует `www`;
- собирает debug APK;
- публикует APK как GitHub Actions Artifact.
