import { NextRequest, NextResponse } from 'next/server'
import type { AIGenerationOptions } from '@/lib/types'
import { randomUUID } from 'crypto'
import https from 'https'
import http from 'http'

export const runtime = 'nodejs'

// Отключаем проверку SSL сертификатов для GigaChat API (если есть проблемы с сертификатами)
if (process.env.GIGACHAT_DISABLE_SSL_CHECK === 'true' || process.env.VERCEL === '1') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

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
 * Альтернативный fetch через https.request (для случаев когда стандартный fetch не работает на Vercel)
 */
async function fetchViaHttpsRequest(
  url: string,
  options: {
    method?: string
    headers?: Record<string, string>
    body?: string | URLSearchParams
    signal?: AbortSignal
  }
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const isHttps = urlObj.protocol === 'https:'
    const client = isHttps ? https : http

    // Отключаем проверку SSL для GigaChat API (у них могут быть проблемы с сертификатами)
    const disableSSL = process.env.GIGACHAT_DISABLE_SSL_CHECK === 'true' || process.env.VERCEL === '1'
    
    const requestOptions: https.RequestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port ? parseInt(urlObj.port, 10) : (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      rejectUnauthorized: !disableSSL, // Отключаем проверку SSL если нужно
    }

    const req = client.request(requestOptions, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString()
        const response = new Response(body, {
          status: res.statusCode || 500,
          statusText: res.statusMessage || 'OK',
          headers: res.headers as HeadersInit,
        })
        resolve(response)
      })
    })

    req.on('error', reject)
    if (options.signal) {
      options.signal.addEventListener('abort', () => {
        req.destroy()
        reject(new Error('Request aborted'))
      })
    }

    if (options.body) {
      const bodyStr = options.body instanceof URLSearchParams ? options.body.toString() : options.body
      req.write(bodyStr)
    }
    req.end()
  })
}

/**
 * Создает fetch с поддержкой прокси из переменных окружения
 * Node.js 18+ fetch использует undici и автоматически использует HTTP_PROXY/HTTPS_PROXY
 * Для отключения проверки SSL используйте переменную GIGACHAT_DISABLE_SSL_CHECK=true
 * Если стандартный fetch не работает, используется альтернативный способ через https.request
 */
