1. Клонировать репозиторий

2. В файле data/conf.json заменить параметры:

    telegramBotToken: токен телеграм бота
    supportChatId: id чата для техподдержки
    CompanyName: название компании (для приветствия)   
    glpiConfig: 
        apiurl: "http://[имя домена]/apirest.php"
        app_token: это токен приложения, настраивается в админке 
        user_token: это "app-token" в настройках юзера
        user_id: id юзера, через которого будет авторизироваться бот (видно в адресной строке)

3. В файле data/dataId.json в параметре "ticket" желательно указать номер последней заявки
4. Проверить в telegram_support.service путь к исполняемому файлу и добавить его в папку /etc/systemd/system/ (для debian)
5. Для работы бота должен быть установлен node.js (все остальные зависимости находятся в папке node_modules)
6. Обновить демоны командой:

>   systemctl daemon-reload

Запустить его:

>   systemctl start telegram_support.service --now


**Создание образа и запуск его в docker-контейнере**

1. Выполнить первые 3 пункта из инструкции выше
2. Перейти в папку telegram-support-bot
3. Запустить контейнер командой:

>   docker compose up -d --build


