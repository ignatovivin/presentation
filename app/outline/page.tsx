'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePresentationStore } from '@/store/presentation-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowLeft, Check, Edit3, FileText, GripVertical, Loader2, Play, Plus } from 'lucide-react'

const SLIDES_COUNT_OPTIONS = [3, 5, 7, 10]

const TEMPLATES = [
  { id: 'minimal', name: 'Минимализм', description: 'Чистый дизайн для бизнеса', colors: ['#FFFFFF', '#000000', '#3B82F6'] },
  { id: 'dark', name: 'Тёмная тема', description: 'Современный tech-стиль', colors: ['#0F172A', '#1E293B', '#06B6D4'] },
  { id: 'colorful', name: 'Яркий', description: 'Креативный с акцентами', colors: ['#FFFFFF', '#EC4899', '#F59E0B'] },
  { id: 'corporate', name: 'Корпоративный', description: 'Классический стиль', colors: ['#FFFFFF', '#1F2937', '#10B981'] },
  { id: 'gradient', name: 'Градиенты', description: 'Плавные переходы', colors: ['#6366F1', '#8B5CF6', '#EC4899'] },
  { id: 'mono', name: 'Монохром', description: 'Элегантный ч/б', colors: ['#FFFFFF', '#6B7280', '#111827'] },
]

const DEFAULT_AI = { imageType: 'realistic', tone: 'professional', language: 'russian', audience: '' }

function getStored(key: string, fallback: string) {
  if (typeof window === 'undefined') return fallback
  return localStorage.getItem(key) || fallback
}

function getStoredAiSettings() {
  try {
    const saved = getStored('ai-settings', '{}')
    const p = JSON.parse(saved)
    return { ...DEFAULT_AI, ...p }
  } catch {}
  return DEFAULT_AI
}

export interface OutlineCard {
  id: string
  title: string
  content: string
}

