'use client'

import { useEffect, useLayoutEffect, useState, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import type { Slide, ContentAlign, VerticalAlign } from '@/lib/types'
import { Move } from 'lucide-react'
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

const TITLE_DEFAULT = { x: 24, y: 24 }
const BODY_DEFAULT = { x: 24, y: 96 }
const IMAGE_DEFAULT = { x: 24, y: 280 }

export function SlideEditor({ slide, onUpdate, onDelete }: SlideEditorProps) {
  /** Одно меню: режим зависит от того, куда нажали — блок или текст */
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuMode, setMenuMode] = useState<'block' | 'text'>('block')
  const [textFocusSource, setTextFocusSource] = useState<'title' | 'body'>('body')
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0 })
  const [hoveredElement, setHoveredElement] = useState<'title' | 'body' | 'image' | null>(null)
  const [draggingElement, setDraggingElement] = useState<'title' | 'body' | 'image' | null>(null)
  const blockRef = useRef<HTMLDivElement>(null)
  const slideWrapRef = useRef<HTMLDivElement>(null)
  const contentCanvasRef = useRef<HTMLDivElement>(null)
  const titleBlockRef = useRef<HTMLDivElement>(null)
  const bodyBlockRef = useRef<HTMLDivElement>(null)
  const imageBlockRef = useRef<HTMLDivElement>(null)

  const contentAlign = slide.contentAlign ?? 'center'
  const verticalAlign = slide.verticalAlign ?? 'middle'
  const titleAlign = slide.titleAlign ?? 'center'
  const bodyAlign = slide.bodyAlign ?? 'center'
  const bodyFontSize = slide.bodyFontSize ?? 16
  const titlePos = slide.titlePosition ?? TITLE_DEFAULT
  const bodyPos = slide.bodyPosition ?? BODY_DEFAULT
  const imagePos = slide.imagePosition ?? IMAGE_DEFAULT

  const GAP = 12

  const applyVerticalAlignment = (v: VerticalAlign) => {
    const canvas = contentCanvasRef.current
    const titleEl = titleBlockRef.current
    const bodyEl = bodyBlockRef.current
    const imageEl = slide.imageUrl?.startsWith('http') ? imageBlockRef.current : null
    if (!canvas || !titleEl || !bodyEl) return
    const canvasH = canvas.offsetHeight
    const titleH = titleEl.offsetHeight
    const bodyH = bodyEl.offsetHeight
    const imageH = imageEl?.offsetHeight ?? 0
    let totalH = titleH + GAP + bodyH
    if (imageEl && imageH > 0) totalH += GAP + imageH
    let titleY: number
    let bodyY: number
    let imageY: number
    if (v === 'top') {
      titleY = 0
      bodyY = titleH + GAP
      imageY = bodyY + bodyH + GAP
    } else if (v === 'bottom') {
      const startY = Math.max(0, canvasH - totalH)
      titleY = startY
      bodyY = startY + titleH + GAP
      imageY = bodyY + bodyH + GAP
    } else {
      const startY = Math.max(0, (canvasH - totalH) / 2)
      titleY = startY
      bodyY = startY + titleH + GAP
      imageY = bodyY + bodyH + GAP
    }
    onUpdate({
      verticalAlign: v,
      titlePosition: { x: titlePos.x, y: titleY },
      bodyPosition: { x: bodyPos.x, y: bodyY },
      ...(slide.imageUrl?.startsWith('http') && { imagePosition: { x: imagePos.x, y: imageY } }),
    })
  }

  const handleVerticalAlign = (v: VerticalAlign) => {
    onUpdate({ verticalAlign: v })
    requestAnimationFrame(() => applyVerticalAlignment(v))
  }

  const handleElementMoveStart = (element: 'title' | 'body' | 'image') => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const canvas = contentCanvasRef.current
    const el =
      element === 'title' ? titleBlockRef.current : element === 'body' ? bodyBlockRef.current : imageBlockRef.current
    if (!canvas || !el) return
    setDraggingElement(element)
    const canvasW = canvas.offsetWidth
    const canvasH = canvas.offsetHeight
    const elW = el.offsetWidth
    const elH = el.offsetHeight
    const pos = element === 'title' ? titlePos : element === 'body' ? bodyPos : imagePos
    let startX = e.clientX
    let startY = e.clientY
    let x = pos.x
    let y = pos.y
    const clampX = (v: number) => Math.max(0, Math.min(v, canvasW - elW))
    const clampY = (v: number) => Math.max(0, Math.min(v, canvasH - elH))
    const onMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX
      const dy = moveEvent.clientY - startY
      startX = moveEvent.clientX
      startY = moveEvent.clientY
      x = clampX(x + dx)
      y = clampY(y + dy)
      if (element === 'title') onUpdate({ titlePosition: { x, y } })
      else if (element === 'body') onUpdate({ bodyPosition: { x, y } })
      else onUpdate({ imagePosition: { x, y } })
    }
    const onUp = () => {
      setDraggingElement(null)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  // Активное состояние снимается только при клике вне слайда (меню не считается)
  useEffect(() => {
    if (!menuOpen) return
    const close = (e: MouseEvent) => {
      const target = e.target as Node
      if (slideWrapRef.current?.contains(target)) return // клик внутри слайда — не снимать
      const menuZone = document.querySelector('[data-unified-menu]')
      if (menuZone?.contains(target)) return // клик по меню — не снимать
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
          class: 'prose prose-xl max-w-none min-w-0 border-0 outline-none ring-0 focus:outline-none focus:ring-0 focus:border-0 min-h-[1.5em] text-gray-700',
        },
      },
  })

  useEffect(() => {
    if (editor && slide.content !== editor.getHTML()) {
      editor.commands.setContent(slide.content || '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- синхронизируем только при смене слайда, не при каждом изменении slide.content
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

  // Позиция меню по центру слайда (fixed, чтобы не обрезалось overflow:hidden канваса)
  useLayoutEffect(() => {
    if (!menuOpen || !slideWrapRef.current) return
    const update = () => {
      if (!slideWrapRef.current) return
      const r = slideWrapRef.current.getBoundingClientRect()
      setMenuPosition({ left: r.left + r.width / 2, top: r.top })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [menuOpen])

  return (
    <div
      ref={slideWrapRef}
      data-slide-surface
      className={cn(
        'w-full h-full bg-white grid grid-cols-1 grid-rows-[0_1fr] overflow-visible rounded-[32px]',
        !menuOpen && 'hover:shadow-[inset_0_0_0_2px_rgb(203,213,225)]',
        menuOpen && 'shadow-[inset_0_0_0_2px_rgb(52,137,243)]'
      )}
    >
      {/* Горизонтальная грид-полоса для меню (высота 0 → не сдвигает блок, меню рисуется НАД блоком) */}
      <div className="relative overflow-visible">
        {menuOpen && (
          <div
            className="z-10 flex justify-center py-1 pointer-events-none"
            style={{
              position: 'fixed',
              left: menuPosition.left,
              top: menuPosition.top,
              transform: 'translateX(-50%) translateY(calc(-100% - 12px))',
            }}
            aria-hidden
          >
            <div
              data-unified-menu
              onClick={(e) => e.stopPropagation()}
              className="pointer-events-auto inline-flex items-center gap-0.5 bg-white rounded-xl px-2 py-1"
              style={{
                boxShadow: 'rgba(0, 0, 0, 0.06) 0px 10px 24px',
                border: '1px solid rgba(0, 0, 0, 0.08)',
              }}
            >
              {menuMode === 'block' && (
                <AlignmentToolbar
                  contentAlign={contentAlign}
                  verticalAlign={verticalAlign}
                  onContentAlign={(v) => onUpdate({ contentAlign: v })}
                  onVerticalAlign={handleVerticalAlign}
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
      {/* Ячейка грида: блок контента слайда */}
      <div className="min-h-0 overflow-visible grid grid-cols-1 grid-rows-1">
        <div
          ref={blockRef}
          style={{ display: 'flex', flexDirection: 'column', padding: 'clamp(12px, 2.5%, 24px)' }}
          className="group relative flex-1 min-h-0 cursor-pointer rounded-xl overflow-visible bg-transparent"
          onClick={(e) => {
            const target = e.target as HTMLElement
            if (target.closest('input') || target.closest('[contenteditable="true"]') || target.closest('[data-unified-menu]')) return
            setMenuOpen(true)
            setMenuMode('block')
          }}
        >
          {/* Холст: заголовок, тело и изображение — независимые блоки, контент не выходит за границы */}
          <div ref={contentCanvasRef} className="relative flex-1 min-h-0 w-full overflow-hidden">
            {/* Блок заголовка — ширина по содержимому, без рамки */}
            <div
              ref={titleBlockRef}
              className="absolute z-10 w-max max-w-[calc(100%-48px)]"
              style={{ left: titlePos.x, top: titlePos.y }}
              onMouseEnter={() => setHoveredElement('title')}
              onMouseLeave={() => setHoveredElement((prev) => (prev === 'title' ? null : prev))}
            >
              {(hoveredElement === 'title' || draggingElement === 'title') && (
                <button
                  type="button"
                  data-move-handle
                  onMouseDown={handleElementMoveStart('title')}
                  className="absolute -left-2 -top-2 z-10 flex h-6 w-6 cursor-grab items-center justify-center rounded border-0 bg-white/90 text-gray-500 shadow hover:bg-gray-100 active:cursor-grabbing"
                  title="Переместить заголовок"
                  aria-label="Переместить заголовок"
                >
                  <Move className="h-3.5 w-3.5" />
                </button>
              )}
              <div data-slide-title className="relative w-max">
                <Input
                  value={slide.title || ''}
                  onChange={(e) => onUpdate({ title: e.target.value })}
                  onFocus={() => { setMenuOpen(true); setMenuMode('text'); setTextFocusSource('title') }}
                  placeholder="Заголовок слайда"
                  className={cn(
                    'text-[2rem] font-bold leading-tight border-0 border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto bg-transparent text-black placeholder:text-gray-400 w-full min-w-[1ch]',
                    titleAlign === 'left' && 'text-left',
                    titleAlign === 'center' && 'text-center',
                    titleAlign === 'right' && 'text-right'
                  )}
                />
              </div>
            </div>

            {/* Блок тела/подзаголовка — ширина по содержимому, без рамки */}
            <div
              ref={bodyBlockRef}
              className="absolute z-10 w-max max-w-[calc(100%-48px)]"
              style={{ left: bodyPos.x, top: bodyPos.y }}
              onMouseEnter={() => setHoveredElement('body')}
              onMouseLeave={() => setHoveredElement((prev) => (prev === 'body' ? null : prev))}
            >
              {(hoveredElement === 'body' || draggingElement === 'body') && (
                <button
                  type="button"
                  data-move-handle
                  onMouseDown={handleElementMoveStart('body')}
                  className="absolute -left-2 -top-2 z-10 flex h-6 w-6 cursor-grab items-center justify-center rounded border-0 bg-white/90 text-gray-500 shadow hover:bg-gray-100 active:cursor-grabbing"
                  title="Переместить текст"
                  aria-label="Переместить блок текста"
                >
                  <Move className="h-3.5 w-3.5" />
                </button>
              )}
              <div
                className={cn(
                  'min-h-0 w-max',
                  bodyAlign === 'left' && 'text-left',
                  bodyAlign === 'center' && 'text-center',
                  bodyAlign === 'right' && 'text-right'
                )}
                style={{ fontSize: bodyFontSize ? `${bodyFontSize}px` : undefined }}
              >
                <div
                  onFocus={() => { setMenuOpen(true); setMenuMode('text'); setTextFocusSource('body') }}
                  className="min-h-[1.5em]"
                >
                  <EditorContent editor={editor} />
                </div>
              </div>
            </div>

            {/* Блок изображения — ширина по содержимому, без рамки */}
            {slide.imageUrl && slide.imageUrl.startsWith('http') && (
              <div
                ref={imageBlockRef}
                className="absolute z-10 w-max max-w-[calc(100%-48px)]"
                style={{ left: imagePos.x, top: imagePos.y }}
                onMouseEnter={() => setHoveredElement('image')}
                onMouseLeave={() => setHoveredElement((prev) => (prev === 'image' ? null : prev))}
              >
                {(hoveredElement === 'image' || draggingElement === 'image') && (
                  <button
                    type="button"
                    data-move-handle
                    onMouseDown={handleElementMoveStart('image')}
                    className="absolute -left-2 -top-2 z-10 flex h-6 w-6 cursor-grab items-center justify-center rounded border-0 bg-white/90 text-gray-500 shadow hover:bg-gray-100 active:cursor-grabbing"
                    title="Переместить изображение"
                    aria-label="Переместить изображение"
                  >
                    <Move className="h-3.5 w-3.5" />
                  </button>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slide.imageUrl}
                  alt={slide.title || 'Slide image'}
                  className="max-h-[40vh] w-auto max-w-full object-contain rounded-lg"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
