'use client'

import { useEffect, useState, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import type { Slide, ContentAlign, VerticalAlign } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { AlignmentToolbar } from './alignment-toolbar'
import { TextAlignToolbar } from './text-align-toolbar'
import { cn } from '@/lib/utils'

interface SlideEditorProps {
  slide: Slide
  onUpdate: (updates: Partial<Slide>) => void
  onDelete: () => void
}

const contentAlignClass: Record<ContentAlign, string> = {
  left: 'text-left items-start',
  center: 'text-center items-center',
  right: 'text-right items-end',
}

const verticalAlignClass: Record<VerticalAlign, string> = {
  top: 'justify-start',
  middle: 'justify-center',
  bottom: 'justify-end',
}

export function SlideEditor({ slide, onUpdate, onDelete }: SlideEditorProps) {
  const [toolbarOpen, setToolbarOpen] = useState(false)
  const [titleToolbarOpen, setTitleToolbarOpen] = useState(false)
  const [bodyToolbarOpen, setBodyToolbarOpen] = useState(false)
  const blockRef = useRef<HTMLDivElement>(null)

  const contentAlign = slide.contentAlign ?? 'center'
  const verticalAlign = slide.verticalAlign ?? 'middle'
  const titleAlign = slide.titleAlign ?? 'center'
  const bodyAlign = slide.bodyAlign ?? 'center'

  useEffect(() => {
    if (!toolbarOpen) return
    const close = (e: MouseEvent) => {
      const target = e.target as Node
      if (blockRef.current?.contains(target)) return
      const toolbar = document.querySelector('[data-alignment-toolbar]')
      if (toolbar?.contains(target)) return
      setToolbarOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [toolbarOpen])

  useEffect(() => {
    if (!titleToolbarOpen) return
    const close = (e: MouseEvent) => {
      const target = e.target as Node
      const toolbar = document.querySelector('[data-text-toolbar="title"]')
      if (toolbar?.contains(target)) return
      const input = blockRef.current?.querySelector('input')
      if (input?.contains(target)) return
      setTitleToolbarOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [titleToolbarOpen])

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
          class: 'prose prose-xl max-w-none focus:outline-none min-h-[200px] text-gray-700',
        },
      },
  })

  useEffect(() => {
    if (editor && slide.content !== editor.getHTML()) {
      editor.commands.setContent(slide.content || '')
    }
  }, [slide.id, editor])

  useEffect(() => {
    if (!bodyToolbarOpen) return
    const close = (e: MouseEvent) => {
      const target = e.target as Node
      const toolbar = document.querySelector('[data-text-toolbar="body"]')
      if (toolbar?.contains(target)) return
      const editable = blockRef.current?.querySelector('[contenteditable="true"]')
      if (editable?.contains(target)) return
      setBodyToolbarOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [bodyToolbarOpen])

  useEffect(() => {
    if (!editor) return
    const onFocus = () => { setToolbarOpen(false); setTitleToolbarOpen(false); setBodyToolbarOpen(true) }
    editor.on('focus', onFocus)
    return () => {
      editor.off('focus', onFocus)
    }
  }, [editor])

  return (
    <div className="w-full h-full bg-white flex flex-col">
      {/* Главный блок сверху: без смещений при открытии меню */}
      <div
        ref={blockRef}
        className={cn(
          'group relative flex-1 min-h-0 p-6 flex flex-col cursor-pointer rounded-t-xl transition-[box-shadow] overflow-hidden',
          toolbarOpen && 'ring-4 ring-[rgb(52,137,243)]'
        )}
        onClick={(e) => {
          const target = e.target as HTMLElement
          if (target.closest('input') || target.closest('[contenteditable="true"]') || target.closest('[data-alignment-toolbar]') || target.closest('[data-text-toolbar]')) return
          setTitleToolbarOpen(false)
          setBodyToolbarOpen(false)
          setToolbarOpen((v) => !v)
        }}
      >
        <div
          className="absolute inset-0 rounded-lg bg-black/0 transition-[background-color] duration-200 pointer-events-none group-hover:bg-black/10"
          aria-hidden
        />
        {/* Область блока: позиция по вертикали (justify) и горизонтали (items) */}
        <div
          className={cn(
            'relative flex-1 flex flex-col min-h-0',
            verticalAlignClass[verticalAlign],
            contentAlignClass[contentAlign]
          )}
        >
          {/* Блок контента: ширина меньше 100%, чтобы items-start/center/end сдвигали его */}
          <div className="flex flex-col w-[85%] max-w-4xl">
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <Input
                value={slide.title || ''}
                onChange={(e) => onUpdate({ title: e.target.value })}
                onFocus={() => { setToolbarOpen(false); setBodyToolbarOpen(false); setTitleToolbarOpen(true) }}
                placeholder="Заголовок слайда"
                className={cn(
                  'text-5xl font-bold border-none focus-visible:ring-0 p-0 h-auto bg-transparent text-black placeholder:text-gray-300 w-full',
                  titleAlign === 'left' && 'text-left',
                  titleAlign === 'center' && 'text-center',
                  titleAlign === 'right' && 'text-right'
                )}
              />
            </div>
            <div className="w-full mt-8 min-h-[200px]" onClick={(e) => e.stopPropagation()}>
              {slide.imageUrl && slide.imageUrl.startsWith('http') && (
                <div className="relative mb-6">
                  <img
                    src={slide.imageUrl}
                    alt={slide.title || 'Slide image'}
                    className="w-full max-h-96 object-contain rounded-lg"
                  />
                </div>
              )}
              <div
                className={cn(
                  'min-h-[200px] w-full relative',
                  bodyAlign === 'left' && 'text-left',
                  bodyAlign === 'center' && 'text-center',
                  bodyAlign === 'right' && 'text-right'
                )}
              >
                <div onFocus={() => { setToolbarOpen(false); setTitleToolbarOpen(false); setBodyToolbarOpen(true) }} className="min-h-[200px]">
                  <EditorContent editor={editor} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Зона меню внизу (уровень фиолетовой полосы): фиксированная высота — без смещения блока */}
      <div className="flex-shrink-0 h-[52px] flex items-center justify-center border-t border-gray-100 bg-white">
        {toolbarOpen && (
          <div data-alignment-toolbar onClick={(e) => e.stopPropagation()}>
            <AlignmentToolbar
              contentAlign={contentAlign}
              verticalAlign={verticalAlign}
              onContentAlign={(v) => onUpdate({ contentAlign: v })}
              onVerticalAlign={(v) => onUpdate({ verticalAlign: v })}
              onDelete={onDelete}
            />
          </div>
        )}
        {(titleToolbarOpen || bodyToolbarOpen) && (
          <div data-text-toolbar={titleToolbarOpen ? 'title' : 'body'} onClick={(e) => e.stopPropagation()}>
            <TextAlignToolbar
              value={titleToolbarOpen ? titleAlign : bodyAlign}
              onChange={(v) => {
                onUpdate(titleToolbarOpen ? { titleAlign: v } : { bodyAlign: v })
                // Меню не закрываем — только по клику вне меню
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
