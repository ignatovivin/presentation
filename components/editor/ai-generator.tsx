'use client'

import { useState, useEffect, useCallback } from 'react'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const DEFAULT_SETTINGS = {
  imageType: 'realistic',
  tone: 'professional',
  language: 'russian',
  audience: '',
}

function getInitialSettings() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const saved = localStorage.getItem('ai-settings')
    if (saved) {
      const parsed = JSON.parse(saved)
      return {
        imageType: parsed.imageType ?? DEFAULT_SETTINGS.imageType,
        tone: parsed.tone ?? DEFAULT_SETTINGS.tone,
        language: parsed.language ?? DEFAULT_SETTINGS.language,
        audience: parsed.audience ?? DEFAULT_SETTINGS.audience,
      }
    }
  } catch {}
  return DEFAULT_SETTINGS
}

interface AIGeneratorProps {
  onSettingsChange?: (settings: {
    imageType: string
    tone: string
    language: string
    audience: string
  }) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AIGenerator({ onSettingsChange }: AIGeneratorProps) {
  const [settings, setSettings] = useState(getInitialSettings)

  useEffect(() => {
    localStorage.setItem('ai-settings', JSON.stringify(settings))
    onSettingsChange?.(settings)
  }, [settings, onSettingsChange])

  const update = useCallback(<K extends keyof typeof settings>(key: K, value: typeof settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }, [])

  return (
    <>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-black mb-1 block">
                Тип изображения
              </label>
              <Select value={settings.imageType} onValueChange={(v) => update('imageType', v)}>
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
              <Select value={settings.tone} onValueChange={(v) => update('tone', v)}>
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
            <Select value={settings.language} onValueChange={(v) => update('language', v)}>
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
              value={settings.audience}
              onChange={(e) => update('audience', e.target.value)}
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
