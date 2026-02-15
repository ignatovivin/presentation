'use client'

import type { Editor } from '@tiptap/react'
import type { ContentAlign } from '@/lib/types'
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export type BlockType = 'pageTitle' | 'h1' | 'h2' | 'h3' | 'subheading' | 'text' | 'caption'

const BLOCK_OPTIONS: { id: BlockType; label: string }[] = [
  { id: 'pageTitle', label: 'Page Title' },
  { id: 'h1', label: 'Heading 1' },
  { id: 'h2', label: 'Heading 2' },
  { id: 'h3', label: 'Heading 3' },
  { id: 'subheading', label: 'Subheading' },
  { id: 'text', label: 'Text' },
  { id: 'caption', label: 'Caption' },
]

const FONT_SIZES = [12, 14, 16, 18, 20, 24]

interface TextStyleMenuProps {
  /** Редактор тела (null если фокус в заголовке) */
  editor: Editor | null
  /** Фокус в поле заголовка */
  isTitleFocused: boolean
  titleAlign: ContentAlign
  bodyAlign: ContentAlign
  bodyFontSize?: number
  onTitleAlign: (v: ContentAlign) => void
  onBodyAlign: (v: ContentAlign) => void
  onBodyFontSize: (v: number) => void
}

function getCurrentBlockType(editor: Editor | null): BlockType {
  if (!editor) return 'pageTitle'
  const { state } = editor
  const { $from } = state.selection
  const node = $from.parent
  const name = node.type.name
  if (name === 'heading') {
    const level = node.attrs.level as number
    if (level <= 1) return 'h1'
    if (level === 2) return 'h2'
    if (level === 3) return 'h3'
    return 'subheading'
  }
  if (name === 'paragraph') return 'text'
  return 'text'
}

export function TextStyleMenu({
  editor,
  isTitleFocused,
  titleAlign,
  bodyAlign,
  bodyFontSize = 16,
  onTitleAlign,
  onBodyAlign,
  onBodyFontSize,
}: TextStyleMenuProps) {
  const currentBlock = isTitleFocused ? 'pageTitle' : getCurrentBlockType(editor)

  const applyBlockType = (block: BlockType) => {
    if (isTitleFocused) return
    if (!editor) return
    editor.chain().focus()
    if (block === 'pageTitle' || block === 'h1') {
      editor.chain().focus().toggleHeading({ level: 1 }).run()
    } else if (block === 'h2') {
      editor.chain().focus().toggleHeading({ level: 2 }).run()
    } else if (block === 'h3') {
      editor.chain().focus().toggleHeading({ level: 3 }).run()
    } else if (block === 'subheading') {
      editor.chain().focus().toggleHeading({ level: 4 }).run()
    } else if (block === 'text' || block === 'caption') {
      editor.chain().focus().setParagraph().run()
    }
  }

  const align = isTitleFocused ? titleAlign : bodyAlign
  const onAlign = isTitleFocused ? onTitleAlign : onBodyAlign

  return (
    <>
      {/* Дропдаун типа текста */}
      <div className="inline-flex items-center">
        <select
          value={currentBlock}
          onChange={(e) => applyBlockType(e.target.value as BlockType)}
          disabled={isTitleFocused}
          className="h-9 min-w-[140px] appearance-none rounded-lg border-0 bg-transparent py-2 pl-3 pr-8 text-sm text-gray-700 focus:ring-0"
          aria-label="Стиль текста"
        >
          {BLOCK_OPTIONS.map(({ id, label }) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none -ml-6 h-4 w-4 text-gray-500" aria-hidden />
      </div>

      <div className="mx-0.5 h-5 w-px bg-gray-300" aria-hidden />

      {/* Выравнивание текста */}
      <button type="button" onClick={() => onAlign('left')} className={cn('rounded-lg p-1.5 transition-colors hover:bg-black/10', align === 'left' && 'bg-black/10')} title="По левому краю">
        <AlignLeft className="h-4 w-4 text-gray-700" />
      </button>
      <button type="button" onClick={() => onAlign('center')} className={cn('rounded-lg p-1.5 transition-colors hover:bg-black/10', align === 'center' && 'bg-black/10')} title="По центру">
        <AlignCenter className="h-4 w-4 text-gray-700" />
      </button>
      <button type="button" onClick={() => onAlign('right')} className={cn('rounded-lg p-1.5 transition-colors hover:bg-black/10', align === 'right' && 'bg-black/10')} title="По правому краю">
        <AlignRight className="h-4 w-4 text-gray-700" />
      </button>

      <div className="mx-0.5 h-5 w-px bg-gray-300" aria-hidden />

      {/* Размер */}
      <div className="inline-flex items-center gap-1">
        <select
          value={bodyFontSize}
          onChange={(e) => onBodyFontSize(Number(e.target.value))}
          className="h-9 rounded-lg border-0 bg-transparent py-1 pr-6 pl-2 text-sm text-gray-700 focus:ring-0"
        >
          {FONT_SIZES.map((size) => (
            <option key={size} value={size}>
              {size} px
            </option>
          ))}
        </select>
      </div>
    </>
  )
}
