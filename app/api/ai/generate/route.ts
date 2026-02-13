import { NextRequest, NextResponse } from 'next/server'
import type { AIGenerationOptions } from '@/lib/types'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'

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

  const authKey = process.env.GIGACHAT_AUTH_KEY
  const scope = process.env.GIGACHAT_SCOPE || 'GIGACHAT_API_PERS'

  if (!authKey) {
    throw new Error('GIGACHAT_AUTH_KEY не настроен. Установите ваш ключ авторизации в файле .env')
  }

  const tokenUrl = 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth'
  const rqUID = randomUUID()

  console.log('Получение токена доступа GigaChat:', {
    scope,
    rqUID,
    hasAuthKey: !!authKey,
  })

  try {
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'RqUID': rqUID,
        'Authorization': `Basic ${authKey}`,
      },
      body: new URLSearchParams({ scope }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Ошибка получения токена GigaChat:', tokenResponse.status, errorText)
      throw new Error(`Не удалось получить токен доступа: ${tokenResponse.status} ${errorText}`)
    }

    const tokenData = await tokenResponse.json()
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

    const options: AIGenerationOptions = await request.json()
    console.log('Получены параметры генерации:', options)
    
    const { 
      topic, 
      slidesCount, 
      style = 'professional', 
      includeImages = false,
      imageType = 'realistic',
      language = 'russian',
      audience = ''
    } = options

    if (!topic || topic.trim() === '') {
      return NextResponse.json(
        { error: 'Topic is required' },
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

    // Получаем токен доступа GigaChat
    const accessToken = await getGigaChatAccessToken()

    // Вызов GigaChat API
    const gigachatApiUrl = 'https://gigachat.devices.sberbank.ru/api/v1/chat/completions'
    
    const requestBody = {
      model: 'GigaChat',
      messages: [
        {
          role: 'system',
          content:
            'Ты помощник, который генерирует структуру презентаций. Всегда отвечай ТОЛЬКО в формате валидного JSON-массива с описанием слайдов, без пояснений и без markdown.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      stream: false,
    }
    
    console.log('Запрос к GigaChat API:', { 
      url: gigachatApiUrl,
      model: requestBody.model,
    })
    
    const gigachatResponse = await fetch(gigachatApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!gigachatResponse.ok) {
      const errorText = await gigachatResponse.text()
      console.error('GigaChat API error:', gigachatResponse.status, errorText)
      
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
        errorMessage = `GigaChat API error: ${gigachatResponse.status} ${errorText}`
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      )
    }

    const gigachatData: any = await gigachatResponse.json()
    const text: string =
      gigachatData?.choices?.[0]?.message?.content?.toString() ?? ''

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

    let slides
    try {
      slides = JSON.parse(jsonText)
    } catch (parseError) {
      console.error('Ошибка парсинга JSON:', parseError)
      console.error('Текст ответа:', jsonText.substring(0, 500))
      throw new Error('Не удалось распарсить ответ от AI')
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
    console.error('Error details:', errorMessage)
    return NextResponse.json(
      { error: `Failed to generate presentation: ${errorMessage}` },
      { status: 500 }
    )
  }
}
