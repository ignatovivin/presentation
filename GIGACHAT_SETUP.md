# Настройка GigaChat API от Сбера

## Шаг 1: Регистрация и получение ключа авторизации

1. Зарегистрируйтесь в личном кабинете Studio: https://developers.sber.ru
2. Создайте проект в разделе "AI-модели" → "GigaChat API"
3. Введите название проекта и примите условия пользовательского соглашения
4. Сгенерируйте ключ авторизации (Authorization key)

Ключ авторизации — это Base64-кодированная строка из Client ID и Client Secret.

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

## Эндпоинты

- **Получение токена:** `https://ngw.devices.sberbank.ru:9443/api/v2/oauth`
- **Генерация чата:** `https://gigachat.devices.sberbank.ru/api/v1/chat/completions`

## Модель

По умолчанию используется модель `GigaChat`. Вы можете изменить её в файле `app/api/ai/generate/route.ts`.

## Поддержка прокси

GigaChat API автоматически использует прокси из переменных окружения:
- `HTTP_PROXY` — для HTTP запросов
- `HTTPS_PROXY` — для HTTPS запросов (используется для GigaChat API)

## Документация

Полная документация доступна на: https://developers.sber.ru/docs/ru/gigachat/api/overview