function CardItem({
  card,
  onTitleChange,
  onContentChange,
}: {
  card: OutlineCard
  onTitleChange: (v: string) => void
  onContentChange: (v: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex gap-3 p-4 rounded-xl bg-white border border-gray-200 hover:border-gray-300 transition-colors"
    >
      <button type="button" className="touch-none cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 shrink-0 mt-1" {...attributes} {...listeners}>
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="flex-1 min-w-0 space-y-2">
        <Input
          value={card.title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Заголовок слайда"
          className="font-medium border-gray-200 rounded-lg"
        />
        <Textarea
          value={card.content}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder="Текст или тезисы"
          className="min-h-[80px] resize-none border-gray-200 rounded-lg text-sm"
        />
      </div>
    </div>
  )
}

export default function OutlinePage() {
  const router = useRouter()
  const currentPresentation = usePresentationStore((s) => s.currentPresentation)
  const [showResult, setShowResult] = useState(false)

  const [topic, setTopic] = useState('')
  const [slidesCount, setSlidesCount] = useState(5)
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [aiSettings, setAiSettings] = useState(DEFAULT_AI)
  const [cards, setCards] = useState<OutlineCard[]>([])
  const [loadingOutline, setLoadingOutline] = useState(false)

  useEffect(() => {
    setTopic(getStored('prompt', ''))
    const n = parseInt(getStored('slides-count', '5'), 10)
    setSlidesCount(Number.isFinite(n) && n >= 1 && n <= 50 ? n : 5)
    setAiSettings(getStoredAiSettings())
    const t = getStored('presentation-template', '')
    if (t && TEMPLATES.some((x) => x.id === t)) setSelectedTemplate(t)
    try {
      const raw = getStored('outline-cards', '[]')
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        setCards(parsed.map((c: any) => ({ id: c.id || `c-${Math.random()}`, title: c.title || '', content: c.content || '' })))
      }
    } catch {}
  }, [])

  useEffect(() => {
    const flag = typeof window !== 'undefined' && localStorage.getItem('outline-show-result') === 'true'
    if (flag && currentPresentation && currentPresentation.slides.length > 0) {
      setShowResult(true)
      if (typeof window !== 'undefined') localStorage.removeItem('outline-show-result')
    }
  }, [currentPresentation])

  useEffect(() => {
    if (typeof window !== 'undefined' && cards.length > 0) localStorage.setItem('outline-cards', JSON.stringify(cards))
  }, [cards])

  const handleGenerateOutline = async () => {
    if (!topic.trim()) {
      alert('Введите тему презентации')
      return
    }
    setLoadingOutline(true)
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          slidesCount,
          style: aiSettings.tone,
          language: aiSettings.language,
          audience: aiSettings.audience || undefined,
          outlineOnly: true,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Ошибка генерации структуры')
      }
      const data = await res.json()
      const slides = data.slides || []
      setCards(
        slides.map((s: any, i: number) => ({
          id: `card-${Date.now()}-${i}`,
          title: s.title || `Слайд ${i + 1}`,
          content: (s.content || '').replace(/<[^>]+>/g, ' ').trim(),
        }))
      )
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Не удалось сгенерировать структуру')
    } finally {
      setLoadingOutline(false)
    }
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setCards((prev) => {
        const i = prev.findIndex((c) => c.id === active.id)
        const j = prev.findIndex((c) => c.id === over.id)
        if (i === -1 || j === -1) return prev
        return arrayMove(prev, i, j)
      })
    }
  }

  const updateCard = (id: string, patch: Partial<OutlineCard>) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  const addCard = () => {
    setCards((prev) => [...prev, { id: `card-${Date.now()}`, title: '', content: '' }])
  }

  const handleGenerate = () => {
    if (!topic.trim()) {
      alert('Введите тему презентации')
      return
    }
    if (!selectedTemplate) {
      alert('Выберите шаблон')
      return
    }
    if (cards.length === 0) {
      alert('Добавьте или сгенерируйте хотя бы одну карточку')
      return
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('prompt', topic.trim())
      localStorage.setItem('slides-count', String(slidesCount))
      localStorage.setItem('ai-settings', JSON.stringify(aiSettings))
      localStorage.setItem('presentation-template', selectedTemplate)
      localStorage.setItem('outline-cards', JSON.stringify(cards))
      localStorage.setItem('should-generate', 'true')
    }
    router.push('/generating')
  }

  if (showResult && currentPresentation && currentPresentation.slides.length > 0) {
    const slides = [...currentPresentation.slides].sort((a, b) => a.order - b.order)
    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col">
        <header className="border-b border-gray-200 bg-white px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" className="gap-2 text-gray-600" onClick={() => router.push('/')}>
            <ArrowLeft className="h-4 w-4" />
            На главную
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-2" onClick={() => router.push('/present')}>
              <Play className="h-4 w-4" />
              Презентация
            </Button>
            <Button className="gap-2 bg-[rgb(52,137,243)] hover:bg-[rgb(42,120,214)] text-white" onClick={() => router.push('/editor')}>
              <Edit3 className="h-4 w-4" />
              Редактировать
            </Button>
          </div>
        </header>
        <main className="flex-1 max-w-3xl mx-auto w-full p-6 md:p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{currentPresentation.title || 'Презентация без названия'}</h1>
            <p className="text-sm text-gray-500">
              {slides.length} {slides.length === 1 ? 'слайд' : slides.length < 5 ? 'слайда' : 'слайдов'}
            </p>
          </div>
          <ul className="space-y-3">
            {slides.map((slide, index) => (
              <li key={slide.id} className="flex gap-4 p-4 rounded-xl bg-white border border-gray-200 hover:border-gray-300 transition-colors">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 font-semibold text-sm">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-gray-900 font-medium">
                    <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                    {slide.title || 'Без заголовка'}
                  </div>
                  {slide.content && (
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                      {slide.content.replace(/<[^>]+>/g, ' ').trim() || '—'}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex justify-center">
            <Button className="gap-2 bg-[rgb(52,137,243)] hover:bg-[rgb(42,120,214)] text-white px-8" onClick={() => router.push('/editor')}>
              <Edit3 className="h-4 w-4" />
              Перейти к редактированию
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col">
      <header className="border-b border-gray-200 bg-white px-4 py-3">
        <Button variant="ghost" size="sm" className="gap-2 text-gray-600" onClick={() => router.push('/')}>
          <ArrowLeft className="h-4 w-4" />
          На главную
        </Button>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full p-6 md:p-8 pb-32">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Структура презентации</h1>
        <p className="text-gray-500 text-sm mb-6">Тема и настройки можно изменить и перегенерировать структуру. Карточки можно редактировать, перетаскивать и добавлять.</p>

        <section className="mb-8">
          <label className="text-sm font-medium text-gray-900 mb-1 block">Тема (для перегенерации контента)</label>
          <Textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="О чём презентация?"
            className="min-h-[100px] resize-none rounded-xl border-gray-200 bg-white mb-3"
          />
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <span className="text-sm text-gray-500 mr-2">Количество карточек:</span>
              <Select value={String(slidesCount)} onValueChange={(v) => setSlidesCount(parseInt(v, 10))}>
                <SelectTrigger className="w-[100px] inline-flex rounded-xl border-gray-200 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SLIDES_COUNT_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleGenerateOutline}
              disabled={loadingOutline || !topic.trim()}
              className="rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-900"
            >
              {loadingOutline ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loadingOutline ? ' Генерация...' : 'Сгенерировать структуру'}
            </Button>
          </div>
        </section>

        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Структура</h2>
            <span className="text-sm text-gray-500">{cards.length} карточек</span>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {cards.map((card) => (
                  <CardItem
                    key={card.id}
                    card={card}
                    onTitleChange={(v) => updateCard(card.id, { title: v })}
                    onContentChange={(v) => updateCard(card.id, { content: v })}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <Button type="button" variant="outline" className="mt-4 w-full rounded-xl border-dashed border-gray-300 text-gray-600 hover:bg-gray-50" onClick={addCard}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить карточку
          </Button>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Визуальный шаблон</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTemplate(t.id)}
                className={`relative p-4 rounded-xl border-2 text-left transition-all hover:scale-[1.02] ${
                  selectedTemplate === t.id ? 'border-[rgb(52,137,243)] bg-blue-50 shadow-md' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex gap-0.5 mb-3 rounded-lg overflow-hidden">
                  {t.colors.map((c, i) => (
                    <div key={i} className="flex-1 h-8" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <div className="font-medium text-gray-900">{t.name}</div>
                <p className="text-sm text-gray-500">{t.description}</p>
                {selectedTemplate === t.id && (
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[rgb(52,137,243)] flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Настройки</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Тон</label>
              <Select value={aiSettings.tone} onValueChange={(v) => setAiSettings((s) => ({ ...s, tone: v }))}>
                <SelectTrigger className="rounded-xl border-gray-200 bg-white">
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
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Язык</label>
              <Select value={aiSettings.language} onValueChange={(v) => setAiSettings((s) => ({ ...s, language: v }))}>
                <SelectTrigger className="rounded-xl border-gray-200 bg-white">
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
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Аудитория</label>
            <Input
              value={aiSettings.audience}
              onChange={(e) => setAiSettings((s) => ({ ...s, audience: e.target.value }))}
              placeholder="Необязательно"
              className="rounded-xl border-gray-200 bg-white"
            />
          </div>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 flex justify-center">
        <Button
          onClick={handleGenerate}
          disabled={!topic.trim() || !selectedTemplate || cards.length === 0}
          className="px-10 py-4 rounded-full font-semibold text-lg bg-[rgb(52,137,243)] hover:bg-[rgb(42,120,214)] text-white disabled:opacity-50"
        >
          Генерировать презентацию
        </Button>
      </div>
    </div>
  )
}