function createFetchWithProxy() {
  const httpsProxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
  const httpProxy = process.env.HTTP_PROXY

  // Используем альтернативный способ если установлена переменная или на Vercel
  // На Vercel также автоматически отключаем проверку SSL (у GigaChat проблемы с сертификатами)
  const useHttpsRequest = process.env.GIGACHAT_USE_HTTPS_REQUEST === 'true' || process.env.VERCEL === '1'

  if (useHttpsRequest) {
    return fetchViaHttpsRequest as typeof fetch
  }

  // Node.js 18+ fetch автоматически использует HTTP_PROXY и HTTPS_PROXY из process.env
  // Для отключения проверки SSL сертификатов установите GIGACHAT_DISABLE_SSL_CHECK=true
  return fetch
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
        errorName: fetchError instanceof Error ? fetchError.name : undefined,
        errorStack: fetchError instanceof Error ? fetchError.stack : undefined,
        url: GIGACHAT_OAUTH_URL,
        isTimeout: isAborted,
        cause: fetchError instanceof Error ? fetchError.cause : undefined,
        nodeVersion: process.version,
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


    return accessToken
  } catch (error) {
    console.error('Ошибка при получении токена GigaChat:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const authKeyRaw = process.env.GIGACHAT_AUTH_KEY
    const authKey = authKeyRaw?.trim()
    if (!authKey) {
      return NextResponse.json(
        { error: 'GIGACHAT_AUTH_KEY не настроен. Установите ключ в .env (или в настройках Vercel) и перезапустите сервер.' },
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

    prompt += `\n\nДля каждого слайда верни объект с полями:
- type: "title" | "content" | "image" | "split"
- title: заголовок слайда
- content: текст слайда (если применимо)
${includeImages && imageType !== 'none' ? '- imageDescription: краткое описание картинки для слайда на английском (1 фраза, для генерации изображения)' : ''}

Верни ТОЛЬКО валидный JSON массив объектов без markdown, без пояснений. Пример элемента: {"type":"content","title":"...","content":"..."${includeImages && imageType !== 'none' ? ',"imageDescription":"..."' : ''}}.

Важно: текст заголовков и content — на языке ${language}.`

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
        { role: 'system', content: 'Ты помощник, который генерирует структуру презентаций. Отвечай ТОЛЬКО валидным JSON-массивом объектов, без markdown и без текста вокруг. Правила: строго один массив [...], внутри строк не должно быть переносов строки, запятая после последнего элемента перед ] запрещена, все строки в двойных кавычках.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      stream: false,
    }

    const gigachatApiUrl = `${GIGACHAT_CHAT_BASE_URL}${GIGACHAT_CHAT_COMPLETIONS_PATH}`

    
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
    cleanedText = cleanedText.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/g, '')
    cleanedText = cleanedText.replace(/\uFEFF/g, '').trim() // BOM

    /** Извлекает подстроку от первого '[' до парной ']' (учёт вложенных скобок). */
    function extractJsonArray(str: string): string | null {
      const start = str.indexOf('[')
      if (start === -1) return null
      let depth = 0
      let inString = false
      let quote = ''
      for (let i = start; i < str.length; i++) {
        const c = str[i]
        if (!inString) {
          if (c === '[') depth++
          else if (c === ']') {
            depth--
            if (depth === 0) return str.slice(start, i + 1)
          } else if (c === '"' || c === "'") {
            inString = true
            quote = c
          }
          continue
        }
        if (c === '\\' && i + 1 < str.length) {
          i++
          continue
        }
        if (c === quote) inString = false
      }
      return null
    }

    const extracted = extractJsonArray(cleanedText)
    const fallbackMatch = cleanedText.match(/\[[\s\S]*\]/)?.[0]?.trim() ?? ''
    const jsonText = (extracted ?? fallbackMatch) || cleanedText

    if (!jsonText || jsonText.trim() === '') {
      console.error('Не удалось найти JSON в ответе:', cleanedText.substring(0, 500))
      throw new Error('Ответ от AI не содержит валидный JSON массив')
    }

    /** Исправляет типичные ошибки JSON от ИИ и парсит. */
    function tryParseJson(raw: string): any {
      let s = raw.trim()
      // Убираем trailing commas перед ] или }
      s = s.replace(/,(\s*[}\]])/g, '$1')
      // Неэкранированные переносы внутри строк ломают JSON — заменяем на пробел (контент от ИИ)
      const fixed: string[] = []
      let i = 0
      let inString = false
      let quote = ''
      let start = 0
      while (i < s.length) {
        const c = s[i]
        if (!inString) {
          if (c === '"' || c === "'") {
            inString = true
            quote = c
            start = i + 1
          }
          fixed.push(c)
          i++
          continue
        }
        if (c === '\\' && i + 1 < s.length) {
          fixed.push(c, s[i + 1])
          i += 2
          continue
        }
        if (c === quote) {
          inString = false
          fixed.push(c)
          i++
          continue
        }
        if (c === '\n' || c === '\r') {
          fixed.push(' ')
          i++
          continue
        }
        fixed.push(c)
        i++
      }
      return JSON.parse(fixed.join(''))
    }

    // Убираем возможный мусор в конце (точки, пояснения после массива)
    jsonText = jsonText.trim()

    let slides: any
    try {
      slides = JSON.parse(jsonText)
    } catch {
      try {
        slides = tryParseJson(jsonText)
      } catch (parseError) {
        console.error('Ошибка парсинга JSON:', parseError)
        console.error('Текст ответа (начало):', jsonText.substring(0, 500))
        throw new Error('Не удалось распарсить JSON из ответа AI. Попробуйте снова или упростите запрос.')
      }
    }

    // Валидируем и нормализуем слайды
    const stripHtml = (s: string) => (s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    const normalizedSlides = Array.isArray(slides) ? slides.map((slide: any) => {
      const title = slide.title || 'Новый слайд'
      const content = slide.content || ''
      const fromAi = slide.imageDescription || slide.imagePrompt || slide.image_description || ''
      // Если ИИ не вернул описание картинки, но изображения включены — формируем из заголовка и текста (Replicate лучше на английском)
      const imageDescription = fromAi.trim() || (includeImages && imageType !== 'none'
        ? `${title}. ${stripHtml(content).slice(0, 120)}`
        : '')
      return {
        type: slide.type || 'content',
        title,
        content,
        imageDescription,
      }
    }) : []

    if (normalizedSlides.length === 0) {
      throw new Error('AI не сгенерировал ни одного слайда')
    }

    return NextResponse.json({ slides: normalizedSlides })
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    console.error('AI generation error:', err.message, err.stack)
    const errorMessage = err.message || 'Unknown error'
    const isAuthError = /GIGACHAT_AUTH_KEY|токен|авторизац|401|Authorization/i.test(errorMessage)
    const isNetworkError = /fetch failed|ECONNREFUSED|ETIMEDOUT|network|подключ/i.test(errorMessage)
    const isTimeoutError = /aborted|timeout|Таймаут/i.test(errorMessage)
    const userMessage =
      isAuthError ? errorMessage
      : isNetworkError ? `Сеть: ${errorMessage}. Проверьте доступ к GigaChat (на Vercel включите GIGACHAT_DISABLE_SSL_CHECK=true при необходимости).`
      : isTimeoutError ? 'Таймаут запроса к GigaChat. Попробуйте снова.'
      : `Ошибка генерации: ${errorMessage}`

    return NextResponse.json(
      { error: userMessage },
      { status: 500 }
    )
  }
}
