'use client'

import { useState } from 'react'
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
import { Plus, MoreVertical, Copy, Trash2, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Slide } from '@/lib/types'

const SLIDE_TYPES: Array<{ type: Slide['type']; label: string }> = [
  { type: 'title', label: 'Title' },
  { type: 'content', label: 'Content' },
  { type: 'image', label: 'Image' },
  { type: 'split', label: 'Split' },
]

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
  const [isHovered, setIsHovered] = useState(false)
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

  // Миниатюра слайда (160x90px) - минималистичный стиль
  const renderThumbnail = () => {
    return (
      <div className="w-[160px] h-[90px] bg-white rounded border border-gray-300 flex items-center justify-center text-xs overflow-hidden relative">
        {slide.imageUrl ? (
          <img
            src={slide.imageUrl}
            alt={slide.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full p-2 flex flex-col items-center justify-center">
            {/* Простые блоки-плейсхолдеры для текста */}
            <div className="w-full space-y-1">
              <div className="h-2 bg-gray-300 rounded w-3/4 mx-auto"></div>
              <div className="h-2 bg-gray-200 rounded w-2/3 mx-auto"></div>
              {slide.type === 'content' && (
                <>
                  <div className="h-1.5 bg-gray-200 rounded w-full mt-2"></div>
                  <div className="h-1.5 bg-gray-200 rounded w-5/6"></div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative mb-3 cursor-pointer group ${
        isDragging ? 'z-50' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onSelect}
    >
      {/* Активный слайд - фиолетовая рамка */}
      <div
        className={`w-[160px] mx-auto transition-all ${
          isActive
            ? 'ring-2 ring-purple-500 ring-offset-1 rounded'
            : ''
        }`}
      >
        {renderThumbnail()}
      </div>

      {/* Меню при hover */}
      {isHovered && (
        <div className="absolute top-0 right-0 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 bg-white shadow-sm hover:bg-gray-50"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation()
                onDuplicate()
              }}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation()
                onChangeType()
              }}>
                <Palette className="h-4 w-4 mr-2" />
                Change type
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 rounded p-1"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-1 h-1 bg-gray-400 rounded-full mb-0.5" />
        <div className="w-1 h-1 bg-gray-400 rounded-full mb-0.5" />
        <div className="w-1 h-1 bg-gray-400 rounded-full" />
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
    <div className="w-[200px] border-r border-gray-200 bg-white flex flex-col">
      <div className="flex-1 overflow-y-auto p-3">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={slides.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div>
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
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Круглая кнопка Add Slide внизу */}
      <div className="p-4 flex justify-center border-t border-gray-200">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="h-12 w-12 rounded-full bg-gray-100 hover:bg-gray-200 border-0 shadow-sm"
              size="icon"
            >
              <Plus className="h-5 w-5 text-gray-700" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {SLIDE_TYPES.map(({ type, label }) => (
              <DropdownMenuItem
                key={type}
                onClick={() => onAddSlide(type)}
              >
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
