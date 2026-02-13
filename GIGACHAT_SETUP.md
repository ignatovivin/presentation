# Настройка GigaChat API от Сбера

## Шаг 1: Регистрация и получение ключа авторизации

1. Зарегистрируйтесь в личном кабинете Studio: https://developers.sber.ru
2. Создайте проект в разделе "AI-модели" → "GigaChat API"
3. Введите название проекта и примите условия пользовательского соглашения
4. Сгенерируйте ключ авторизации (Authorization key)

Ключ авторизации — это Base64-кодированная строка из **Client ID** и **Client Secret** (вид: `Base64(Client ID:Client Secret)`). В запросе передаётся только этот один ключ в заголовке `Authorization: Basic <ключ>` — **отдельно подставлять Client ID нигде не нужно**, он уже входит в ключ.

## Шаг 2: Настройка переменных окружения

Откройте файл `.env` и добавьте:

```env
# GigaChat API от Сбера
GIGACHAT_AUTH_KEY=ваш_ключ_авторизации_здесь

# Scope для GigaChat API:
# GIGACHAT_API_PERS - для физических лиц (по умолчанию)
# GIGACHAT_API_B2B - для ИП/юрлиц (платные пакеты)
# GIGACHAT_API_CORP - для ИП/юрлиц (pay-as-you-go)
GIGACHAT_SCOPE=GIGACHAT_API_PERS
```

## Шаг 3: Перезапуск сервера

После настройки переменных окружения перезапустите dev-сервер:

```bash
npm run dev
# или
yarn dev
```

## Как работает авторизация

1. При первом запросе система получает токен доступа через эндпоинт `/api/v2/oauth`
2. Токен кэшируется и действителен 30 минут
3. При истечении токена он автоматически обновляется
4. Все запросы к API используют токен доступа в заголовке `Authorization: Bearer <token>`

## Проверка после смены ключа/scope

- **Ключ:** в `.env` одна строка `GIGACHAT_AUTH_KEY=...` без кавычек и пробелов, значение — Base64(Client ID:Client Secret).
- **Scope:** один из `GIGACHAT_API_PERS` | `GIGACHAT_API_B2B` | `GIGACHAT_API_CORP`. Для физлиц — `GIGACHAT_API_PERS`.
- После правок `.env` перезапустите сервер (`yarn dev` или передеплой на Vercel).

## Эндпоинты и заголовки (сверено с документацией Сбера)

- **Получение токена:** `POST https://ngw.devices.sberbank.ru:9443/api/v2/oauth`
  - Заголовки: `Content-Type: application/x-www-form-urlencoded`, `Accept: application/json`, `RqUID: <uuid4>`, **`Authorization: Basic <ключ_авторизации>`** (ключ = Base64(Client ID:Client Secret))
  - Тело: `scope=GIGACHAT_API_PERS` (или `GIGACHAT_API_B2B`, `GIGACHAT_API_CORP`)
- **Генерация чата:** `POST https://gigachat.devices.sberbank.ru/api/v1/chat/completions`
  - Заголовки: `Content-Type: application/json`, `Accept: application/json`, **`Authorization: Bearer <access_token>`**

Если у вас «Неверный endpoint» или «Неправильный заголовок авторизации», проверьте:
1. Для токена — именно **Basic** и ключ в Base64, без лишних пробелов.
2. Для чата — именно **Bearer** и токен, полученный с эндпоинта `/api/v2/oauth`.
3. URL без опечаток: токен — `ngw.devices.sberbank.ru:9443`, чат — `gigachat.devices.sberbank.ru` (без порта).

## Модель и тело запроса

- **Модель** обязательно должна существовать в API (неверный идентификатор → 404). Разрешённые значения: `GigaChat-2`, `GigaChat-2-Lite`, `GigaChat-2-Pro`, `GigaChat-2-Max`. По умолчанию: `GigaChat-2-Pro`. В `.env`: `GIGACHAT_MODEL=GigaChat-2-Pro`.
- **Формат сообщений** строго по спецификации: массив объектов `{ role, content }`, где `role` — `system` или `user`, `content` — строка (UTF-8). Лишние поля в теле запроса не передаём.
- Другие опции: `GIGACHAT_OAUTH_URL`, `GIGACHAT_CHAT_BASE_URL` — только если используете другой контур/регион.

## Поддержка прокси

GigaChat API автоматически использует прокси из переменных окружения:
- `HTTP_PROXY` — для HTTP запросов
- `HTTPS_PROXY` — для HTTPS запросов (используется для GigaChat API)

## Документация

Полная документация доступна на: https://developers.sber.ru/docs/ru/gigachat/api/overview
