/*
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useOutlineStore } from '@/store/outline-store'
import type { OutlineSlide } from '@/lib/types'
import {
  ArrowLeft,
  CheckSquare,
  GripVertical,
  Plus,
  Trash2,
  Wand2,
  Palette,
} from 'lucide-react'

function SortableOutlineItem({
  slide,
  isActive,
  onClick,
}: {
  slide: OutlineSlide
  isActive: boolean
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: slide.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
        isActive
          ? 'bg-white border-purple-500 shadow-sm'
          : 'bg-white hover:bg-gray-50 border-gray-200'
      }`}
      onClick={onClick}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="mt-1 text-gray-400 hover:text-gray-600"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">
          {slide.type.toUpperCase()}
        </div>
        <div className="font-medium text-sm truncate">{slide.title}</div>
        {slide.bulletPoints.length > 0 && (
          <ul className="mt-1 text-xs text-gray-500 space-y-0.5">
            {slide.bulletPoints.slice(0, 3).map((bp, idx) => (
              <li key={idx} className="truncate">
                • {bp}
              </li>
            ))}
            {slide.bulletPoints.length > 3 && (
              <li className="italic text-gray-400">+ ещё пункты…</li>
            )}
          </ul>
        )}
      </div>
      <div className="ml-2">
        <label className="flex items-center gap-1 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={slide.hasImage}
            readOnly
            className="h-3 w-3 rounded border-gray-300"
          />
          <span>Изображение</span>
        </label>
      </div>
    </div>
  )
}

export default function OutlinePage() {
  const router = useRouter()
  const sensors = useSensors(useSensor(PointerSensor))

  const {
    generatedTitle,
    slideCount,
    targetAudience,
    estimatedDuration,
    slides,
    aiSuggestions,
    toneSelector,
    selectedToneId,
    stylePreview,
    selectedThemeId,
    setTitle,
    setTargetAudience,
    setEstimatedDuration,
    updateSlide,
    addSlide,
    deleteSlide,
    reorderSlides,
    addBulletPoint,
    updateBulletPoint,
    deleteBulletPoint,
    toggleHasImage,
    setSelectedTone,
    setSelectedTheme,
  } = useOutlineStore()

  const [activeSlideId, setActiveSlideId] = useState<string | null>(
    slides[0]?.id ?? null
  )

  const activeSlide =
    slides.find((slide) => slide.id === activeSlideId) ?? slides[0]

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = slides.findIndex((s) => s.id === active.id)
    const newIndex = slides.findIndex((s) => s.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const newOrder = [...slides]
    const [moved] = newOrder.splice(oldIndex, 1)
    newOrder.splice(newIndex, 0, moved)
    reorderSlides(newOrder.map((s) => s.id))
  }

  const handleChangeType = (id: string) => {
    const slide = slides.find((s) => s.id === id)
    if (!slide) return
    const order: OutlineSlide['type'][] = [
      'title',
      'content',
      'bullets',
      'image',
      'quote',
      'stats',
    ]
    const currentIndex = order.indexOf(slide.type)
    const nextType = order[(currentIndex + 1) % order.length]
    updateSlide(id, { type: nextType })
  }

  return (
    <div className="h-screen flex flex-col bg-[#fafafa]">
      <header className="flex items-center justify-between px-6 py-3 border-b bg-white">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Структура презентации</h1>
            <p className="text-xs text-gray-500">
              Отредактируйте outline перед генерацией слайдов
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>{slideCount} слайдов</span>
          <span>{estimatedDuration}</span>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        <section className="w-[40%] border-r bg-gray-50 overflow-y-auto">
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">
                Заголовок презентации
              </label>
              <Input
                value={generatedTitle}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
              <div>
                <div className="font-medium">Целевая аудитория</div>
                <Textarea
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="mt-1 bg-white min-h-[60px] resize-none"
                />
              </div>
              <div>
                <div className="font-medium">Длительность</div>
                <Input
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(e.target.value)}
                  className="mt-1 bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 mb-2">
              <h2 className="text-sm font-semibold text-gray-800">
                Слайды (outline)
              </h2>
              <Button size="sm" variant="outline" onClick={addSlide}>
                <Plus className="h-4 w-4 mr-1" />
                Добавить слайд
              </Button>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={slides.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {slides.map((slide) => (
                    <SortableOutlineItem
                      key={slide.id}
                      slide={slide}
                      isActive={slide.id === activeSlide?.id}
                      onClick={() => setActiveSlideId(slide.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </section>

        <section className="w-[60%] flex flex-col overflow-y-auto bg-white">
          {activeSlide && (
            <div className="flex-1 p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-gray-500">
                    Редактирование слайда
                  </span>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <CheckSquare className="h-3 w-3" />
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={activeSlide.hasImage}
                        onChange={() => toggleHasImage(activeSlide.id)}
                        className="h-3 w-3 rounded border-gray-300"
                      />
                      <span>Добавить изображение</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={activeSlide.title}
                      onChange={(e) =>
                        updateSlide(activeSlide.id, { title: e.target.value })
                      }
                      className="text-base font-semibold bg-gray-50"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      title="Изменить тип слайда"
                      onClick={() => handleChangeType(activeSlide.id)}
                    >
                      <Palette className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      title="Удалить слайд"
                      onClick={() => {
                        deleteSlide(activeSlide.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-600">
                        Ключевые пункты
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs px-2 py-1"
                        onClick={() => addBulletPoint(activeSlide.id)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Добавить пункт
                      </Button>
                    </div>
                    <div className="space-y-1.5">
                      {activeSlide.bulletPoints.map((bp, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 mt-1">
                            •
                          </span>
                          <Input
                            value={bp}
                            onChange={(e) =>
                              updateBulletPoint(
                                activeSlide.id,
                                index,
                                e.target.value
                              )
                            }
                            className="bg-gray-50 text-sm"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              deleteBulletPoint(activeSlide.id, index)
                            }
                          >
                            <Trash2 className="h-3 w-3 text-gray-400" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {activeSlide.hasImage && (
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-gray-600">
                        Промпт для изображения
                      </span>
                      <Textarea
                        value={activeSlide.imagePrompt ?? ''}
                        onChange={(e) =>
                          updateSlide(activeSlide.id, {
                            imagePrompt: e.target.value,
                          })
                        }
                        placeholder="Опишите, какое изображение нужно для этого слайда"
                        className="bg-gray-50 min-h-[60px] resize-none"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <span className="text-xs font-medium text-gray-600">
                      Заметки докладчика
                    </span>
                    <Textarea
                      value={activeSlide.notes}
                      onChange={(e) =>
                        updateSlide(activeSlide.id, { notes: e.target.value })
                      }
                      placeholder="Основные тезисы, которые вы хотите проговорить на этом слайде"
                      className="bg-gray-50 min-h-[70px] resize-none"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-purple-600 hover:text-purple-700"
                      onClick={() =>
                        alert('Переписать с AI: интеграция будет добавлена позже')
                      }
                    >
                      <Wand2 className="h-4 w-4 mr-1" />
                      Переписать с AI
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-4 mt-4">
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Подсказки ИИ
                  </h3>
                  <ul className="space-y-2 text-xs text-gray-600">
                    {aiSuggestions.map((s, idx) => (
                      <li key={idx} className="bg-gray-50 rounded-md p-2">
                        {s}
                      </li>
                    ))}
                  </ul>

                  <div className="space-y-2 mt-4">
                    <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      Тон
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {toneSelector.map((tone) => (
                        <Button
                          key={tone.id}
                          size="sm"
                          variant={
                            tone.id === selectedToneId ? 'default' : 'outline'
                          }
                          className="text-xs"
                          onClick={() => setSelectedTone(tone.id)}
                        >
                          {tone.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Темы оформления
                  </h3>
                  <div className="grid gap-3">
                    {stylePreview.map((theme) => (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setSelectedTheme(theme.id)}
                        className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                          theme.id === selectedThemeId
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div
                          className="h-8 w-8 rounded-md"
                          style={{ backgroundColor: theme.previewColor }}
                        />
                        <div className="flex-1">
                          <div className="text-xs font-semibold">
                            {theme.name}
                          </div>
                          <div className="text-[11px] text-gray-500">
                            {theme.description}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="border-t bg-white px-6 py-3 flex items-center justify-between">
            <Button variant="ghost" onClick={() => router.push('/')}>
              ← Изменить промпт
            </Button>
            <Button className="px-6 py-2 bg-[rgb(52,137,243)] hover:bg-[rgb(42,120,214)] text-white rounded-xl">
              Создать презентацию
            </Button>
          </div>
        </section>
      </main>
    </div>
  )
}
*/

// Страница outline временно закомментирована
export default function OutlinePage() {
  return null
}
