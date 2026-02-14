import { NextRequest, NextResponse } from 'next/server'
import type { AIGenerationOptions } from '@/lib/types'

export const runtime = 'nodejs'

// Groq API: OpenAI-совместимый Chat Completions
// Документация: https://console.groq.com/docs/api-reference
// Эндпоинт: POST https://api.groq.com/openai/v1/chat/completions
// Авторизация: Authorization: Bearer GROQ_API_KEY (без OAuth)
const GROQ_CHAT_URL = process.env.GROQ_CHAT_URL ?? 'https://api.groq.com/openai/v1/chat/completions'

// Модели для генерации текста (список: https://console.groq.com/docs/models)
const GROQ_ALLOWED_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'qwen/qwen3-32b',
] as const
const GROQ_MODEL = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile'

const CHAT_TIMEOUT_MS = 60_000

export async function POST(request: NextRequest) {
  try {
    const apiKeyRaw = process.env.GROQ_API_KEY
    const apiKey = apiKeyRaw?.trim()
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY не настроен. Установите ключ в .env (или в настройках Vercel) и перезапустите сервер.' },
        { status: 500 }
      )
    }

    let options: AIGenerationOptions & { outlineOnly?: boolean }
    try {
      const body = await request.json()
      if (!body || typeof body !== 'object') {
        return NextResponse.json(
          { error: 'Тело запроса должно быть JSON объектом' },
          { status: 400 }
        )
      }
      options = body as AIGenerationOptions & { outlineOnly?: boolean }
    } catch (parseError) {
      console.error('Ошибка парсинга тела запроса:', parseError)
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError)
      return NextResponse.json(
        { error: `Некорректный формат запроса. Ожидается JSON объект. Детали: ${errorMessage}` },
        { status: 400 }
      )
    }

    const {
      topic,
      slidesCount,
      style = 'professional',
      includeImages = false,
      imageType = 'realistic',
      language = 'russian',
      audience = '',
      outlineOnly = false,
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

    const modelToUse = (GROQ_ALLOWED_MODELS as readonly string[]).includes(GROQ_MODEL)
      ? GROQ_MODEL
      : 'llama-3.3-70b-versatile'
    if (modelToUse !== GROQ_MODEL) {
      console.warn('GROQ_MODEL не в списке разрешённых, используем llama-3.3-70b-versatile. Разрешённые:', GROQ_ALLOWED_MODELS.join(', '))
    }

    let prompt: string
    if (outlineOnly) {
      prompt = `Создай краткую структуру (outline) презентации на тему: "${topic}". Количество слайдов: ${slidesCount}. Язык: ${language}.`
      if (audience) prompt += ` Целевая аудитория: ${audience}.`
      prompt += `\n\nДля каждого слайда верни объект с полями: title (заголовок), content (краткий текст или тезисы, 1-3 предложения). Верни ТОЛЬКО валидный JSON массив объектов без markdown. Пример: [{"title":"...","content":"..."}]. Текст на языке ${language}.`
    } else {
      prompt = `Создай структуру презентации на тему: "${topic}"`
      if (audience) prompt += `\nЦелевая аудитория: ${audience}`
      prompt += `\nКоличество слайдов: ${slidesCount}`
      prompt += `\nСтиль презентации: ${style}`
      prompt += `\nЯзык: ${language}`
      if (includeImages && imageType !== 'none') prompt += `\nТип изображений: ${imageType}`
      prompt += `\n\nДля каждого слайда верни объект с полями:
- type: "title" | "content" | "image" | "split"
- title: заголовок слайда
- content: текст слайда (если применимо)
${includeImages && imageType !== 'none' ? '- imageDescription: краткое описание картинки для слайда на английском (1 фраза)' : ''}

Верни ТОЛЬКО валидный JSON массив объектов без markdown. Пример: {"type":"content","title":"...","content":"..."${includeImages && imageType !== 'none' ? ',"imageDescription":"..."' : ''}}.
Текст на языке ${language}.`
    }

    const requestBody = {
      model: modelToUse,
      messages: [
        {
          role: 'system',
          content:
            'Ты помощник, который генерирует структуру презентаций. Отвечай ТОЛЬКО валидным JSON-массивом объектов, без markdown и без текста вокруг. Правила: строго один массив [...], внутри строк не должно быть переносов строки, запятая после последнего элемента перед ] запрещена, все строки в двойных кавычках.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_completion_tokens: 8192,
      stream: false,
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS)

    const groqResponse = await fetch(GROQ_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    }).catch((fetchError) => {
      clearTimeout(timeoutId)
      const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError)
      const isAborted =
        errorMessage.includes('aborted') || (fetchError instanceof Error && fetchError.name === 'AbortError')

      console.error('Ошибка сети при запросе к Groq API:', {
        error: errorMessage,
        url: GROQ_CHAT_URL,
        isTimeout: isAborted,
        cause: fetchError instanceof Error ? fetchError.cause : undefined,
      })

      if (isAborted) {
        throw new Error('Таймаут запроса к Groq API. Попробуйте снова.')
      }
      throw new Error(`Не удалось подключиться к Groq API: ${errorMessage}`)
    })

    clearTimeout(timeoutId)

    if (!groqResponse.ok) {
      let errorText = ''
      try {
        errorText = await groqResponse.text()
      } catch (textError) {
        console.error('Не удалось прочитать текст ошибки:', textError)
        errorText = `HTTP ${groqResponse.status} ${groqResponse.statusText}`
      }

      console.error('Groq API error:', {
        status: groqResponse.status,
        statusText: groqResponse.statusText,
        errorText: errorText.substring(0, 500),
      })

      let errorMessage = 'Ошибка при обращении к Groq API'
      if (groqResponse.status === 401) {
        errorMessage =
          'Ошибка авторизации Groq. Проверьте правильность GROQ_API_KEY в .env (или в настройках Vercel) и перезапустите сервер.'
      } else if (groqResponse.status === 404) {
        errorMessage = 'Модель Groq не найдена. Проверьте GROQ_MODEL.'
      } else if (groqResponse.status === 422) {
        errorMessage = 'Ошибка валидации запроса к Groq API. Проверьте параметры запроса.'
      } else if (groqResponse.status === 429) {
        errorMessage = 'Превышен лимит запросов к Groq API. Попробуйте позже.'
      } else {
        errorMessage = `Groq API error: ${groqResponse.status} ${errorText.substring(0, 200)}`
      }

      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }

    let groqData: any
    let responseText = ''
    try {
      responseText = await groqResponse.text()
      try {
        groqData = JSON.parse(responseText)
      } catch (jsonError) {
        console.error('Ошибка парсинга JSON ответа от Groq:', jsonError)
        console.error('Текст ответа:', responseText.substring(0, 500))
        throw new Error(
          `Не удалось распарсить JSON ответ от Groq API: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`
        )
      }
    } catch (error) {
      console.error('Ошибка чтения ответа от Groq:', error)
      throw new Error(`Не удалось прочитать ответ от Groq API: ${error instanceof Error ? error.message : String(error)}`)
    }

    if (
      !groqData ||
      !groqData.choices ||
      !Array.isArray(groqData.choices) ||
      groqData.choices.length === 0
    ) {
      console.error('Некорректная структура ответа от Groq:', JSON.stringify(groqData))
      throw new Error('Groq API вернул некорректный формат ответа')
    }

    const text: string = groqData?.choices?.[0]?.message?.content?.toString() ?? ''

    if (!text || text.trim() === '') {
      console.error('Пустой ответ от Groq API:', JSON.stringify(groqData))
      throw new Error('Groq API вернул пустой ответ')
    }

    let cleanedText = text.trim()
    cleanedText = cleanedText.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/g, '')
    cleanedText = cleanedText.replace(/\uFEFF/g, '').trim()

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

    function tryParseJson(raw: string): any {
      let s = raw.trim()
      s = s.replace(/,(\s*[}\]])/g, '$1')
      const fixed: string[] = []
      let i = 0
      let inString = false
      let quote = ''
      while (i < s.length) {
        const c = s[i]
        if (!inString) {
          if (c === '"' || c === "'") {
            inString = true
            quote = c
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

    const jsonTextTrimmed = jsonText.trim()
    let slides: any
    try {
      slides = JSON.parse(jsonTextTrimmed)
    } catch {
      try {
        slides = tryParseJson(jsonTextTrimmed)
      } catch (parseError) {
        console.error('Ошибка парсинга JSON:', parseError)
        console.error('Текст ответа (начало):', jsonTextTrimmed.substring(0, 500))
        throw new Error('Не удалось распарсить JSON из ответа AI. Попробуйте снова или упростите запрос.')
      }
    }

    const stripHtml = (s: string) => (s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    const normalizedSlides = Array.isArray(slides)
      ? slides.map((slide: any) => {
          const title = slide.title || 'Новый слайд'
          const content = slide.content || ''
          const fromAi = slide.imageDescription || slide.imagePrompt || slide.image_description || ''
          const imageDescription =
            fromAi.trim() ||
            (includeImages && imageType !== 'none' ? `${title}. ${stripHtml(content).slice(0, 120)}` : '')
          return {
            type: slide.type || 'content',
            title,
            content,
            imageDescription,
          }
        })
      : []

    if (normalizedSlides.length === 0) {
      throw new Error('AI не сгенерировал ни одного слайда')
    }

    return NextResponse.json({ slides: normalizedSlides })
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    console.error('AI generation error:', err.message, err.stack)
    const errorMessage = err.message || 'Unknown error'
    const isAuthError = /GROQ_API_KEY|токен|авторизац|401|Authorization/i.test(errorMessage)
    const isNetworkError = /fetch failed|ECONNREFUSED|ETIMEDOUT|network|подключ/i.test(errorMessage)
    const isTimeoutError = /aborted|timeout|Таймаут/i.test(errorMessage)
    const userMessage = isAuthError
      ? errorMessage
      : isNetworkError
        ? `Сеть: ${errorMessage}. Проверьте доступ к api.groq.com и настройки прокси (HTTP_PROXY/HTTPS_PROXY) при необходимости.`
        : isTimeoutError
          ? 'Таймаут запроса к Groq. Попробуйте снова.'
          : `Ошибка генерации: ${errorMessage}`

    return NextResponse.json({ error: userMessage }, { status: 500 })
  }
}
