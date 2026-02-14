'use client'

import { useEffect, useState, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import type { Slide, ContentAlign, VerticalAlign } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { AlignmentToolbar } from './alignment-toolbar'
import { TextStyleMenu } from './text-style-menu'
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
  /** Одно меню: режим зависит от того, куда нажали — блок или текст */
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuMode, setMenuMode] = useState<'block' | 'text'>('block')
  const [textFocusSource, setTextFocusSource] = useState<'title' | 'body'>('body')
  const blockRef = useRef<HTMLDivElement>(null)

  const contentAlign = slide.contentAlign ?? 'center'
  const verticalAlign = slide.verticalAlign ?? 'middle'
  const titleAlign = slide.titleAlign ?? 'center'
  const bodyAlign = slide.bodyAlign ?? 'center'
  const bodyFontSize = slide.bodyFontSize ?? 16

  // Фокус блока и работа в нём заканчиваются только при клике мимо (вне блока и вне меню)
  useEffect(() => {
    if (!menuOpen) return
    const close = (e: MouseEvent) => {
      const target = e.target as Node
      if (blockRef.current?.contains(target)) return // клик внутри блока — не закрывать
      const menuZone = document.querySelector('[data-unified-menu]')
      if (menuZone?.contains(target)) return // клик по меню — не закрывать
      setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

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
    if (!editor) return
    const onFocus = () => {
      setMenuOpen(true)
      setMenuMode('text')
      setTextFocusSource('body')
    }
    editor.on('focus', onFocus)
    return () => {
      editor.off('focus', onFocus)
    }
  }, [editor])

  return (
    <div className="w-full h-full bg-white grid grid-cols-1 grid-rows-[0_1fr] overflow-visible">
      {/* Горизонтальная грид-полоса для меню (высота 0 → не сдвигает блок, меню рисуется НАД блоком) */}
      <div className="relative overflow-visible">
        {menuOpen && (
          <div
            className="z-10 flex justify-center py-1 pointer-events-none"
            style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%) translateY(calc(-100% - 12px))' }}
            aria-hidden
          >
            <div
              data-unified-menu
              onClick={(e) => e.stopPropagation()}
              className="pointer-events-auto inline-flex items-center gap-0.5 bg-white rounded-2xl px-3 py-1.5"
              style={{
                boxShadow: 'rgba(0, 0, 0, 0.06) 0px 20px 32px',
                border: '1px solid rgba(0, 0, 0, 0.08)',
              }}
            >
              {menuMode === 'block' && (
                <AlignmentToolbar
                  contentAlign={contentAlign}
                  verticalAlign={verticalAlign}
                  onContentAlign={(v) => onUpdate({ contentAlign: v })}
                  onVerticalAlign={(v) => onUpdate({ verticalAlign: v })}
                  onDelete={onDelete}
                />
              )}
              {menuMode === 'text' && (
                <TextStyleMenu
                  editor={editor}
                  isTitleFocused={textFocusSource === 'title'}
                  titleAlign={titleAlign}
                  bodyAlign={bodyAlign}
                  bodyFontSize={bodyFontSize}
                  onTitleAlign={(v) => onUpdate({ titleAlign: v })}
                  onBodyAlign={(v) => onUpdate({ bodyAlign: v })}
                  onBodyFontSize={(v) => onUpdate({ bodyFontSize: v })}
                />
              )}
            </div>
          </div>
        )}
      </div>
      {/* Ячейка грида: главный блок (под меню, не сдвигается) */}
      <div className="min-h-0 overflow-visible grid grid-cols-1 grid-rows-1">
        <div
          ref={blockRef}
          style={{ display: 'flex', flexDirection: 'column' }}
          className={cn(
            'group relative flex-1 min-h-0 p-6 cursor-pointer rounded-xl transition-[box-shadow] overflow-visible bg-transparent',
            menuOpen && menuMode === 'block' && 'shadow-[0_0_0_4px_rgb(52,137,243)]'
          )}
          onClick={(e) => {
            const target = e.target as HTMLElement
            if (target.closest('input') || target.closest('[contenteditable="true"]') || target.closest('[data-unified-menu]')) return
            setMenuOpen(true)
            setMenuMode('block')
          }}
        >
          <div
            className="absolute inset-0 rounded-xl bg-transparent transition-[background-color] duration-200 pointer-events-none group-hover:bg-[rgb(245,245,245)]"
            aria-hidden
          />
          <div
            className={cn(
              'relative flex-1 flex flex-col min-h-0',
              verticalAlignClass[verticalAlign],
              contentAlignClass[contentAlign]
            )}
          >
            <div className="flex flex-col w-[85%] max-w-4xl">
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <Input
                  value={slide.title || ''}
                  onChange={(e) => onUpdate({ title: e.target.value })}
                  onFocus={() => { setMenuOpen(true); setMenuMode('text'); setTextFocusSource('title') }}
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
                  style={{ fontSize: bodyFontSize ? `${bodyFontSize}px` : undefined }}
                >
                  <div onFocus={() => { setMenuOpen(true); setMenuMode('text'); setTextFocusSource('body') }} className="min-h-[200px]">
                    <EditorContent editor={editor} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
