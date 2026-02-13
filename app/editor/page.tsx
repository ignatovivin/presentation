'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { usePresentationStore } from '@/store/presentation-store'
import { SlideList } from '@/components/editor/slide-list'
import { SlideEditor } from '@/components/editor/slide-editor'
import { AIGenerator } from '@/components/editor/ai-generator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Slide } from '@/lib/types'
import {
  Sparkles,
  Play,
  Download,
  ArrowLeft,
} from 'lucide-react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

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
  const [isExporting, setIsExporting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasGenerated, setHasGenerated] = useState(false)

  const generateSlidesFromPrompt = useCallback(async (prompt: string, aiSettingsStr: string | null) => {
    console.log('=== generateSlidesFromPrompt вызвана ===', { prompt, aiSettingsStr, isGenerating, hasGenerated })
    
    if (!prompt || prompt.trim() === '') {
      console.error('Промпт пустой или не найден')
      return
    }

    // Защита от повторных вызовов - используем ref для синхронной проверки
    if (isGenerating || hasGenerated) {
      console.log('Генерация уже выполняется или уже выполнена, пропускаем', { isGenerating, hasGenerated })
      return
    }

    console.log('Начинаем генерацию слайдов...')
    setIsGenerating(true)
    setHasGenerated(true)
    try {
      // Парсим настройки AI из localStorage
      let settings: any = {}
      if (aiSettingsStr) {
        try {
          settings = JSON.parse(aiSettingsStr)
          console.log('Настройки AI загружены:', settings)
        } catch (e) {
          console.warn('Ошибка парсинга настроек AI:', e)
        }
      } else {
        console.log('Настройки AI не найдены, используются значения по умолчанию')
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

      console.log('Генерация слайдов с параметрами:', generationOptions)

      // Вызываем API для генерации слайдов
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
      console.log('Ответ от API:', data)

      if (!data.slides || !Array.isArray(data.slides) || data.slides.length === 0) {
        throw new Error('API вернул пустой массив слайдов или некорректный формат')
      }

      const generatedSlides = data.slides
      console.log('Сгенерировано слайдов:', generatedSlides.length)

      // Ждём немного, чтобы убедиться что презентация создана
      await new Promise(resolve => setTimeout(resolve, 200))

      // Получаем функции из store
      const store = usePresentationStore.getState()
      let pres = store.currentPresentation
      
      // Если презентации ещё нет, ждём ещё
      if (!pres) {
        console.warn('Презентация не найдена, ждём...')
        await new Promise(resolve => setTimeout(resolve, 300))
        pres = usePresentationStore.getState().currentPresentation
      }

      if (!pres) {
        throw new Error('Презентация не создана')
      }

      console.log('Текущая презентация:', pres.id, 'Слайдов:', pres.slides.length)

      // Удаляем дефолтный слайд
      if (pres.slides.length > 0) {
        console.log('Удаляем дефолтный слайд:', pres.slides[0].id)
        store.deleteSlide(pres.slides[0].id)
      }

      // Добавляем сгенерированные слайды
      console.log('Добавляем сгенерированные слайды...')
      for (const slideData of generatedSlides) {
        // Обрабатываем контент - может быть строкой или HTML
        let content = ''
        if (slideData.content) {
          // Если контент уже HTML, используем как есть, иначе оборачиваем в параграф
          content = slideData.content.includes('<') 
            ? slideData.content 
            : `<p>${slideData.content}</p>`
        }

        store.addSlide({
          type: slideData.type || 'content',
          title: slideData.title || 'Новый слайд',
          content: content,
        })
        console.log('Добавлен слайд:', slideData.title)
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
      setIsGenerating(false)
    }
  }, [isGenerating, hasGenerated])

  useEffect(() => {
    console.log('Editor useEffect triggered:', {
      currentPresentation: currentPresentation?.id,
      isGenerating,
      slidesCount: currentPresentation?.slides.length
    })

    const prompt = localStorage.getItem('prompt')
    const aiSettings = localStorage.getItem('ai-settings')
    const shouldGenerate = localStorage.getItem('should-generate') === 'true'

    // Если установлен флаг should-generate, создаём новую презентацию
    if (shouldGenerate && prompt && !isGenerating && !hasGenerated) {
      console.log('Флаг should-generate установлен. Создаём новую презентацию.')
      localStorage.removeItem('should-generate') // Удаляем флаг
      
      // Если есть старая презентация, удаляем её
      if (currentPresentation) {
        console.log('Удаляем старую презентацию:', currentPresentation.id)
        const store = usePresentationStore.getState()
        store.deletePresentation(currentPresentation.id)
      }
      
      // Сброс флага генерации при создании новой презентации
      setHasGenerated(false)
      
      // Создаём презентацию с названием из промпта (первые 50 символов)
      const title = prompt.length > 50 ? prompt.substring(0, 50) + '...' : prompt
      console.log('Создаём презентацию с названием:', title)
      
      // Ждём немного, чтобы состояние обновилось после удаления
      setTimeout(() => {
        createPresentation(title)
        
        // Ждём ещё немного, чтобы презентация создалась, затем генерируем слайды
        setTimeout(() => {
          console.log('Вызываем generateSlidesFromPrompt')
          generateSlidesFromPrompt(prompt, aiSettings)
        }, 100)
      }, 50)
      return
    }

    // Если нет презентации, создаём новую и генерируем слайды через AI
    if (!currentPresentation && !isGenerating) {
      console.log('Создание презентации. Промпт:', prompt, 'Настройки:', aiSettings)
      
      if (!prompt) {
        console.log('Промпт не найден, создаём пустую презентацию')
        // Если нет промпта, просто создаём пустую презентацию
        createPresentation('Презентация без названия')
        return
      }
      
      // Создаём презентацию с названием из промпта (первые 50 символов)
      const title = prompt.length > 50 ? prompt.substring(0, 50) + '...' : prompt
      console.log('Создаём презентацию с названием:', title)
      createPresentation(title)
      
      // Ждём немного, чтобы презентация создалась, затем генерируем слайды
      setTimeout(() => {
        console.log('Вызываем generateSlidesFromPrompt')
        generateSlidesFromPrompt(prompt, aiSettings)
      }, 100)
      return
    }

    // Если презентация существует, но у неё только один дефолтный слайд и есть промпт - генерируем слайды
    if (currentPresentation && prompt && !isGenerating && !shouldGenerate && !hasGenerated) {
      const hasOnlyDefaultSlide = currentPresentation.slides.length === 1 && 
        (currentPresentation.slides[0].title === 'Новый слайд' || currentPresentation.slides[0].content === '')
      
      console.log('Проверка презентации:', {
        slidesCount: currentPresentation.slides.length,
        firstSlideTitle: currentPresentation.slides[0]?.title,
        firstSlideContent: currentPresentation.slides[0]?.content,
        hasOnlyDefaultSlide
      })
      
      if (hasOnlyDefaultSlide) {
        console.log('Презентация существует, но пустая. Генерируем слайды из промпта:', prompt)
        setTimeout(() => {
          generateSlidesFromPrompt(prompt, aiSettings)
        }, 100)
        return
      }
    }

    if (currentPresentation && currentPresentation.slides.length > 0 && !currentSlideId) {
      console.log('Выбираем первый слайд:', currentPresentation.slides[0].id)
      setCurrentSlideId(currentPresentation.slides[0].id)
    }
  }, [currentPresentation, currentSlideId, createPresentation, isGenerating, generateSlidesFromPrompt, hasGenerated])

  const currentSlide = currentPresentation?.slides.find(
    (s) => s.id === currentSlideId
  )

  const handleExportPDF = async () => {
    if (!currentPresentation) return

    setIsExporting(true)
    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [1920, 1080],
      })

      for (let i = 0; i < currentPresentation.slides.length; i++) {
        const slide = currentPresentation.slides[i]
        const slideElement = document.getElementById(`slide-${slide.id}`)

        if (slideElement) {
          const canvas = await html2canvas(slideElement, {
            width: 1920,
            height: 1080,
            scale: 1,
          })

          const imgData = canvas.toDataURL('image/png')

          if (i > 0) pdf.addPage()
          pdf.addImage(imgData, 'PNG', 0, 0, 1920, 1080)
        }
      }

      pdf.save(`${currentPresentation.title || 'презентация'}.pdf`)
    } catch (error) {
      console.error('Export error:', error)
      alert('Не удалось экспортировать PDF')
    } finally {
      setIsExporting(false)
    }
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
          onAddSlide={(type = 'content') => {
            const slideCount = currentPresentation.slides.length
            addSlide({
              type,
              title: 'Новый слайд',
              content: '',
            })
            setTimeout(() => {
              const updatedPresentation = usePresentationStore.getState().currentPresentation
              if (updatedPresentation) {
                const newSlide = updatedPresentation.slides.find(s => s.order === slideCount)
                if (newSlide) {
                  setCurrentSlideId(newSlide.id)
                }
              }
            }, 100)
          }}
          onDuplicateSlide={(slideId) => {
            duplicateSlide(slideId)
          }}
          onDeleteSlide={(slideId) => {
            const remainingSlides = currentPresentation.slides.filter(
              (s) => s.id !== slideId
            )
            if (remainingSlides.length > 0 && currentSlideId === slideId) {
              setCurrentSlideId(remainingSlides[0].id)
            }
            deleteSlide(slideId)
          }}
          onChangeSlideType={(slideId) => {
            const slide = currentPresentation.slides.find((s) => s.id === slideId)
            if (!slide) return
            const types: Slide['type'][] = ['title', 'content', 'image', 'split']
            const currentIndex = types.indexOf(slide.type)
            const nextType = types[(currentIndex + 1) % types.length]
            updateSlide(slideId, { type: nextType })
          }}
        />

        {/* Центральная область - белый фон, минималистичный */}
        <div className="flex-1 overflow-y-auto bg-white">
          {currentSlide ? (
            <div id={`slide-${currentSlide.id}`} className="h-full flex items-center justify-center p-8">
              <SlideEditor
                slide={currentSlide}
                onUpdate={(updates) => updateSlide(currentSlide.id, updates)}
                onDelete={() => {
                  const remainingSlides = currentPresentation.slides.filter(
                    (s) => s.id !== currentSlide.id
                  )
                  if (remainingSlides.length > 0) {
                    setCurrentSlideId(remainingSlides[0].id)
                  }
                  deleteSlide(currentSlide.id)
                }}
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
