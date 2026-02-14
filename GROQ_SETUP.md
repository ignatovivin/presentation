# Настройка Groq API для генерации слайдов

Генерация структуры и контента презентаций идёт через [Groq Chat Completions API](https://console.groq.com/docs/api-reference) (OpenAI-совместимый формат). OAuth не требуется — используется только API-ключ.

## 1. Получение API-ключа

1. Зарегистрируйтесь или войдите: https://console.groq.com
2. Перейдите в **API Keys**: https://console.groq.com/keys
3. Создайте ключ и скопируйте его (показывается один раз)

## 2. Переменные окружения

В корне проекта создайте `.env` (или скопируйте из `.env.example`):

```env
GROQ_API_KEY=ваш_ключ_здесь
```

Опционально:

```env
# Модель по умолчанию: llama-3.3-70b-versatile
# Список: https://console.groq.com/docs/models
GROQ_MODEL=llama-3.3-70b-versatile
```

После изменения `.env` перезапустите dev-сервер (`yarn dev`).

## 3. Эндпоинт и авторизация

- **URL:** `POST https://api.groq.com/openai/v1/chat/completions`
- **Заголовок:** `Authorization: Bearer <GROQ_API_KEY>`
- Дополнительный OAuth или Base64 не нужны

Переопределить URL (например, для прокси) можно через `GROQ_CHAT_URL` в `.env`.

## 4. Модели

Поддерживаемые модели задаются в коде (см. `app/api/ai/generate/route.ts`). По умолчанию используется `llama-3.3-70b-versatile`. Доступны, в частности:

- `llama-3.3-70b-versatile` — по умолчанию, хорошее качество
- `llama-3.1-8b-instant` — быстрее, меньше токенов
- `openai/gpt-oss-20b`, `openai/gpt-oss-120b`
- `qwen/qwen3-32b`

Актуальный список: https://console.groq.com/docs/models

## 5. Ограничения и таймауты

- Таймаут запроса к Groq в приложении: 60 секунд
- Лимиты запросов зависят от плана на Groq (см. консоль)
- При 429 в ответе API возвращается сообщение о превышении лимита

## 6. Прокси

Если запросы к `api.groq.com` идут через прокси, задайте в `.env`:

```env
HTTPS_PROXY=http://proxy.example.com:8080
HTTP_PROXY=http://proxy.example.com:8080
```

Node.js `fetch` подхватывает эти переменные автоматически. Отключать SSL для Groq не требуется (в отличие от некоторых других провайдеров).

## 7. Деплой на Vercel

В настройках проекта Vercel добавьте переменную **GROQ_API_KEY** (и при необходимости **GROQ_MODEL**). После добавления переменных сделайте **Redeploy**. Подробнее: [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md).
