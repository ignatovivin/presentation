'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePresentationStore } from '@/store/presentation-store'
import { Button } from '@/components/ui/button'
import { ArrowLeft, X } from 'lucide-react'

export default function PresentPage() {
  const router = useRouter()
  const { currentPresentation } = usePresentationStore()
  const revealRef = useRef<HTMLDivElement>(null)
  const revealInstanceRef = useRef<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (!currentPresentation) {
      router.push('/')
      return
    }

    const loadReveal = async () => {
      if (typeof window !== 'undefined' && revealRef.current && !revealInstanceRef.current) {
        const Reveal = (await import('reveal.js')).default
        // Динамически загружаем CSS файлы reveal.js
        await import('reveal.js/dist/reveal.css')
        await import('reveal.js/dist/theme/white.css')

        revealInstanceRef.current = new Reveal(revealRef.current, {
          hash: true,
          controls: true,
          progress: true,
          center: true,
          touch: true,
          loop: false,
          transition: 'slide',
        })

        await revealInstanceRef.current.initialize()
        setIsLoaded(true)
      }
    }

    loadReveal()

    return () => {
      if (revealInstanceRef.current) {
        revealInstanceRef.current.destroy()
        revealInstanceRef.current = null
      }
    }
  }, [currentPresentation, router])

  if (!currentPresentation) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black z-50">
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push('/editor')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад к редактору
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push('/')}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div ref={revealRef} className="reveal">
        <div className="slides">
          {currentPresentation.slides.map((slide, index) => (
            <section
              key={slide.id}
              data-transition="slide"
              className="flex flex-col items-center justify-center p-16"
            >
              {slide.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={slide.imageUrl}
                  alt={slide.title || 'Slide image'}
                  className="max-w-full max-h-96 mb-8 rounded-lg"
                />
              )}
              {slide.title && (
                <h1 className="text-5xl font-bold mb-8">{slide.title}</h1>
              )}
              {slide.content && (
                <div
                  className="prose prose-lg max-w-4xl"
                  dangerouslySetInnerHTML={{ __html: slide.content }}
                />
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
