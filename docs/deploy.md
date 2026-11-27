# Бесплатный деплой: Vercel, Render, Neon, Google Apps Script

Это демо для портфолио, а не надёжный круглосуточный мониторинг:

- бесплатный API на Render засыпает после 15 минут без входящих запросов,
  и проверки сайтов в это время не идут;
- бесплатный Redis (Render Key Value) хранит данные только в памяти.

Условия бесплатных тарифов меняются. Если сервис просит карту, остановитесь.
Секреты вносятся только в настройки хостинга, не в репозиторий.

## 1. База данных (Neon)

1. Создайте проект. Выберите регион рядом с будущим регионом Render.
2. В окне Connect отключите Connection pooling и скопируйте строку подключения.
   Это будет `DATABASE_URL`.

## 2. Почта (Google Apps Script)

Бесплатный Render закрывает SMTP-порты, поэтому API отправляет запрос по HTTPS
скрипту в Google-аккаунте, а тот отправляет письмо из Gmail.

1. На https://script.google.com создайте новый проект.
2. Замените содержимое `Code.gs` кодом из `apps/api/mail-script/Code.gs`
   и сохраните.
3. Создайте случайную строку (команда есть в разделе 4). В Project Settings →
   Script Properties добавьте свойство `MAIL_SECRET` с этой строкой.
   Это же значение будет `MAIL_SCRIPT_SECRET`.
4. В редакторе выберите функцию `authorize`, нажмите Run и разрешите отправку
   писем. Google может предупредить, что приложение не проверено: это ваш
   собственный скрипт. Проверьте название проекта и свой адрес.
5. Deploy → New deployment → тип Web app. Execute as: **Me**,
   Who has access: **Anyone**.
6. Скопируйте URL веб-приложения (заканчивается на `/exec`).
   Это `MAIL_SCRIPT_URL`.

Доступ **Anyone** нужен, потому что сервер не входит в Google-аккаунт.
Запросы без секрета скрипт отклоняет. Тот, кто знает и URL, и секрет, может
отправлять письма от вашего имени. Не публикуйте их. Если они утекли, замените
`MAIL_SECRET` здесь и `MAIL_SCRIPT_SECRET` на Render.

Ограничения:

- получатели видят ваш Gmail-адрес;
- для обычного Gmail лимит 100 получателей в день;
- письма могут попадать в «Спам».

После изменения кода скрипта обновите развёртывание: Deploy → Manage
deployments → Edit → Version: New version. Тогда URL не изменится.

## 3. Redis (Render Key Value)

Создайте бесплатный Key Value. Maxmemory policy: `noeviction`
(этого требует BullMQ). Скопируйте **Internal URL**. Это будет `REDIS_URL`.

## 4. API (Render Web Service)

- Репозиторий: pingboard, ветка `main`
- Language: Docker
- Root Directory: `apps/api`
- Регион: тот же, что у Key Value
- Instance Type: Free
- Health Check Path: `/`

Переменные окружения:

| Имя                    | Значение                                      |
| ---------------------- | --------------------------------------------- |
| `NODE_ENV`             | `production`                                  |
| `DATABASE_URL`         | из Neon                                       |
| `REDIS_URL`            | Internal URL из Key Value                     |
| `JWT_ACCESS_SECRET`    | новая случайная строка                        |
| `JWT_REFRESH_SECRET`   | другая новая случайная строка                 |
| `MAIL_SCRIPT_URL`      | URL веб-приложения (шаг 2)                    |
| `MAIL_SCRIPT_SECRET`   | то же значение, что `MAIL_SECRET` в скрипте   |
| `WEB_URL`              | адрес сайта на Vercel без `/` в конце (шаг 5) |
| `GOOGLE_CLIENT_ID`     | из Google Cloud                               |
| `GOOGLE_CLIENT_SECRET` | из Google Cloud                               |
| `LOG_CLIENT_IP`        | `true`, временно (шаг 7)                      |

Случайную строку можно получить командой:

```
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Пока адрес Vercel неизвестен, задайте `WEB_URL=http://localhost:3000`.
Миграции базы применяются сами при запуске контейнера.

## 5. Фронтенд (Vercel)

- Root Directory: `apps/web`
- Framework Preset: Next.js
- Переменная `API_URL`: адрес API на Render без `/` в конце

`API_URL` используется во время сборки. После его изменения нужен Redeploy.

Затем укажите адрес сайта в `WEB_URL` на Render и перезапустите API.
Используйте постоянный адрес проекта, а не адрес отдельной сборки.

## 6. Google OAuth

Добавьте клиенту ещё один Redirect URI:
`https://ВАШ-САЙТ.vercel.app/auth/google/callback`

Локальный адрес не удаляйте. Пока приложение в режиме тестирования,
войти смогут только тестовые пользователи.

## 7. Настройка TRUST_PROXY

API стоит за несколькими прокси. Без настройки все пользователи могут
выглядеть как один IP и делить общий лимит.

1. Узнайте свой внешний IP.
2. Откройте сайт на Vercel и попробуйте войти.
3. В логах Render найдите строку `ClientIp` и значение `x-forwarded-for`.
4. Посчитайте с конца списка, на каком месте ваш IP (последний это 1).
5. Задайте это число в `TRUST_PROXY`, перезапустите API и проверьте,
   что в строке `ip=` теперь ваш IP.
6. Удалите `LOG_CLIENT_IP` и не публикуйте эти логи.

API на Render доступен и напрямую, минуя Vercel. Там цепочка прокси короче,
поэтому IP можно подделать. Поэтому в проекте есть лимиты, не зависящие от IP:
на аккаунт при входе и общий суточный на регистрацию.

## 8. Администратор

В SQL Editor в Neon:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'ваш-email';
```
