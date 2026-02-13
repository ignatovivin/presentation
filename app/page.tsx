'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Play } from 'lucide-react'
import Image from 'next/image'
import { AIGenerator } from '@/components/editor/ai-generator'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'

const PLACEHOLDER_VARIANTS = [
  'Питч-презентация для серии A раунда...',
  'Обучающий курс по финансовой грамотности...',
  'Quarterly report для совета директоров...',
]

export default function HomePage() {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [placeholderIndex, setPlaceholderIndex] = useState(0)

  const handleGenerate = () => {
    if (!content.trim()) {
      alert('Пожалуйста, введите текст для презентации')
      return
    }
    // Сохраняем промпт для использования на экране outline
    if (typeof window !== 'undefined') {
      localStorage.setItem('prompt', content.trim())
      localStorage.setItem('should-generate', 'true') // Флаг для генерации новой презентации
      console.log('Промпт сохранен:', content.trim())
      const aiSettings = localStorage.getItem('ai-settings')
      console.log('Настройки AI:', aiSettings)
    }
    router.push('/generating')
  }

  const handleFilesClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (
      file.type.startsWith('text/') ||
      file.name.endsWith('.txt') ||
      file.name.endsWith('.md')
    ) {
      const text = await file.text()
      setContent((prev) => (prev ? `${prev}\n\n${text}` : text))
    } else {
      console.warn('Поддерживаются только текстовые файлы')
    }

    event.target.value = ''
  }

  useEffect(() => {
    const interval = window.setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDER_VARIANTS.length)
    }, 3000)

    return () => window.clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4">
      <div className="w-[600px] space-y-8">
        {/* Header */}
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-semibold text-gray-900">
            Предоставьте ваш контент
          </h1>
          <p className="text-base max-w-xl mx-auto leading-relaxed text-[rgb(134,133,133)]">
            Расскажите о цели вашей презентации и поделитесь любыми деталями. В настройках можно указать язык, выбрать тон и описать аудиторию.
          </p>
        </div>

        {/* Input Area */}
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
          />
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={PLACEHOLDER_VARIANTS[placeholderIndex]}
            className="w-[600px] h-[204px] pt-4 px-3 pb-3 text-base border rounded-2xl bg-white text-black resize-none focus:outline-none placeholder:text-gray-400 transition-all duration-300 ease-in-out"
            style={{
              borderColor: 'rgba(0, 0, 0, 0.08)',
            }}
            onFocus={(e) => {
              e.target.style.boxShadow = 'rgba(0, 0, 0, 0.08) 0px 16px 32px'
              e.target.style.transform = 'translateY(-2px)'
            }}
            onBlur={(e) => {
              e.target.style.boxShadow = 'none'
              e.target.style.transform = 'translateY(0)'
            }}
          />
          
          {/* Action buttons inside textarea */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <button
              type="button"
              onClick={handleFilesClick}
              className="flex h-9 items-center gap-1 px-3 py-1.5 text-sm cursor-pointer text-[rgb(110,109,109)] border border-[rgb(231,231,231)] rounded-xl bg-white hover:text-gray-900 hover:bg-[rgba(0,0,0,0.04)]"
            >
              <Image
                src="/icons/upload.svg"
                alt="Файлы"
                width={20}
                height={20}
                className="h-5 w-5"
              />
              <span>Файлы</span>
            </button>
            
            <div className="flex items-center gap-2">
              <Popover open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
                <PopoverTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className={`h-9 w-9 rounded-xl text-[rgb(110,109,109)] hover:bg-[rgba(0,0,0,0.04)] hover:text-[rgb(110,109,109)] ${
                      aiDialogOpen ? 'bg-[rgba(0,0,0,0.04)]' : ''
                    }`}
                    title="Настройки"
                    aria-label="Настройки"
                  >
                    <Image
                      src="/icons/setting.svg"
                      alt="Настройки"
                      width={24}
                      height={24}
                      className="h-6 w-6 rotate-90"
                    />
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-[440px] p-3 bg-white rounded-2xl"
                  style={{
                    boxShadow: 'rgba(0, 0, 0, 0.06) 0px 20px 32px',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                  }}
                  side="top"
                  align="end"
                  sideOffset={8}
                >
                  <AIGenerator />
                </PopoverContent>
              </Popover>
              <Button
                size="icon"
                className="h-9 w-9 rounded-xl bg-[rgb(52,137,243)] hover:bg-[rgb(42,120,214)] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleGenerate}
                disabled={!content.trim()}
                title="Создать презентацию"
              >
                <Play className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
