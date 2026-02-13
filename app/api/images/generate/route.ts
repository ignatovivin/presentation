// Генерация изображений через Replicate временно отключена — занимаемся внешним видом сайта.
// Раскомментировать при необходимости снова включить генерацию картинок.

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Генерация изображений временно отключена' },
    { status: 503 }
  )
}

/* Replicate — раскомментировать при включении генерации изображений:
import Replicate from 'replicate'

export const maxDuration = 120

export async function POST(request: NextRequest) {
  try {
    const apiToken = process.env.REPLICATE_API_TOKEN
    if (!apiToken) {
      return NextResponse.json(
        { error: 'REPLICATE_API_TOKEN не настроен' },
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
    const replicate = new Replicate({ auth: apiToken })
    const output = await replicate.run('black-forest-labs/flux-schnell', {
      input: {
        prompt,
        aspect_ratio: '16:9',
        output_format: 'webp',
        num_outputs: 1,
      },
    })
    const imageUrl = Array.isArray(output) ? output[0] : output
    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json(
        { error: 'Некорректный ответ Replicate' },
        { status: 500 }
      )
    }
    return NextResponse.json({ imageUrl, status: 'success' })
  } catch (error) {
    console.error('Image generation error:', error)
    return NextResponse.json(
      { error: 'Не удалось сгенерировать изображение' },
      { status: 500 }
    )
  }
}
*/
