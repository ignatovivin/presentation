'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
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
import { motion } from 'framer-motion'
import { ArrowDown, ArrowLeft, ArrowUp, Check, GripVertical, Loader2, Plus, Sparkles, Trash2 } from 'lucide-react'
import { TEMPLATES } from '@/lib/templates'

const SLIDES_COUNT_OPTIONS = [3, 5, 7, 10]

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
  onContextMenu: onContextMenuProp,
}: {
  card: OutlineCard
  onTitleChange: (v: string) => void
  onContentChange: (v: string) => void
  onContextMenu?: (e: React.MouseEvent) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id })
  const dragStyle = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      className="mb-2"
      onContextMenu={onContextMenuProp}
    >
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        className="outline-card-focus flex gap-3 p-2 rounded-xl bg-white border border-[rgba(0,0,0,0.08)] transition-all duration-300 ease-in-out focus-within:border-gray-300 opacity-100"
      >
        <button type="button" className="touch-none cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 shrink-0 mt-1" {...attributes} {...listeners}>
          <GripVertical className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0 space-y-2">
          <Input
            value={card.title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Заголовок слайда"
            className="font-medium border-gray-200 rounded-lg focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <Textarea
            value={card.content}
            onChange={(e) => onContentChange(e.target.value)}
            placeholder="Текст или тезисы"
            className="min-h-[80px] resize-none border-gray-200 rounded-lg text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      </motion.div>
    </div>
  )
}

