'use client'

import { useState, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, Copy, Trash2, Palette } from 'lucide-react'
import type { Slide } from '@/lib/types'

interface SlideListProps {
  slides: Slide[]
  currentSlideId: string | null
  onSelectSlide: (slideId: string) => void
  onReorderSlides: (slideIds: string[]) => void
  onAddSlide: (type?: Slide['type']) => void
  onDuplicateSlide: (slideId: string) => void
  onDeleteSlide: (slideId: string) => void
  onChangeSlideType: (slideId: string) => void
}

function SortableSlideItem({
  slide,
  isActive,
  onSelect,
  onDuplicate,
  onDelete,
  onChangeType,
}: {
  slide: Slide
  isActive: boolean
  onSelect: () => void
  onDuplicate: () => void
  onDelete: () => void
  onChangeType: () => void
}) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    document.addEventListener('click', close)
    document.addEventListener('contextmenu', close)
    document.addEventListener('keydown', (e) => e.key === 'Escape' && close())
    return () => {
      document.removeEventListener('click', close)
      document.removeEventListener('contextmenu', close)
      document.removeEventListener('keydown', close)
    }
  }, [contextMenu])

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const stripHtml = (html: string) => (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40)

  const renderThumbnail = () => (
    <div className="w-[78px] h-[56px] bg-white rounded-xl border overflow-hidden flex-shrink-0 transition-all duration-200 hover:scale-[1.02]"
      style={{ borderColor: 'rgba(0, 0, 0, 0.08)' }}
    >
      {slide.imageUrl ? (
        <img src={slide.imageUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full p-1 flex flex-col justify-center overflow-hidden">
          {slide.title && (
            <div className="text-[8px] font-semibold text-gray-900 truncate leading-tight">
              {slide.title}
            </div>
          )}
          {slide.content && (
            <div className="text-[6px] text-gray-500 truncate leading-tight mt-0.5">
              {stripHtml(slide.content)}
            </div>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative mb-2 cursor-pointer group ${isDragging ? 'z-50' : ''}`}
      onClick={onSelect}
      onContextMenu={(e) => {
        e.preventDefault()
        setContextMenu({ x: e.clientX, y: e.clientY })
      }}
    >
      <div
        className={`w-[78px] mx-auto rounded-xl transition-all ${
          isActive ? 'ring-2 ring-[rgb(52,137,243)] ring-offset-1' : ''
        }`}
      >
        {renderThumbnail()}
      </div>

      {contextMenu && (
        <div
          className="fixed z-[100] min-w-[160px] py-1 bg-white rounded-xl border shadow-lg"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            borderColor: 'rgba(0, 0, 0, 0.08)',
            boxShadow: 'rgba(0, 0, 0, 0.06) 0px 10px 24px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-[rgba(0,0,0,0.04)] rounded-lg"
            onClick={() => {
              setContextMenu(null)
              onDuplicate()
            }}
          >
            <Copy className="h-4 w-4" />
            Дублировать
          </button>
          <button
            type="button"
            className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-[rgba(0,0,0,0.04)] rounded-lg"
            onClick={() => {
              setContextMenu(null)
              onChangeType()
            }}
          >
            <Palette className="h-4 w-4" />
            Сменить тип
          </button>
          <button
            type="button"
            className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-red-50 text-red-600 rounded-lg"
            onClick={() => {
              setContextMenu(null)
              onDelete()
            }}
          >
            <Trash2 className="h-4 w-4" />
            Удалить
          </button>
        </div>
      )}

      <div
        {...attributes}
        {...listeners}
        className="absolute top-0.5 left-0.5 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-lg p-0.5 border border-[rgb(231,231,231)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-0.5 h-0.5 bg-gray-400 rounded-full mb-0.5" />
        <div className="w-0.5 h-0.5 bg-gray-400 rounded-full mb-0.5" />
        <div className="w-0.5 h-0.5 bg-gray-400 rounded-full" />
      </div>
    </div>
  )
}

export function SlideList({
  slides,
  currentSlideId,
  onSelectSlide,
  onReorderSlides,
  onAddSlide,
  onDuplicateSlide,
  onDeleteSlide,
  onChangeSlideType,
}: SlideListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = slides.findIndex((s) => s.id === active.id)
      const newIndex = slides.findIndex((s) => s.id === over.id)
      const reorderedSlides = arrayMove(slides, oldIndex, newIndex)
      onReorderSlides(reorderedSlides.map((s) => s.id))
    }
  }

  return (
    <div className="w-[110px] flex flex-col bg-[rgb(255,255,255)]">
      <div className="flex-1 overflow-y-auto p-2 flex flex-col items-center justify-center min-h-0">
        <div className="flex flex-col items-center">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={slides.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
            <div className="flex flex-col items-center">
              {slides.map((slide) => (
                <SortableSlideItem
                  key={slide.id}
                  slide={slide}
                  isActive={slide.id === currentSlideId}
                  onSelect={() => onSelectSlide(slide.id)}
                  onDuplicate={() => onDuplicateSlide(slide.id)}
                  onDelete={() => onDeleteSlide(slide.id)}
                  onChangeType={() => onChangeSlideType(slide.id)}
                />
              ))}
              {/* Кнопка добавления — как карточка, без превью */}
              <button
                type="button"
                onClick={() => onAddSlide('content')}
                className="w-[78px] h-[56px] rounded-xl border flex items-center justify-center flex-shrink-0 mt-2 cursor-pointer bg-white text-[rgb(110,109,109)] transition-all duration-200 hover:scale-[1.02] hover:bg-[rgba(0,0,0,0.04)] hover:text-gray-900"
                style={{ borderColor: 'rgba(0, 0, 0, 0.08)' }}
                title="Добавить слайд"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </SortableContext>
        </DndContext>
        </div>
      </div>
    </div>
  )
}
