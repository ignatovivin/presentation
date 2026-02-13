import { NextRequest, NextResponse } from 'next/server'
import type { AIGenerationOptions } from '@/lib/types'
import { randomUUID } from 'crypto'
import https from 'https'
import http from 'http'

export const runtime = 'nodejs'

// ——— Эндпоинты GigaChat API (официальная документация: https://developers.sber.ru/docs/ru/gigachat/api/reference/rest/gigachat-api) ———
// Токен: POST с заголовком Authorization: Basic <Base64(Client ID:Client Secret)>, тело scope=GIGACHAT_API_PERS|B2B|CORP
const GIGACHAT_OAUTH_URL = process.env.GIGACHAT_OAUTH_URL ?? 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth'
// Чат: запросы с заголовком Authorization: Bearer <access_token>
const GIGACHAT_CHAT_BASE_URL = (process.env.GIGACHAT_CHAT_BASE_URL ?? 'https://gigachat.devices.sberbank.ru').replace(/\/+$/, '')
const GIGACHAT_CHAT_COMPLETIONS_PATH = '/api/v1/chat/completions'
// Модели для генерации (список: https://developers.sber.ru/docs/ru/gigachat/models/main). 404 = неверный идентификатор.
const GIGACHAT_ALLOWED_MODELS = ['GigaChat-2', 'GigaChat-2-Lite', 'GigaChat-2-Pro', 'GigaChat-2-Max'] as const
const GIGACHAT_MODEL = process.env.GIGACHAT_MODEL ?? 'GigaChat-2-Pro'

/**
 * Создает fetch с поддержкой прокси из переменных окружения
 * и кастомным HTTPS agent с отключенной проверкой SSL сертификатов
 */
function createFetchWithProxy() {
  const httpsProxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
  const httpProxy = process.env.HTTP_PROXY

  if (httpsProxy || httpProxy) {
    console.log('Обнаружен прокси:', {
      httpsProxy: httpsProxy ? 'настроен' : 'не настроен',
      httpProxy: httpProxy ? 'настроен' : 'не настроен',
    })
  }

  // 🔥 СОЗДАЁМ CUSTOM AGENT с отключенной проверкой SSL
  const httpsAgent = new https.Agent({
    rejectUnauthorized: false, // Игнорируем ошибки сертификатов
  })

  // 🔥 ВОЗВРАЩАЕМ ОБЁРТКУ НАД FETCH
  return async (url: string, options: any = {}) => {
    return fetch(url, {
      ...options,
      // @ts-ignore - Node.js поддерживает agent в fetch
      agent: url.startsWith('https') ? httpsAgent : undefined,
    })
  }
}

// Кэш для токена доступа GigaChat (действителен 30 минут)
let accessTokenCache: { token: string; expiresAt: number } | null = null

/**
 * Получает токен доступа GigaChat API
 * Токен действителен 30 минут, используем кэширование
 */
