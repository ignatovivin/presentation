'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ImageGeneratorProps {
  description: string
  onImageGenerated: (imageUrl: string) => void
  onCancel: () => void
}

export function ImageGenerator({
  description,
  onImageGenerated,
  onCancel,
}: ImageGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const generateImage = async () => {
      try {
        setIsGenerating(true)
        setError(null)

        // CORS / client-side: внешние API только через Next.js route, не из браузера
        const response = await fetch('/api/images/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: description }),
        })

        if (!response.ok) {
          throw new Error('Не удалось создать изображение')
        }

        const { imageUrl } = await response.json()
        onImageGenerated(imageUrl)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не удалось создать изображение')
      } finally {
        setIsGenerating(false)
      }
    }

    if (description) {
      generateImage()
    }
  }, [description, onImageGenerated])

  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-100 dark:bg-slate-800 rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
        <p className="text-sm text-muted-foreground">Генерация изображения...</p>
        <p className="text-xs text-muted-foreground mt-2">{description}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <p className="text-sm text-red-600 dark:text-red-400 mb-2">{error}</p>
        <Button variant="outline" size="sm" onClick={onCancel}>
          Отмена
        </Button>
      </div>
    )
  }

  return null
}
