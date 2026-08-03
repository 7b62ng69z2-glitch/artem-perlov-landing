# Лендинг Артёма Перлова — этап 2

Форма настроена на одновременную отправку заявки:

1. в Telegram;
2. на `a_perlov@mail.ru`.

Секреты не записаны в код. Их нужно добавить в настройках Vercel как переменные окружения.

## Что подготовить

- аккаунт GitHub;
- аккаунт Vercel;
- Telegram-бот и его токен;
- Telegram chat ID;
- пароль Mail.ru для внешнего приложения.

## Переменные окружения

Скопируйте названия из `.env.example` в Vercel → Project → Settings → Environment Variables.

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `SMTP_HOST` = `smtp.mail.ru`
- `SMTP_PORT` = `465`
- `SMTP_USER` = `a_perlov@mail.ru`
- `SMTP_PASS`
- `LEAD_EMAIL_TO` = `a_perlov@mail.ru`

После добавления переменных сделайте Redeploy.

## Проверка

1. Откройте `/api/health` на опубликованном домене.
2. Ожидаемый ответ:
   `{"ok":true,"configured":{"telegram":true,"email":true}}`
3. Отправьте тестовую заявку через форму.
4. Проверьте Telegram, входящие Mail.ru и папку «Спам».
