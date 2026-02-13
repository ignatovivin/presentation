'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, Suspense, useEffect } from 'react'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

const TEMPLATES = [
  {
    id: 'minimal',
    name: 'Минимализм',
    description: 'Чистый дизайн для бизнеса',
    colors: ['#FFFFFF', '#000000', '#3B82F6'],
  },
  {
    id: 'dark',
    name: 'Тёмная тема',
    description: 'Современный tech-стиль',
    colors: ['#0F172A', '#1E293B', '#06B6D4'],
  },
  {
    id: 'colorful',
    name: 'Яркий',
    description: 'Креативный с акцентами',
    colors: ['#FFFFFF', '#EC4899', '#F59E0B'],
  },
  {
    id: 'corporate',
    name: 'Корпоративный',
    description: 'Классический стиль',
    colors: ['#FFFFFF', '#1F2937', '#10B981'],
  },
  {
    id: 'gradient',
    name: 'Градиенты',
    description: 'Плавные переходы',
    colors: ['#6366F1', '#8B5CF6', '#EC4899'],
  },
  {
    id: 'mono',
    name: 'Монохром',
    description: 'Элегантный ч/б',
    colors: ['#FFFFFF', '#6B7280', '#111827'],
  },
]

function TemplatePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const topicFromUrl = searchParams.get('topic') || ''

  const [selected, setSelected] = useState<string>('')
  const [mounted, setMounted] = useState(false)
  const [topic, setTopic] = useState(topicFromUrl)

  // Синхронизируем тему из URL (после гидрации) или из localStorage
  useEffect(() => {
    setMounted(true)
    if (topicFromUrl) {
      setTopic(topicFromUrl)
    } else if (typeof window !== 'undefined') {
      setTopic(localStorage.getItem('prompt') || '')
    }
  }, [topicFromUrl])

  const handleGenerate = () => {
    if (!selected) return
    if (typeof window !== 'undefined') {
      // Промпт: из state, из URL или из localStorage — чтобы точно дошёл до редактора
      const promptToSave = topic || topicFromUrl || localStorage.getItem('prompt') || ''
      localStorage.setItem('presentation-template', selected)
      localStorage.setItem('prompt', promptToSave)
      localStorage.setItem('should-generate', 'true')
    }
    router.push('/generating')
  }

  const handleBack = () => {
    router.push('/')
  }


  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <Loader2 className="w-8 h-8 animate-spin text-[rgb(52,137,243)]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fafafa] p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 -ml-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Назад
          </Button>

          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Выберите стиль презентации
          </h1>

          {topic && (
            <div className="flex items-start gap-2 text-gray-600">
              <span className="text-gray-500">Тема:</span>
              <p className="font-medium text-gray-900 flex-1 line-clamp-2">
                {topic}
              </p>
            </div>
          )}
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => setSelected(template.id)}
              className={`
                relative p-6 rounded-xl border-2 text-left
                transition-all duration-200 hover:scale-[1.02]
                ${selected === template.id
                  ? 'border-[rgb(52,137,243)] bg-blue-50 shadow-lg'
                  : 'border-gray-200 hover:border-gray-300 bg-white'}
              `}
            >
              {/* Color preview */}
              <div className="aspect-video rounded-lg mb-4 overflow-hidden flex">
                {template.colors.map((color, i) => (
                  <div
                    key={i}
                    className="flex-1 transition-transform hover:scale-110"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold mb-1 text-lg text-gray-900">
                    {template.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {template.description}
                  </p>
                </div>
                {selected === template.id && (
                  <div className="w-6 h-6 rounded-full bg-[rgb(52,137,243)] flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Action Button */}
        <div className="sticky bottom-6 flex justify-center">
          <Button
            onClick={handleGenerate}
            disabled={!selected}
            className="px-10 py-4 rounded-full font-semibold text-lg shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed bg-[rgb(52,137,243)] hover:bg-[rgb(42,120,214)] text-white"
          >
            {selected ? 'Создать презентацию →' : 'Выберите шаблон'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function TemplatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
          <Loader2 className="w-8 h-8 animate-spin text-[rgb(52,137,243)]" />
        </div>
      }
    >
      <TemplatePageContent />
    </Suspense>
  )
}
