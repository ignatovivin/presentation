'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { usePresentationStore } from '@/store/presentation-store'
import { getTemplateStyle } from '@/lib/templates'
import { SlideList } from '@/components/editor/slide-list'
import { SlideEditor } from '@/components/editor/slide-editor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Slide } from '@/lib/types'
import {
  Play,
  ArrowLeft,
} from 'lucide-react'

const TEMPLATE_NAMES: Record<string, string> = {
  'fintech-corporate': 'Финтех Корпоратив',
  minimal: 'Минимализм',
  dark: 'Тёмная тема',
  colorful: 'Яркий',
  corporate: 'Корпоративный',
  gradient: 'Градиенты',
  mono: 'Монохром',
}

export default function EditorPage() {
  const router = useRouter()
  const {
    currentPresentation,
    updatePresentation,
    updateSlide,
    deleteSlide,
    addSlide,
    reorderSlides,
    duplicateSlide,
    createPresentation,
  } = usePresentationStore()

  const [currentSlideId, setCurrentSlideId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasGenerated, setHasGenerated] = useState(false)
  /** Рендер контента только после монтирования — устраняет гидрацию (store/localStorage). */
  const [mounted, setMounted] = useState(false)
  const isGeneratingRef = useRef(false)
  const hasGeneratedRef = useRef(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const generateSlidesFromPrompt = useCallback(async (prompt: string, aiSettingsStr: string | null) => {
    if (!prompt || prompt.trim() === '') {
      return
    }

    // Защита от повторных вызовов - используем ref для синхронной проверки
    if (isGeneratingRef.current || hasGeneratedRef.current) {
      return
    }

    isGeneratingRef.current = true
    hasGeneratedRef.current = true
    setIsGenerating(true)
    setHasGenerated(true)
    try {
      // Парсим настройки AI из localStorage
      let settings: any = {}
      if (aiSettingsStr) {
        try {
          settings = JSON.parse(aiSettingsStr)
        } catch (e) {
          // Используем значения по умолчанию при ошибке парсинга
        }
      }

      const slidesCount = Math.min(50, Math.max(1, parseInt(typeof window !== 'undefined' ? (localStorage.getItem('slides-count') || '5') : '5', 10) || 5))
      // Подготавливаем данные для API с учетом всех настроек
      const generationOptions = {
        topic: prompt.trim(),
        slidesCount,
        style: settings.tone || 'professional',
        includeImages: settings.imageType && settings.imageType !== 'none',
        imageType: settings.imageType || 'realistic',
        language: settings.language || 'russian',
        audience: settings.audience || '',
      }

      // CORS / client-side: AI-API вызываем только через свой Next.js route, не напрямую из браузера
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generationOptions),
      })

      if (!response.ok) {
        let errorData: any = {}
        try {
          errorData = await response.json()
        } catch {
          const errorText = await response.text()
          errorData = { error: errorText }
        }
        let errorMessage = 'Не удалось сгенерировать слайды'
        if (errorData.error) {
          if (errorData.error.includes('GROQ_API_KEY не настроен')) {
            errorMessage = 'Ключ Groq не настроен. Установите GROQ_API_KEY в .env (или в настройках Vercel) и перезапустите сервер.'
          } else if (errorData.error.includes('Ошибка авторизации') || errorData.error.includes('401')) {
            errorMessage = 'Ошибка авторизации Groq. Проверьте правильность GROQ_API_KEY в .env или в настройках Vercel.'
          } else if (errorData.error.includes('429')) {
            errorMessage = 'Превышен лимит запросов к Groq. Попробуйте позже.'
          } else {
            errorMessage = errorData.error
          }
        }
        
        throw new Error(errorMessage)
      }

      const data = await response.json()

      if (!data.slides || !Array.isArray(data.slides) || data.slides.length === 0) {
        throw new Error('API вернул пустой массив слайдов или некорректный формат')
      }

      const generatedSlides = data.slides

      // Ждём немного, чтобы убедиться что презентация создана
      await new Promise(resolve => setTimeout(resolve, 200))

      // Получаем функции из store
      const store = usePresentationStore.getState()
      let pres = store.currentPresentation
      
      // Если презентации ещё нет, ждём ещё
      if (!pres) {
        await new Promise(resolve => setTimeout(resolve, 300))
        pres = usePresentationStore.getState().currentPresentation
      }

      if (!pres) {
        throw new Error('Презентация не создана')
      }

      // Удаляем дефолтный слайд
      if (pres.slides.length > 0) {
        store.deleteSlide(pres.slides[0].id)
      }

      // Добавляем сгенерированные слайды
      for (const slideData of generatedSlides) {
        // Обрабатываем контент - может быть строкой или HTML
        let content = ''
        if (slideData.content) {
          content = slideData.content.includes('<') 
            ? slideData.content 
            : `<p>${slideData.content}</p>`
        }

        store.addSlide({
          type: slideData.type || 'content',
          title: slideData.title || 'Новый слайд',
          content: content,
          ...(slideData.imageDescription && { imagePrompt: slideData.imageDescription }),
        })
      }

      // Выбираем первый слайд, остаёмся в редакторе
      setTimeout(() => {
        const updatedPres = usePresentationStore.getState().currentPresentation
        if (updatedPres && updatedPres.slides.length > 0) {
          setCurrentSlideId(updatedPres.slides[0].id)
        }
      }, 200)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
      alert(`Ошибка генерации: ${errorMessage}`)
      // В случае ошибки создаём дефолтные слайды
      setTimeout(() => {
        const store = usePresentationStore.getState()
        const pres = store.currentPresentation
        if (pres && pres.slides.length === 1) {
          store.addSlide({ type: 'content', title: 'Введение', content: 'Начните с введения' })
          store.addSlide({ type: 'content', title: 'Основная часть', content: 'Основной контент' })
          store.addSlide({ type: 'content', title: 'Заключение', content: 'Подведите итоги' })
        }
      }, 100)
    } finally {
      isGeneratingRef.current = false
      setIsGenerating(false)
    }
  }, [router])

  useEffect(() => {
    // Все значения с главного экрана: промпт, количество слайдов (slides-count), настройки AI (ai-settings)
    const prompt = localStorage.getItem('prompt')
    const aiSettings = localStorage.getItem('ai-settings')
    const shouldGenerate = localStorage.getItem('should-generate') === 'true'

    // Шаблон, выбранный на странице /template (сохраняем в презентацию)
    const templateId = typeof window !== 'undefined' ? localStorage.getItem('presentation-template') : null

    // Если установлен флаг should-generate: либо создаём из outline-cards, либо полная генерация через AI
    if (shouldGenerate && !isGeneratingRef.current && !hasGeneratedRef.current) {
      localStorage.removeItem('should-generate')

      const outlineCardsStr = typeof window !== 'undefined' ? localStorage.getItem('outline-cards') : null
      let outlineCards: { id: string; title: string; content: string }[] = []
      if (outlineCardsStr) {
        try {
          outlineCards = JSON.parse(outlineCardsStr)
        } catch {}
      }

      if (currentPresentation) {
        const store = usePresentationStore.getState()
        store.deletePresentation(currentPresentation.id)
      }

      hasGeneratedRef.current = false
      setHasGenerated(false)

      const title = (prompt || '').length > 50 ? (prompt || '').substring(0, 50) + '...' : (prompt || 'Презентация')

      if (outlineCards.length > 0) {
        hasGeneratedRef.current = true
        createPresentation(title, templateId || undefined)
        setTimeout(() => {
          const store = usePresentationStore.getState()
          const pres = store.currentPresentation
          if (pres) {
            store.deleteSlide(pres.slides[0].id)
            outlineCards.forEach((card) => {
              store.addSlide({ type: 'content', title: card.title || 'Слайд', content: card.content || '' })
            })
          }
          const updated = usePresentationStore.getState().currentPresentation
          if (updated?.slides.length) setCurrentSlideId(updated.slides[0].id)
        }, 100)
        return
      }

      if (!prompt) return

      setTimeout(() => {
        createPresentation(title, templateId || undefined)
        setTimeout(() => {
          generateSlidesFromPrompt(prompt, aiSettings)
        }, 100)
      }, 50)
      return
    }

    // Если нет презентации, создаём новую и генерируем слайды через AI
    if (!currentPresentation && !isGeneratingRef.current) {
      if (!prompt) {
        createPresentation('Презентация без названия', templateId || undefined)
        return
      }

      const title = prompt.length > 50 ? prompt.substring(0, 50) + '...' : prompt
      createPresentation(title, templateId || undefined)

      setTimeout(() => {
        generateSlidesFromPrompt(prompt, aiSettings)
      }, 100)
      return
    }

    // Если презентация существует, но у неё только один дефолтный слайд и есть промпт - генерируем слайды
    if (currentPresentation && prompt && !isGeneratingRef.current && !shouldGenerate && !hasGeneratedRef.current) {
      const hasOnlyDefaultSlide = currentPresentation.slides.length === 1 && 
        (currentPresentation.slides[0].title === 'Новый слайд' || currentPresentation.slides[0].content === '')
      
      if (hasOnlyDefaultSlide) {
        setTimeout(() => {
          generateSlidesFromPrompt(prompt, aiSettings)
        }, 100)
        return
      }
    }

    if (currentPresentation && currentPresentation.slides.length > 0 && !currentSlideId) {
      setCurrentSlideId(currentPresentation.slides[0].id)
    }
  }, [currentPresentation, currentSlideId, createPresentation, generateSlidesFromPrompt, router])

  const currentSlide = currentPresentation?.slides.find(
    (s) => s.id === currentSlideId
  )

  const handleAddSlide = useCallback((type: Slide['type'] = 'content') => {
    if (!currentPresentation) return
    const slideCount = currentPresentation.slides.length
    addSlide({ type, title: 'Новый слайд', content: '' })
    setTimeout(() => {
      const updated = usePresentationStore.getState().currentPresentation
      const newSlide = updated?.slides.find((s) => s.order === slideCount)
      if (newSlide) setCurrentSlideId(newSlide.id)
    }, 100)
  }, [currentPresentation, addSlide])

  const handleDeleteSlide = useCallback((slideId: string) => {
    if (!currentPresentation) return
    const remaining = currentPresentation.slides.filter((s) => s.id !== slideId)
    if (remaining.length > 0 && currentSlideId === slideId) {
      setCurrentSlideId(remaining[0].id)
    }
    deleteSlide(slideId)
  }, [currentPresentation, currentSlideId, deleteSlide])

  const handleChangeSlideType = useCallback((slideId: string) => {
    if (!currentPresentation) return
    const slide = currentPresentation.slides.find((s) => s.id === slideId)
    if (!slide) return
    const types: Slide['type'][] = ['title', 'content', 'image', 'split']
    const nextType = types[(types.indexOf(slide.type) + 1) % types.length]
    updateSlide(slideId, { type: nextType })
  }, [currentPresentation, updateSlide])

  const handleSlideUpdate = useCallback((updates: Partial<Slide>) => {
    if (currentSlide) updateSlide(currentSlide.id, updates)
  }, [currentSlide, updateSlide])

  const handleSlideDelete = useCallback(() => {
    if (!currentSlide || !currentPresentation) return
    const remaining = currentPresentation.slides.filter((s) => s.id !== currentSlide.id)
    if (remaining.length > 0) setCurrentSlideId(remaining[0].id)
    deleteSlide(currentSlide.id)
  }, [currentSlide, currentPresentation, deleteSlide])

  // До монтирования показываем один и тот же placeholder (сервер и клиент совпадают — нет #418)
  if (!mounted) {
    return (
      <div className="h-screen flex flex-col bg-[rgb(255,255,255)]" suppressHydrationWarning>
        <div className="h-12 border-b border-gray-200 bg-[rgb(255,255,255)]" />
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          Загрузка редактора…
        </div>
      </div>
    )
  }

  if (!currentPresentation) {
    return null
  }

  return (
    <div className="h-screen flex flex-col bg-[rgb(255,255,255)]">
      <header className="h-12 bg-[rgb(255,255,255)] px-4 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.push('/')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Input
            value={currentPresentation.title}
            onChange={(e) =>
              updatePresentation(currentPresentation.id, { title: e.target.value })
            }
            className="text-sm font-medium border-none bg-transparent focus-visible:ring-0 max-w-md px-2 h-8"
            placeholder="Без названия"
          />
          {currentPresentation.templateId && (
            <span className="text-xs text-gray-500 whitespace-nowrap">
              Шаблон: {TEMPLATE_NAMES[currentPresentation.templateId] || currentPresentation.templateId}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-sm"
            onClick={() => router.push('/present')}
          >
            <Play className="h-4 w-4 mr-1" />
            Презентация
          </Button>
        </div>
      </header>

      {/* Глобальный сброс размера меню — компактные паддинги */}
      <style dangerouslySetInnerHTML={{ __html: `
        [data-unified-menu] {
          font-size: 14px !important;
          padding: 4px 8px !important;
          min-height: unset !important;
          box-sizing: border-box !important;
        }
        [data-unified-menu] * {
          font-size: 14px !important;
          box-sizing: border-box !important;
        }
        [data-unified-menu] button {
          padding: 6px !important;
          min-width: unset !important;
          min-height: unset !important;
        }
        [data-unified-menu] button svg,
        [data-unified-menu] img {
          width: 16px !important;
          height: 16px !important;
          min-width: 16px !important;
          min-height: 16px !important;
        }
      ` }} />
      {/* Main Editor — слева превью + кнопка «Добавить слайд», по центру слайд (как в Figma) */}
      <div className="flex-1 grid grid-cols-[110px_1fr] min-h-0 overflow-visible">
        <SlideList
          slides={currentPresentation.slides}
          currentSlideId={currentSlideId}
          onSelectSlide={setCurrentSlideId}
          onReorderSlides={reorderSlides}
          onAddSlide={handleAddSlide}
          onDuplicateSlide={duplicateSlide}
          onDeleteSlide={handleDeleteSlide}
          onChangeSlideType={handleChangeSlideType}
        />

        {/* Центральная область — слайд по центру (как в Figma) */}
        <div className="relative overflow-visible bg-[#f5f5f5] grid place-items-center p-4 min-h-0">
          {currentSlide ? (
            <div
              id={`slide-${currentSlide.id}`}
              className="absolute inset-0 grid place-items-center p-6 overflow-visible"
            >
              {/* Окно слайда: стиль шаблона применяется к канвасу (финтех и др.) */}
              {(() => {
                const templateId = currentPresentation?.templateId
                const isFintech = templateId === 'fintech-corporate'
                const templateStyle = getTemplateStyle(templateId)
                const canvasClass = 'w-full max-w-[1280px] max-h-full aspect-video overflow-visible rounded-[32px] shrink-0 ' + (isFintech ? 'editor-slide-canvas editor-slide-canvas-fintech' : 'bg-white')
                const canvasStyle = isFintech && templateStyle
                  ? (Object.fromEntries(
                      Object.entries(templateStyle.cssVars).map(([k, v]) => [k, v])
                    ) as React.CSSProperties)
                  : undefined
                const fontFamily = templateStyle?.fonts?.body ?? 'Arial, Helvetica, sans-serif'
                return (
                  <>
                    {isFintech && templateStyle && (
                      <style dangerouslySetInnerHTML={{ __html: `
                        /* Стили шаблона — только для контента слайда, не для header/sidebar/кнопок */
                        [data-editor-presentation-block].editor-slide-canvas-fintech {
                          background: var(--slide-bg) !important;
                          color: var(--slide-text) !important;
                          font-family: ${fontFamily} !important;
                          padding: var(--padding-medium) var(--padding-large) !important;
                          text-align: left !important;
                        }
                        [data-editor-presentation-block].editor-slide-canvas-fintech [data-slide-title],
                        [data-editor-presentation-block].editor-slide-canvas-fintech [data-slide-title] input {
                          font-size: var(--heading-size) !important;
                          font-weight: 700 !important;
                          color: var(--slide-text) !important;
                          margin-bottom: var(--spacing) !important;
                        }
                        [data-editor-presentation-block].editor-slide-canvas-fintech .ProseMirror,
                        [data-editor-presentation-block].editor-slide-canvas-fintech .ProseMirror * {
                          font-size: var(--body-size) !important;
                          color: var(--slide-text) !important;
                          line-height: 1.5 !important;
                        }
                        [data-editor-presentation-block].editor-slide-canvas-fintech img {
                          border-radius: var(--card-radius) !important;
                          box-shadow: var(--card-shadow) !important;
                        }
                        /* Всплывающие меню — сброс стилей шаблона, компактный UI */
                        [data-editor-presentation-block].editor-slide-canvas-fintech [data-unified-menu] {
                          color: #171717 !important;
                          font-size: 14px !important;
                          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                          line-height: normal !important;
                          font-weight: normal !important;
                          padding: 4px 8px !important;
                          min-height: unset !important;
                          box-sizing: border-box !important;
                        }
                        [data-editor-presentation-block].editor-slide-canvas-fintech [data-unified-menu] * {
                          color: #171717 !important;
                          font-size: 14px !important;
                          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                          line-height: normal !important;
                          font-weight: normal !important;
                          box-sizing: border-box !important;
                        }
                        [data-editor-presentation-block].editor-slide-canvas-fintech [data-unified-menu] button {
                          font-size: 14px !important;
                          padding: 6px !important;
                          min-width: unset !important;
                          min-height: unset !important;
                        }
                        [data-editor-presentation-block].editor-slide-canvas-fintech [data-unified-menu] button svg,
                        [data-editor-presentation-block].editor-slide-canvas-fintech [data-unified-menu] img {
                          width: 16px !important;
                          height: 16px !important;
                          min-width: 16px !important;
                          min-height: 16px !important;
                        }
                      ` }} />
                    )}
                    <div
                      className={canvasClass}
                      data-editor-presentation-block
                      data-template={templateId || undefined}
                      style={canvasStyle}
                    >
                      <SlideEditor
                        slide={currentSlide}
                        onUpdate={handleSlideUpdate}
                        onDelete={handleSlideDelete}
                      />
                    </div>
                  </>
                )
              })()}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              Выберите слайд для редактирования
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