async function getGigaChatAccessToken(): Promise<string> {
  // Проверяем кэш (оставляем запас 2 минуты до истечения)
  if (accessTokenCache && accessTokenCache.expiresAt > Date.now() + 120000) {
    return accessTokenCache.token
  }

  const authKeyRaw = process.env.GIGACHAT_AUTH_KEY
  const scopeRaw = (process.env.GIGACHAT_SCOPE || 'GIGACHAT_API_PERS').trim()
  const allowedScopes = ['GIGACHAT_API_PERS', 'GIGACHAT_API_B2B', 'GIGACHAT_API_CORP'] as const
  const scope = allowedScopes.includes(scopeRaw as (typeof allowedScopes)[number]) ? scopeRaw : 'GIGACHAT_API_PERS'

  if (!authKeyRaw) {
    throw new Error('GIGACHAT_AUTH_KEY не настроен. Установите ваш ключ авторизации в файле .env')
  }
  if (scope !== scopeRaw) {
    console.warn('GIGACHAT_SCOPE должен быть один из: GIGACHAT_API_PERS, GIGACHAT_API_B2B, GIGACHAT_API_CORP. Используем GIGACHAT_API_PERS.')
  }

  // Убираем пробелы и переносы строк из ключа (на случай если они были добавлены при копировании)
  const authKey = authKeyRaw.trim().replace(/\s/g, '')

  // Проверяем, что ключ похож на Base64 (опциональная валидация)
  if (!/^[A-Za-z0-9+/=]+$/.test(authKey)) {
    console.warn('Предупреждение: ключ авторизации содержит недопустимые символы для Base64')
  }

  const rqUID = randomUUID()
  // Basic-схема: в Authorization передаём полученный Authorization key (из ЛК), без дополнительного кодирования.
  // Пример из документации:
  //   curl -L -X POST 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth' \
  //   -H 'Content-Type: application/x-www-form-urlencoded' \
  //   -H 'Accept: application/json' \
  //   -H 'RqUID: <uuid>' \
  //   -H 'Authorization: Basic <Authorization key>' \
  //   --data-urlencode 'scope=GIGACHAT_API_PERS'
  const authHeader = `Basic ${authKey}`

  console.log('Получение токена доступа GigaChat:', {
    url: GIGACHAT_OAUTH_URL,
    scope,
    rqUID,
    hasAuthKey: !!authKey,
    authKeyLength: authKey.length,
    authKeyPreview: authKey.substring(0, 10) + '...',
  })

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    const fetchFn = createFetchWithProxy()
    const tokenResponse = await fetchFn(GIGACHAT_OAUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'RqUID': rqUID,
        'Authorization': authHeader,
      },
      body: new URLSearchParams({ scope }),
      signal: controller.signal,
    }).catch((fetchError) => {
      clearTimeout(timeoutId)
      const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError)
      const isAborted = errorMessage.includes('aborted') || fetchError instanceof Error && fetchError.name === 'AbortError'
      
      console.error('Ошибка сети при запросе токена:', {
        error: errorMessage,
        url: GIGACHAT_OAUTH_URL,
        isTimeout: isAborted,
        cause: fetchError instanceof Error ? fetchError.cause : undefined,
      })
      
      if (isAborted) {
        throw new Error('Таймаут при подключении к серверу GigaChat. Проверьте доступность сервера и интернет-соединение.')
      }
      throw new Error(`Не удалось подключиться к серверу GigaChat для получения токена: ${errorMessage}`)
    })
    
    clearTimeout(timeoutId)

    if (!tokenResponse.ok) {
      let errorText = ''
      try {
        errorText = await tokenResponse.text()
      } catch (textError) {
        console.error('Не удалось прочитать текст ошибки токена:', textError)
        errorText = `HTTP ${tokenResponse.status} ${tokenResponse.statusText}`
      }
      
      console.error('Ошибка получения токена GigaChat:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        errorText: errorText.substring(0, 500),
        url: GIGACHAT_OAUTH_URL,
        scope,
        authKeyLength: authKey.length,
        // Не логируем сам ключ из соображений безопасности
      })
      
      let errorMessage = `Не удалось получить токен доступа: ${tokenResponse.status}`
      if (tokenResponse.status === 401) {
        errorMessage = 'Ошибка авторизации. Проверьте правильность ключа авторизации (GIGACHAT_AUTH_KEY). Ключ должен быть в формате Base64(Client ID:Client Secret).'
      } else if (tokenResponse.status === 400) {
        errorMessage = `Некорректный формат запроса: ${errorText.substring(0, 200)}`
      } else {
        errorMessage = `${errorMessage} ${errorText.substring(0, 200)}`
      }
      
      throw new Error(errorMessage)
    }

    // Безопасный парсинг ответа с токеном
    let tokenData: any
    try {
      const responseText = await tokenResponse.text()
      try {
        tokenData = JSON.parse(responseText)
      } catch (jsonError) {
        console.error('Ошибка парсинга JSON ответа токена:', jsonError)
        console.error('Текст ответа:', responseText.substring(0, 500))
        throw new Error(`Не удалось распарсить JSON ответ токена: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`)
      }
    } catch (error) {
      console.error('Ошибка чтения ответа токена:', error)
      throw new Error(`Не удалось прочитать ответ токена: ${error instanceof Error ? error.message : String(error)}`)
    }
    const accessToken = tokenData.access_token
    const expiresAt = (tokenData.expires_at || Date.now() / 1000 + 1800) * 1000 // 30 минут по умолчанию

    // Сохраняем в кэш
    accessTokenCache = {
      token: accessToken,
      expiresAt,
    }

    console.log('Токен доступа GigaChat получен успешно', {
      expiresAt: new Date(expiresAt).toISOString(),
    })

    return accessToken
  } catch (error) {
    console.error('Ошибка при получении токена GigaChat:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const authKey = process.env.GIGACHAT_AUTH_KEY
    console.log('Проверка ключа авторизации GigaChat:', {
      exists: !!authKey,
      length: authKey?.length || 0,
    })
    
    if (!authKey) {
      return NextResponse.json(
        { error: 'GIGACHAT_AUTH_KEY не настроен. Установите ваш ключ авторизации в файле .env и перезапустите сервер.' },
        { status: 500 }
      )
    }

    // Безопасный парсинг JSON из запроса
    let options: AIGenerationOptions
    try {
      const body = await request.json()
      if (!body || typeof body !== 'object') {
        return NextResponse.json(
          { error: 'Тело запроса должно быть JSON объектом' },
          { status: 400 }
        )
      }
      options = body as AIGenerationOptions
      console.log('Получены параметры генерации:', options)
    } catch (parseError) {
      console.error('Ошибка парсинга тела запроса:', parseError)
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError)
      return NextResponse.json(
        { error: `Некорректный формат запроса. Ожидается JSON объект. Детали: ${errorMessage}` },
        { status: 400 }
      )
    }
    
    // Валидация обязательных полей
    const { 
      topic, 
      slidesCount, 
      style = 'professional', 
      includeImages = false,
      imageType = 'realistic',
      language = 'russian',
      audience = ''
    } = options

    if (!topic || typeof topic !== 'string' || topic.trim() === '') {
      return NextResponse.json(
        { error: 'Поле "topic" обязательно и должно быть непустой строкой' },
        { status: 400 }
      )
    }

    if (slidesCount !== undefined && (typeof slidesCount !== 'number' || slidesCount < 1 || slidesCount > 50)) {
      return NextResponse.json(
        { error: 'Поле "slidesCount" должно быть числом от 1 до 50' },
        { status: 400 }
      )
    }

    console.log('Генерация слайдов (GigaChat):', { topic, slidesCount, style, includeImages, imageType, language, audience })

    // Формируем детальный промпт с учетом всех настроек
    let prompt = `Создай структуру презентации на тему: "${topic}"`
    
    if (audience) {
      prompt += `\nЦелевая аудитория: ${audience}`
    }
    
    prompt += `\nКоличество слайдов: ${slidesCount}`
    prompt += `\nСтиль презентации: ${style}`
    prompt += `\nЯзык: ${language}`
    
    if (includeImages && imageType !== 'none') {
      prompt += `\nТип изображений: ${imageType}`
    }

    prompt += `\n\nДля каждого слайда укажи:
1. Тип слайда (title, content, image, или split)
2. Заголовок
3. Содержание (если применимо)
${includeImages && imageType !== 'none' ? '4. Краткое описание изображения' : ''}

Верни ТОЛЬКО валидный JSON массив без markdown форматирования, БЕЗ пояснений и текста вокруг, только чистый JSON-массив.

Важно: весь ответ должен быть на языке ${language}.`

    const accessToken = await getGigaChatAccessToken()

    // Модель обязательно должна существовать в API (404 при неверном идентификаторе)
    const modelToUse = GIGACHAT_ALLOWED_MODELS.includes(GIGACHAT_MODEL as (typeof GIGACHAT_ALLOWED_MODELS)[number])
      ? GIGACHAT_MODEL
      : 'GigaChat-2-Pro'
    if (modelToUse !== GIGACHAT_MODEL) {
      console.warn('GigaChat: неверный идентификатор модели, используем GigaChat-2-Pro. Разрешённые:', GIGACHAT_ALLOWED_MODELS.join(', '))
    }

    // Тело запроса строго по спецификации: model + messages (role, content — только строка UTF-8)
    const requestBody = {
      model: modelToUse,
      messages: [
        { role: 'system', content: 'Ты помощник, который генерирует структуру презентаций. Всегда отвечай ТОЛЬКО в формате валидного JSON-массива с описанием слайдов, без пояснений и без markdown.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      stream: false,
    }

    const gigachatApiUrl = `${GIGACHAT_CHAT_BASE_URL}${GIGACHAT_CHAT_COMPLETIONS_PATH}`

    console.log('Запрос к GigaChat API:', {
      url: gigachatApiUrl,
      model: requestBody.model,
      messagesCount: requestBody.messages.length,
    })
    
    // Используем AbortController для таймаута запроса (60 секунд для генерации)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000)

    // По документации: заголовок Authorization: Bearer <токен_доступа>
    const fetchFn = createFetchWithProxy()
    const gigachatResponse = await fetchFn(gigachatApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    }).catch((fetchError) => {
      clearTimeout(timeoutId)
      const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError)
      const isAborted = errorMessage.includes('aborted') || fetchError instanceof Error && fetchError.name === 'AbortError'
      
      console.error('Ошибка сети при запросе к GigaChat API:', {
        error: errorMessage,
        url: gigachatApiUrl,
        isTimeout: isAborted,
        cause: fetchError instanceof Error ? fetchError.cause : undefined,
      })
      
      if (isAborted) {
        throw new Error('Таймаут при запросе к GigaChat API. Генерация заняла слишком много времени.')
      }
      throw new Error(`Не удалось подключиться к GigaChat API: ${errorMessage}`)
    })
    
    clearTimeout(timeoutId)

    if (!gigachatResponse.ok) {
      let errorText = ''
      try {
        errorText = await gigachatResponse.text()
      } catch (textError) {
        console.error('Не удалось прочитать текст ошибки:', textError)
        errorText = `HTTP ${gigachatResponse.status} ${gigachatResponse.statusText}`
      }
      
      console.error('GigaChat API error:', {
        status: gigachatResponse.status,
        statusText: gigachatResponse.statusText,
        errorText: errorText.substring(0, 500),
      })
      
      let errorMessage = 'Ошибка при обращении к GigaChat API'
      if (gigachatResponse.status === 401) {
        errorMessage = 'Ошибка авторизации GigaChat. Проверьте правильность ключа авторизации (GIGACHAT_AUTH_KEY) в файле .env и перезапустите сервер.'
        // Сбрасываем кэш токена при ошибке авторизации
        accessTokenCache = null
      } else if (gigachatResponse.status === 404) {
        errorMessage = 'Модель GigaChat не найдена. Проверьте название модели.'
      } else if (gigachatResponse.status === 422) {
        errorMessage = 'Ошибка валидации запроса к GigaChat API. Проверьте параметры запроса.'
      } else if (gigachatResponse.status === 429) {
        errorMessage = 'Превышен лимит запросов к GigaChat API. Попробуйте позже.'
      } else {
        errorMessage = `GigaChat API error: ${gigachatResponse.status} ${errorText.substring(0, 200)}`
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      )
    }

    // Безопасный парсинг ответа от API
    let gigachatData: any
    let responseText: string = ''
    try {
      // Сначала читаем текст ответа
      responseText = await gigachatResponse.text()
      // Затем пытаемся распарсить JSON
      try {
        gigachatData = JSON.parse(responseText)
      } catch (jsonError) {
        console.error('Ошибка парсинга JSON ответа от GigaChat:', jsonError)
        console.error('Текст ответа:', responseText.substring(0, 500))
        throw new Error(`Не удалось распарсить JSON ответ от GigaChat API: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`)
      }
    } catch (error) {
      // Если не удалось прочитать ответ вообще
      console.error('Ошибка чтения ответа от GigaChat:', error)
      throw new Error(`Не удалось прочитать ответ от GigaChat API: ${error instanceof Error ? error.message : String(error)}`)
    }

    // Проверяем структуру ответа
    if (!gigachatData || !gigachatData.choices || !Array.isArray(gigachatData.choices) || gigachatData.choices.length === 0) {
      console.error('Некорректная структура ответа от GigaChat:', JSON.stringify(gigachatData))
      throw new Error('GigaChat API вернул некорректный формат ответа')
    }

    const text: string =
      gigachatData?.choices?.[0]?.message?.content?.toString() ?? ''

    if (!text || text.trim() === '') {
      console.error('Пустой ответ от GigaChat API:', JSON.stringify(gigachatData))
      throw new Error('GigaChat API вернул пустой ответ')
    }

    // Clean up the response (remove markdown code blocks if present)
    let cleanedText = text.trim()
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/```\n?/g, '')
    }

    // Пытаемся найти JSON в ответе
    const jsonMatch = cleanedText.match(/\[[\s\S]*\]/)
    const jsonText = jsonMatch ? jsonMatch[0] : cleanedText

    if (!jsonText || jsonText.trim() === '') {
      console.error('Не удалось найти JSON в ответе:', cleanedText.substring(0, 500))
      throw new Error('Ответ от AI не содержит валидный JSON массив')
    }

    let slides
    try {
      slides = JSON.parse(jsonText)
    } catch (parseError) {
      console.error('Ошибка парсинга JSON:', parseError)
      console.error('Текст ответа:', jsonText.substring(0, 500))
      throw new Error(`Не удалось распарсить JSON из ответа AI: ${parseError instanceof Error ? parseError.message : String(parseError)}`)
    }

    // Валидируем и нормализуем слайды
    const normalizedSlides = Array.isArray(slides) ? slides.map((slide: any) => ({
      type: slide.type || 'content',
      title: slide.title || 'Новый слайд',
      content: slide.content || '',
      imageDescription: slide.imageDescription || slide.imagePrompt || '',
    })) : []

    if (normalizedSlides.length === 0) {
      throw new Error('AI не сгенерировал ни одного слайда')
    }

    console.log(`Успешно сгенерировано ${normalizedSlides.length} слайдов`)
    return NextResponse.json({ slides: normalizedSlides })
  } catch (error) {
    console.error('AI generation error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      name: error instanceof Error ? error.name : undefined,
    })
    
    // Возвращаем более информативный ответ об ошибке
    return NextResponse.json(
      { 
        error: `Failed to generate presentation: ${errorMessage}`,
        details: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 }
    )
  }
}
