import { GoogleGenerativeAI } from '@google/generative-ai'
import { streamText } from 'ai'
import { NextRequest } from 'next/server'
import { google } from 'ai/google'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return new Response('GEMINI_API_KEY not configured', { status: 500 })
    }

    const { prompt } = await request.json()

    const result = streamText({
      model: google('gemini-pro'),
      apiKey,
      prompt,
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error('Streaming error:', error)
    return new Response('Failed to stream response', { status: 500 })
  }
}
