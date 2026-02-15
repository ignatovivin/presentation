'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePresentationStore } from '@/store/presentation-store'
import { getTemplateStyle } from '@/lib/templates'
import { Button } from '@/components/ui/button'
import { ArrowLeft, X } from 'lucide-react'

export default function PresentPage() {
  const router = useRouter()
  const { currentPresentation } = usePresentationStore()
  const revealRef = useRef<HTMLDivElement>(null)
  const revealInstanceRef = useRef<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const templateStyle = currentPresentation ? getTemplateStyle(currentPresentation.templateId) : null
  const isFintech = currentPresentation?.templateId === 'fintech-corporate'

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

  const sectionClassName = isFintech
    ? 'flex flex-col items-start justify-center text-left'
    : 'flex flex-col items-center justify-center p-16'
  const sectionStyle = isFintech && templateStyle
    ? {
        background: 'var(--slide-bg)',
        color: 'var(--slide-text)',
        fontFamily: templateStyle.fonts?.body ?? 'Arial, sans-serif',
        padding: 'var(--padding-medium) var(--padding-large)',
      }
    : undefined

  return (
    <div
      className="fixed inset-0 bg-black z-50"
      data-template={currentPresentation.templateId || undefined}
    >
      {isFintech && templateStyle && (
        <style dangerouslySetInnerHTML={{ __html: `
          [data-template="fintech-corporate"] {
            ${Object.entries(templateStyle.cssVars).map(([k, v]) => `${k}: ${v};`).join('\n            ')}
          }
          [data-template="fintech-corporate"] .reveal {
            background: var(--slide-bg) !important;
          }
          [data-template="fintech-corporate"] .reveal .viewport {
            background: var(--slide-bg) !important;
          }
          [data-template="fintech-corporate"] .reveal .slides section {
            background: var(--slide-bg) !important;
            color: var(--slide-text) !important;
            text-align: left !important;
            padding: var(--padding-medium) var(--padding-large) !important;
            font-family: var(--font-body, Arial), Helvetica, sans-serif !important;
          }
          [data-template="fintech-corporate"] .reveal .slides section h1 {
            font-size: var(--heading-size) !important;
            font-weight: 700 !important;
            color: var(--slide-text) !important;
            margin-bottom: var(--spacing) !important;
          }
          [data-template="fintech-corporate"] .reveal .slides section .prose,
          [data-template="fintech-corporate"] .reveal .slides section .prose * {
            font-size: var(--body-size) !important;
            color: var(--slide-text) !important;
            line-height: 1.5 !important;
          }
          [data-template="fintech-corporate"] .reveal .slides section img {
            border-radius: var(--card-radius) !important;
            box-shadow: var(--card-shadow) !important;
          }
          /* Титульный слайд (первый) — данные шаблона B2B, правила после общих */
          [data-template="fintech-corporate"] .reveal .slides section[data-slide-type="title"] {
            background: var(--slide-bg-title) !important;
            color: var(--title-slide-text, var(--slide-text-white)) !important;
          }
          [data-template="fintech-corporate"] .reveal .slides section[data-slide-type="title"] h1,
          [data-template="fintech-corporate"] .reveal .slides section[data-slide-type="title"] .prose,
          [data-template="fintech-corporate"] .reveal .slides section[data-slide-type="title"] .prose * {
            color: var(--title-slide-text, var(--slide-text-white)) !important;
          }
        ` }} />
      )}
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
          {[...currentPresentation.slides]
            .sort((a, b) => a.order - b.order)
            .map((slide, index) => (
            <section
              key={slide.id}
              data-transition="slide"
              data-slide-type={index === 0 ? 'title' : slide.type}
              className={sectionClassName}
              style={sectionStyle}
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
                <h1 className={isFintech ? 'font-bold' : 'text-5xl font-bold mb-8'} style={isFintech ? { fontSize: 'var(--heading-size)' } : undefined}>
                  {slide.title}
                </h1>
              )}
              {slide.content && (
                <div
                  className="prose prose-lg max-w-4xl"
                  style={isFintech ? { fontSize: 'var(--body-size)' } : undefined}
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
