'use client'

import { useEffect, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import type { Slide } from '@/lib/types'
import { Input } from '@/components/ui/input'
// Генерация изображений (Replicate) временно отключена — Button, ImageIcon, X, ImageGenerator
// import { Image as ImageIcon, X } from 'lucide-react'
// import { ImageGenerator } from './image-generator'

interface SlideEditorProps {
  slide: Slide
  onUpdate: (updates: Partial<Slide>) => void
  onDelete: () => void
}

export function SlideEditor({ slide, onUpdate, onDelete }: SlideEditorProps) {
  // Генерация изображений отключена — не показываем ImageGenerator и кнопку
  // const [manualImagePrompt, setManualImagePrompt] = useState<string | null>(null)
  // const [showAddImageInput, setShowAddImageInput] = useState(false)
  // const [addImageInputValue, setAddImageInputValue] = useState('')
  // const descriptionToGenerate = slide.imagePrompt || manualImagePrompt

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Начните вводить контент...',
      }),
    ],
    content: slide.content || '',
    onUpdate: ({ editor }) => {
      onUpdate({ content: editor.getHTML() })
    },
      editorProps: {
        attributes: {
          class: 'prose prose-xl max-w-none focus:outline-none min-h-[200px] text-center text-gray-700',
        },
      },
  })

  useEffect(() => {
    if (editor && slide.content !== editor.getHTML()) {
      editor.commands.setContent(slide.content || '')
    }
  }, [slide.id, editor])

  return (
    <div className="w-full max-w-4xl bg-white" style={{ aspectRatio: '16/9' }}>
      <div className="h-full p-12 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center">
          <Input
            value={slide.title || ''}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Заголовок слайда"
            className="text-5xl font-bold border-none focus-visible:ring-0 p-0 h-auto bg-transparent text-center text-black placeholder:text-gray-300"
          />
          
          <div className="flex-1 w-full mt-8">
            {/* Генерация изображений (Replicate) временно отключена
            {descriptionToGenerate && (
              <ImageGenerator ... />
            )} */}

            {slide.imageUrl && slide.imageUrl.startsWith('http') && (
              <div className="relative mb-6">
                <img
                  src={slide.imageUrl}
                  alt={slide.title || 'Slide image'}
                  className="w-full max-h-96 object-contain rounded-lg"
                />
              </div>
            )}

            {/* Кнопка «Сгенерировать изображение» отключена
            {!descriptionToGenerate && !slide.imageUrl && (
              <div className="mb-4">... Сгенерировать изображение ...</div>
            )} */}

            <div className="min-h-[200px]">
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
