'use client'

import { useState, useEffect } from 'react'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface AIGeneratorProps {
  // Событие изменения настроек (используется на главной странице)
  onSettingsChange?: (settings: {
    imageType: string
    tone: string
    language: string
    audience: string
  }) => void
  // Дополнительные пропсы для совместимости с использованием в EditorPage
  // (управление открытием/закрытием, сейчас внутри компонента не используются)
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AIGenerator({ onSettingsChange }: AIGeneratorProps) {
  // Load settings from localStorage on mount
  const [imageType, setImageType] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ai-settings')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          return parsed.imageType || 'realistic'
        } catch {}
      }
    }
    return 'realistic'
  })
  
  const [tone, setTone] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ai-settings')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          return parsed.tone || 'professional'
        } catch {}
      }
    }
    return 'professional'
  })
  
  const [language, setLanguage] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ai-settings')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          return parsed.language || 'russian'
        } catch {}
      }
    }
    return 'russian'
  })
  
  const [audience, setAudience] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ai-settings')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          return parsed.audience || ''
        } catch {}
      }
    }
    return ''
  })

  // Save settings to localStorage whenever they change
  useEffect(() => {
    const settings = {
      imageType,
      tone,
      language,
      audience,
    }
    localStorage.setItem('ai-settings', JSON.stringify(settings))
    onSettingsChange?.(settings)
  }, [imageType, tone, language, audience, onSettingsChange])

  return (
    <>
        <div className="space-y-3">
          {/* Первая строка: Image type и Tone рядом */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-black mb-1 block">
                Тип изображения
              </label>
              <Select value={imageType} onValueChange={setImageType}>
                <SelectTrigger 
                  className="w-full focus:!border-[rgb(52,137,243)] focus:ring-0 focus:ring-offset-0 focus-visible:!border-[rgb(52,137,243)] focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:!border-[rgb(52,137,243)]"
                  style={{
                    borderColor: 'rgba(0, 0, 0, 0)',
                    backgroundColor: 'rgb(243, 243, 243)',
                    borderRadius: '8px',
                    borderWidth: '1px',
                  }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realistic">Реалистичный</SelectItem>
                  <SelectItem value="illustration">Иллюстрация</SelectItem>
                  <SelectItem value="abstract">Абстрактный</SelectItem>
                  <SelectItem value="none">Без изображений</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-black mb-1 block">
                Тон
              </label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger 
                  className="w-full focus:!border-[rgb(52,137,243)] focus:ring-0 focus:ring-offset-0 focus-visible:!border-[rgb(52,137,243)] focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:!border-[rgb(52,137,243)]"
                  style={{
                    borderColor: 'rgba(0, 0, 0, 0)',
                    backgroundColor: 'rgb(243, 243, 243)',
                    borderRadius: '8px',
                    borderWidth: '1px',
                  }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Профессиональный</SelectItem>
                  <SelectItem value="casual">Неформальный</SelectItem>
                  <SelectItem value="creative">Креативный</SelectItem>
                  <SelectItem value="academic">Академический</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Вторая строка: Language на всю ширину */}
          <div>
            <label className="text-sm font-medium text-black mb-1 block">
              Язык
            </label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger 
                className="w-full focus:!border-[rgb(52,137,243)] focus:ring-0 focus:ring-offset-0 focus-visible:!border-[rgb(52,137,243)] focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:!border-[rgb(52,137,243)]"
                style={{
                  borderColor: 'rgba(0, 0, 0, 0)',
                    backgroundColor: 'rgb(243, 243, 243)',
                    borderRadius: '8px',
                    borderWidth: '1px',
                  }}
                >
                  <SelectValue />
                </SelectTrigger>
              <SelectContent>
                <SelectItem value="russian">Русский</SelectItem>
                <SelectItem value="english">Английский</SelectItem>
                <SelectItem value="spanish">Испанский</SelectItem>
                <SelectItem value="german">Немецкий</SelectItem>
                <SelectItem value="french">Французский</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Третья строка: Audience на всю ширину */}
          <div>
            <label className="text-sm font-medium text-black mb-1 block">
              Аудитория
            </label>
            <Textarea
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="Опишите вашу аудиторию, чтобы ИИ мог настроить контент."
              className="w-full min-h-[80px] resize-none placeholder:text-gray-400 focus:!border-[rgb(52,137,243)] focus:ring-0 focus:ring-offset-0 focus-visible:!border-[rgb(52,137,243)] focus-visible:ring-0 focus-visible:ring-offset-0"
              style={{
                borderColor: 'rgba(0, 0, 0, 0)',
                backgroundColor: 'rgb(243, 243, 243)',
                borderRadius: '8px',
                borderWidth: '1px',
              }}
              onFocus={(e) => {
                e.target.style.backgroundColor = '#ffffff'
              }}
              onBlur={(e) => {
                e.target.style.backgroundColor = 'rgb(243, 243, 243)'
              }}
            />
          </div>
        </div>
    </>
  )
}
