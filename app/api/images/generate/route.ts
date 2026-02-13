import Replicate from 'replicate'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 120 // Увеличил до 120 секунд

export async function POST(request: NextRequest) {
  try {
    const apiToken = process.env.REPLICATE_API_TOKEN

    console.log('🔍 Проверка REPLICATE_API_TOKEN:', {
      exists: !!apiToken,
      length: apiToken?.length || 0,
      starts_with: apiToken?.substring(0, 3) || 'нет',
    })

    if (!apiToken) {
      return NextResponse.json(
        { error: 'REPLICATE_API_TOKEN не настроен в .env.local' },
        { status: 500 }
      )
    }

    const { prompt } = await request.json()

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Поле "prompt" обязательно' },
        { status: 400 }
      )
    }

    console.log('🎨 Генерация изображения:', { prompt: prompt.substring(0, 50) })

    const replicate = new Replicate({
      auth: apiToken,
    })

    // 🔥 ИСПРАВЛЕНИЕ: правильное название модели без "-1"
    const output = await replicate.run(
      "black-forest-labs/flux-schnell", // Было: flux-1-schnell ❌
      {
        input: {
          prompt: prompt,
          aspect_ratio: '16:9',
          output_format: 'webp',
          num_outputs: 1,
        },
      }
    )

    console.log('✅ Изображение сгенерировано:', {
      type: typeof output,
      isArray: Array.isArray(output),
      value: output,
    })

    // Replicate возвращает массив с URL изображения
    const imageUrl = Array.isArray(output) ? output[0] : output

    if (!imageUrl || typeof imageUrl !== 'string') {
      console.error('❌ Некорректный формат ответа:', output)
      throw new Error('Replicate вернул некорректный формат')
    }

    return NextResponse.json({ 
      imageUrl,
      status: 'success' 
    })

  } catch (error) {
    console.error('❌ Ошибка генерации изображения:', error)
    
    // Детальное логирование ошибки
    if (error instanceof Error) {
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json(
      { 
        error: 'Не удалось сгенерировать изображение',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}