export default function OutlinePage() {
  const router = useRouter()
  const [topic, setTopic] = useState('')
  const [slidesCount, setSlidesCount] = useState(5)
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [aiSettings, setAiSettings] = useState(DEFAULT_AI)
  const [cards, setCards] = useState<OutlineCard[]>([])
  const [loadingOutline, setLoadingOutline] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ cardId: string; x: number; y: number } | null>(null)
  const [loadingCardId, setLoadingCardId] = useState<string | null>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!contextMenu) return
    const close = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [contextMenu])

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
        const msg = data?.error || res.statusText || 'Ошибка генерации структуры'
        throw new Error(msg)
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

  const deleteCard = (id: string) => {
    setContextMenu(null)
    setCards((prev) => prev.filter((c) => c.id !== id))
  }

  const moveCardUp = (id: string) => {
    setContextMenu(null)
    setCards((prev) => {
      const i = prev.findIndex((c) => c.id === id)
      if (i <= 0) return prev
      return arrayMove(prev, i, i - 1)
    })
  }

  const moveCardDown = (id: string) => {
    setContextMenu(null)
    setCards((prev) => {
      const i = prev.findIndex((c) => c.id === id)
      if (i === -1 || i >= prev.length - 1) return prev
      return arrayMove(prev, i, i + 1)
    })
  }

  const regenerateCardContent = async (id: string) => {
    const card = cards.find((c) => c.id === id)
    if (!card) return
    setContextMenu(null)
    setLoadingCardId(id)
    const topicForRequest =
      topic.trim() || `${card.title || 'Слайд'}. ${(card.content || '').slice(0, 200)}`.trim() || 'Один слайд'
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicForRequest,
          slidesCount: 1,
          style: aiSettings.tone,
          language: aiSettings.language,
          audience: aiSettings.audience || undefined,
          outlineOnly: true,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || res.statusText || 'Ошибка генерации')
      }
      const slides = Array.isArray(data?.slides) ? data.slides : []
      const first = slides[0]
      if (first && (first.title != null || first.content != null)) {
        updateCard(id, {
          title: first.title ?? card.title,
          content: (first.content ?? card.content)
            .toString()
            .replace(/<[^>]+>/g, ' ')
            .trim() || card.content,
        })
      } else {
        alert('API вернул пустой ответ. Попробуйте ещё раз или укажите тему выше.')
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Не удалось сгенерировать текст')
    } finally {
      setLoadingCardId(null)
    }
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

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col">
      <style dangerouslySetInnerHTML={{ __html: `
        .outline-card-focus:focus-within {
          box-shadow: rgba(0, 0, 0, 0.08) 0px 16px 32px;
          transform: translateY(-2px);
        }
        .outline-textarea-focus:focus-within {
          box-shadow: rgba(0, 0, 0, 0.08) 0px 16px 32px;
          transform: translateY(-2px);
        }
      ` }} />
      <header className="w-full bg-[#fafafa] px-4 py-3">
        <Button variant="ghost" size="sm" className="gap-2 text-gray-600" onClick={() => router.push('/')}>
          <ArrowLeft className="h-4 w-4" />
          На главную
        </Button>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full p-6 md:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Структура презентации</h1>

        <section
          className="mb-6 rounded-2xl p-4 transition-shadow"
          style={{ backgroundColor: '#f5f5f5', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium text-black mb-1 block">Тон</label>
              <Select value={aiSettings.tone} onValueChange={(v) => setAiSettings((s) => ({ ...s, tone: v }))}>
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
            <div>
              <label className="text-sm font-medium text-black mb-1 block">Язык</label>
              <Select value={aiSettings.language} onValueChange={(v) => setAiSettings((s) => ({ ...s, language: v }))}>
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
            <div>
              <label className="text-sm font-medium text-black mb-1 block">Аудитория</label>
              <Input
                value={aiSettings.audience}
                onChange={(e) => setAiSettings((s) => ({ ...s, audience: e.target.value }))}
                placeholder="Необязательно"
                className="w-full focus-visible:!border-[rgb(52,137,243)] focus-visible:ring-0 focus-visible:ring-offset-0"
                style={{
                  borderColor: 'rgba(0, 0, 0, 0)',
                  backgroundColor: 'rgb(243, 243, 243)',
                  borderRadius: '8px',
                  borderWidth: '1px',
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-black mb-1 block">Карточки</label>
              <Select value={String(slidesCount)} onValueChange={(v) => setSlidesCount(parseInt(v, 10))}>
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
                  {SLIDES_COUNT_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="О чём презентация? Например: Введение в мир Наруто"
              className="w-full min-h-[100px] resize-none rounded-xl border border-transparent text-black placeholder:text-gray-500 focus-visible:!border-[rgb(52,137,243)] focus-visible:ring-0 focus-visible:ring-offset-0"
              style={{
                borderColor: 'rgba(0, 0, 0, 0)',
                backgroundColor: 'rgb(243, 243, 243)',
                borderRadius: '8px',
                borderWidth: '1px',
              }}
            />
          </div>
          <div className="mt-4">
            <Button
              onClick={handleGenerateOutline}
              disabled={loadingOutline || !topic.trim()}
              className="rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-900"
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
              <div className="space-y-2">
                {cards.map((card) => (
                  <CardItem
                    key={card.id}
                    card={card}
                    onTitleChange={(v) => updateCard(card.id, { title: v })}
                    onContentChange={(v) => updateCard(card.id, { content: v })}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      setContextMenu({ cardId: card.id, x: e.clientX, y: e.clientY })
                    }}
                  />
                ))}
              </div>
              {contextMenu && (
                <div
                  ref={contextMenuRef}
                  className="fixed z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
                  style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                  <button
                    type="button"
                    className="relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                    onClick={() => deleteCard(contextMenu.cardId)}
                  >
                    <Trash2 className="h-4 w-4 shrink-0 text-red-500" />
                    Удалить карточку
                  </button>
                  <button
                    type="button"
                    className="relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                    onClick={() => moveCardUp(contextMenu.cardId)}
                  >
                    <ArrowUp className="h-4 w-4 shrink-0" />
                    Поднять выше
                  </button>
                  <button
                    type="button"
                    className="relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                    onClick={() => moveCardDown(contextMenu.cardId)}
                  >
                    <ArrowDown className="h-4 w-4 shrink-0" />
                    Опустить ниже
                  </button>
                  <button
                    type="button"
                    className="relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                    onClick={() => regenerateCardContent(contextMenu.cardId)}
                    disabled={loadingCardId === contextMenu.cardId}
                  >
                    {loadingCardId === contextMenu.cardId ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
                    )}
                    {loadingCardId === contextMenu.cardId ? 'Генерация...' : 'Сгенерировать новый текст'}
                  </button>
                </div>
              )}
            </SortableContext>
          </DndContext>
          <Button type="button" variant="outline" className="mt-2 w-full rounded-xl border-dashed border-gray-300 text-gray-600 hover:bg-gray-50" onClick={addCard}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить карточку
          </Button>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Визуальный шаблон</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {TEMPLATES.slice(0, 3).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTemplate(t.id)}
                className={`relative p-4 rounded-xl border text-left transition-all duration-300 ease-in-out hover:border-gray-300 ${
                  selectedTemplate === t.id
                    ? 'border-[rgb(52,137,243)] bg-blue-50'
                    : 'border-[rgba(0,0,0,0.08)] bg-white'
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

        <div className="pt-4 pb-6 flex justify-center">
          <Button
            onClick={handleGenerate}
            disabled={!topic.trim() || !selectedTemplate || cards.length === 0}
            className="px-10 py-4 rounded-full font-semibold text-lg bg-[rgb(52,137,243)] hover:bg-[rgb(42,120,214)] text-white disabled:opacity-50"
          >
            Генерировать презентацию
          </Button>
        </div>
      </main>
    </div>
  )
}
