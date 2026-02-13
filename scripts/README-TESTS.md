# Тесты API: curl / Postman

Чтобы понять, виноват **сервис GigaChat** или **наш код**, выполните два теста.

## 1. Прямой тест GigaChat (токен + chat)

Если этот тест падает — проблема на стороне сервиса или ключа/scope.  
Если 200 — сервис в порядке, смотреть наш роут.

### PowerShell (из корня проекта)

```powershell
.\scripts\test-gigachat-direct.ps1
```

### Вручную через curl

**Шаг 1 — получить токен** (подставьте из `.env` значения `GIGACHAT_AUTH_KEY` и `GIGACHAT_SCOPE`):

```bash
curl -X POST "https://ngw.devices.sberbank.ru:9443/api/v2/oauth" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Accept: application/json" \
  -H "RqUID: $(uuidgen 2>/dev/null || echo '550e8400-e29b-41d4-a716-446655440000')" \
  -H "Authorization: Basic ВАШ_GIGACHAT_AUTH_KEY" \
  -d "scope=GIGACHAT_API_B2B"
```

В ответе возьмите `access_token`.

**Шаг 2 — запрос в chat/completions** (подставьте `ACCESS_TOKEN` из шага 1):

```bash
curl -X POST "https://gigachat.devices.sberbank.ru/api/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -d "{\"model\":\"GigaChat-2-Pro\",\"messages\":[{\"role\":\"user\",\"content\":\"Ответь одним словом: привет\"}],\"temperature\":0.3,\"stream\":false}"
```

- Ответ **200** и текст в `choices[0].message.content` → GigaChat в порядке.
- Ответ **401** → неверный ключ или scope.
- Ответ **404** → неверная модель.
- Ответ **4xx/5xx** или таймаут → смотреть тело ответа и документацию GigaChat.

---

## 2. Тест нашего API (Next.js route)

Проверяет, что наш бэкенд и роут `/api/ai/generate` отвечают и корректно ходят в GigaChat.

1. Запустите приложение: `yarn dev`
2. В другом терминале выполните один из вариантов.

### PowerShell

```powershell
.\scripts\test-our-api.ps1
```

### curl

```bash
curl -X POST "http://localhost:3000/api/ai/generate" \
  -H "Content-Type: application/json" \
  -d "{\"topic\":\"тест\",\"slidesCount\":2,\"style\":\"professional\",\"includeImages\":false,\"language\":\"russian\",\"audience\":\"\"}"
```

- Ответ **200** и JSON с `slides` → наш код и интеграция в порядке.
- Ответ **500** с текстом про GigaChat/токен → смотреть переменные окружения и логи сервера.
- Ответ **500** с «fetch failed» / таймаут → сетевая проблема до GigaChat (прокси, файрвол, DNS).

---

## Postman

1. **Прямой GigaChat**
   - Запрос 1: POST `https://ngw.devices.sberbank.ru:9443/api/v2/oauth`  
     Body: x-www-form-urlencoded, ключ `scope` = `GIGACHAT_API_B2B`  
     Headers: `Authorization: Basic <ваш ключ>`, `RqUID`: любой UUID, `Content-Type`, `Accept`.
   - Запрос 2: POST `https://gigachat.devices.sberbank.ru/api/v1/chat/completions`  
     Body: raw JSON (model, messages, temperature, stream)  
     Header: `Authorization: Bearer <access_token>`.

2. **Наш API**
   - POST `http://localhost:3000/api/ai/generate`  
     Body: raw JSON с полями `topic`, `slidesCount`, `style`, `includeImages`, `language`, `audience`.

По результатам двух тестов можно однозначно понять: ошибка в сервисе (или ключе/модели) или в нашем коде/сети.
