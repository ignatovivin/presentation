'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { usePresentationStore } from '@/store/presentation-store'
import { SlideList } from '@/components/editor/slide-list'
import { SlideEditor } from '@/components/editor/slide-editor'
import { AIGenerator } from '@/components/editor/ai-generator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Slide } from '@/lib/types'
import {
  Play,
  ArrowLeft,
} from 'lucide-react'

const TEMPLATE_NAMES: Record<string, string> = {
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
  const [aiGeneratorOpen, setAIGeneratorOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasGenerated, setHasGenerated] = useState(false)
  /** Рендер контента только после монтирования — устраняет гидрацию #418 (store/localStorage/расширения). */
  const [mounted, setMounted] = useState(false)

  // Используем ref для отслеживания запущенной генерации (синхронный доступ)
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

      // Подготавливаем данные для API с учетом всех настроек
      const generationOptions = {
        topic: prompt.trim(),
        slidesCount: 5,
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
        console.error('Ошибка API:', response.status, errorData)
        
        let errorMessage = 'Не удалось сгенерировать слайды'
        if (errorData.error) {
          if (errorData.error.includes('GIGACHAT_AUTH_KEY не настроен')) {
            errorMessage = 'Ключ авторизации GigaChat не настроен. Установите ваш ключ в файле .env и перезапустите сервер.'
          } else if (errorData.error.includes('Ошибка авторизации')) {
            errorMessage = 'Ошибка авторизации GigaChat. Проверьте правильность ключа авторизации в файле .env'
          } else if (errorData.error.includes('Неверный API ключ')) {
            errorMessage = 'Неверный ключ авторизации GigaChat. Проверьте правильность ключа в файле .env'
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

      // Выбираем первый слайд
      setTimeout(() => {
        const updatedPres = usePresentationStore.getState().currentPresentation
        if (updatedPres && updatedPres.slides.length > 0) {
          setCurrentSlideId(updatedPres.slides[0].id)
        }
      }, 200)
    } catch (error) {
      console.error('Ошибка генерации слайдов:', error)
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
  }, [])

  useEffect(() => {
    const prompt = localStorage.getItem('prompt')
    const aiSettings = localStorage.getItem('ai-settings')
    const shouldGenerate = localStorage.getItem('should-generate') === 'true'

    // Шаблон, выбранный на странице /template (сохраняем в презентацию)
    const templateId = typeof window !== 'undefined' ? localStorage.getItem('presentation-template') : null

    // Если установлен флаг should-generate, создаём новую презентацию с шаблоном
    if (shouldGenerate && prompt && !isGeneratingRef.current && !hasGeneratedRef.current) {
      localStorage.removeItem('should-generate')

      if (currentPresentation) {
        const store = usePresentationStore.getState()
        store.deletePresentation(currentPresentation.id)
      }

      hasGeneratedRef.current = false
      setHasGenerated(false)

      const title = prompt.length > 50 ? prompt.substring(0, 50) + '...' : prompt

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
  }, [currentPresentation, currentSlideId, createPresentation, generateSlidesFromPrompt])

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
      <div className="h-screen flex flex-col bg-[#fafafa]" suppressHydrationWarning>
        <div className="h-12 border-b border-gray-200 bg-gray-50" />
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
    <div className="h-screen flex flex-col bg-[#fafafa]">
      {/* Top Bar - тонкий, светло-серый */}
      <header className="h-12 border-b border-gray-200 bg-gray-50 px-4 flex items-center justify-between">
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

      {/* Main Editor */}
      <div className="flex-1 flex overflow-hidden">
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

        {/* Центральная область - белый фон, минималистичный */}
        <div className="flex-1 overflow-y-auto bg-white">
          {currentSlide ? (
            <div id={`slide-${currentSlide.id}`} className="h-full flex items-center justify-center p-8">
              <SlideEditor
                slide={currentSlide}
                onUpdate={handleSlideUpdate}
                onDelete={handleSlideDelete}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              Выберите слайд для редактирования
            </div>
          )}
        </div>
      </div>

      <AIGenerator open={aiGeneratorOpen} onOpenChange={setAIGeneratorOpen} />
    </div>
  )
}
