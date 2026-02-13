import Replicate from 'replicate'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const apiToken = process.env.REPLICATE_API_TOKEN
    if (!apiToken) {
      return NextResponse.json(
        { error: 'REPLICATE_API_TOKEN not configured' },
        { status: 500 }
      )
    }

    const { prompt } = await request.json()

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    const replicate = new Replicate({
      auth: apiToken,
    })

    const output = await replicate.run(
      'black-forest-labs/flux-1-schnell',
      {
        input: {
          prompt,
          aspect_ratio: '16:9',
          output_format: 'webp',
        },
      }
    )

    // Replicate returns an array with the image URL
    const imageUrl = Array.isArray(output) ? output[0] : output

    return NextResponse.json({ imageUrl })
  } catch (error) {
    console.error('Image generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    )
  }
}
