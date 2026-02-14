# Инструкция по деплою на Vercel

## Шаг 1: Подготовка проекта

Проект уже настроен для деплоя на Vercel. Убедитесь, что:
- ✅ Файл `vercel.json` создан
- ✅ `next.config.ts` настроен правильно
- ✅ Все зависимости указаны в `package.json`

## Шаг 2: Настройка переменных окружения на Vercel

После подключения репозитория к Vercel добавьте переменные окружения в настройках проекта.

### Обязательные переменные

1. **GROQ_API_KEY**
   - Значение: API-ключ Groq
   - Получить: https://console.groq.com/keys
   - Без него генерация слайдов через AI не работает

### Опциональные переменные

2. **GROQ_MODEL**
   - Модель для генерации текста. По умолчанию: `llama-3.3-70b-versatile`
   - Список моделей: https://console.groq.com/docs/models
   - Примеры: `llama-3.1-8b-instant`, `openai/gpt-oss-20b`, `qwen/qwen3-32b`

3. **REPLICATE_API_TOKEN**
   - Токен для генерации изображений через Replicate
   - Получить: https://replicate.com/account/api-tokens

4. **HTTPS_PROXY** / **HTTP_PROXY**
   - URL прокси (если нужен обход сетевых ограничений)
   - Node.js fetch использует их автоматически

## Шаг 3: Настройка переменных окружения

1. Откройте проект на Vercel
2. Перейдите в **Settings** → **Environment Variables**
3. Добавьте **GROQ_API_KEY** для окружения **Production** (и при необходимости Preview/Development)

## Шаг 4: Деплой

После настройки переменных:
1. Vercel автоматически запустит новый деплой при пуше
2. Или **Deployments** → **Redeploy** (после добавления переменных обязательно сделайте Redeploy)

## Возможные проблемы и решения

### Ошибка: "Module not found" или проблемы с зависимостями
- Убедитесь, что все зависимости указаны в `package.json`
- Проверьте версию Node.js (Vercel определяет автоматически)

### Ошибка: "Environment variable not found"
- Проверьте, что переменные добавлены в **Settings** → **Environment Variables**
- Убедитесь, что выбран нужный scope (Production/Preview/Development)

### Ошибка: "Build failed"
- Проверьте логи билда в Vercel Dashboard
- Локально выполните `yarn build`

### POST `/api/ai/generate` возвращает 500 (Internal Server Error)
Чаще всего причина — **не задан ключ Groq на Vercel**:
1. Vercel → проект → **Settings** → **Environment Variables**
2. Добавьте **GROQ_API_KEY** (ключ из https://console.groq.com/keys) для **Production**
3. Сохраните и сделайте **Redeploy** (Deployments → … → Redeploy)
4. В браузере при 500 в алерте показывается сообщение с сервера (например: «GROQ_API_KEY не настроен»)

Сообщение в консоли `Unchecked runtime.lastError: Could not establish connection. Receiving end does not exist` — от расширения браузера (например React DevTools), не от приложения; его можно игнорировать.

### Ошибки Groq API
- **401:** неверный или отсутствующий GROQ_API_KEY — проверьте ключ на https://console.groq.com/keys
- **429:** превышен лимит запросов — подождите или проверьте квоты в консоли Groq
- **Таймаут:** Groq обычно отвечает быстро; при долгом ожидании проверьте Runtime Logs в Vercel

## Проверка деплоя

После успешного деплоя:
1. Откройте URL приложения
2. Проверьте загрузку главной страницы
3. Создайте презентацию через AI (тема → «Сгенерировать структуру» или полная генерация)

## Поддержка

Если возникли проблемы:
1. **Build Logs:** Vercel Dashboard → Deployments → [деплой] → Build Logs
2. **Runtime Logs:** Functions → лог функции для `/api/ai/generate` — там будет текст ошибки при 500
3. Убедитесь, что **GROQ_API_KEY** задан и после добавления переменных сделан **Redeploy**
