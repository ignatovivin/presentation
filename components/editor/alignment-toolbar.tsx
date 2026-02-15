'use client'

import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link2,
  Trash2,
} from 'lucide-react'
import Image from 'next/image'
import type { ContentAlign, VerticalAlign } from '@/lib/types'
import { cn } from '@/lib/utils'

interface AlignmentToolbarProps {
  contentAlign: ContentAlign
  verticalAlign: VerticalAlign
  onContentAlign: (value: ContentAlign) => void
  onVerticalAlign: (value: VerticalAlign) => void
  onDelete?: () => void
  className?: string
}

export function AlignmentToolbar({
  contentAlign,
  verticalAlign,
  onContentAlign,
  onVerticalAlign,
  onDelete,
  className,
}: AlignmentToolbarProps) {
  return (
    <div
      className={cn('inline-flex items-center gap-0.5', className)}
      role="toolbar"
      aria-label="Позиция блока"
    >
      {/* Горизонтальное выравнивание */}
      <button
        type="button"
        onClick={() => onContentAlign('left')}
        className={cn(
          'rounded-lg p-1.5 transition-colors hover:bg-black/10',
          contentAlign === 'left' && 'bg-black/10'
        )}
        title="По левому краю"
        aria-pressed={contentAlign === 'left'}
      >
        <AlignLeft className="h-4 w-4 text-gray-700" />
      </button>
      <button
        type="button"
        onClick={() => onContentAlign('center')}
        className={cn(
          'rounded-lg p-1.5 transition-colors hover:bg-black/10',
          contentAlign === 'center' && 'bg-black/10'
        )}
        title="По центру"
        aria-pressed={contentAlign === 'center'}
      >
        <AlignCenter className="h-4 w-4 text-gray-700" />
      </button>
      <button
        type="button"
        onClick={() => onContentAlign('right')}
        className={cn(
          'rounded-lg p-1.5 transition-colors hover:bg-black/10',
          contentAlign === 'right' && 'bg-black/10'
        )}
        title="По правому краю"
        aria-pressed={contentAlign === 'right'}
      >
        <AlignRight className="h-4 w-4 text-gray-700" />
      </button>

      <div className="mx-0.5 h-5 w-px bg-gray-300" aria-hidden />

      {/* Вертикальное выравнивание блока — свои иконки */}
      <button
        type="button"
        onClick={() => onVerticalAlign('top')}
        className={cn(
          'rounded-lg p-1.5 transition-colors hover:bg-black/10',
          verticalAlign === 'top' && 'bg-black/10'
        )}
        title="По верху"
        aria-pressed={verticalAlign === 'top'}
      >
        <Image src="/icons/aligntop.svg" alt="По верху" width={16} height={16} className="opacity-80" />
      </button>
      <button
        type="button"
        onClick={() => onVerticalAlign('middle')}
        className={cn(
          'rounded-lg p-1.5 transition-colors hover:bg-black/10',
          verticalAlign === 'middle' && 'bg-black/10'
        )}
        title="По вертикали по центру"
        aria-pressed={verticalAlign === 'middle'}
      >
        <Image src="/icons/aligncenter.svg" alt="По центру" width={16} height={16} className="opacity-80" />
      </button>
      <button
        type="button"
        onClick={() => onVerticalAlign('bottom')}
        className={cn(
          'rounded-lg p-1.5 transition-colors hover:bg-black/10',
          verticalAlign === 'bottom' && 'bg-black/10'
        )}
        title="По низу"
        aria-pressed={verticalAlign === 'bottom'}
      >
        <Image src="/icons/alignbottom.svg" alt="По низу" width={16} height={16} className="opacity-80" />
      </button>

      <div className="mx-0.5 h-5 w-px bg-gray-300" aria-hidden />

      {/* Ссылка (заглушка) и удаление */}
      <button
        type="button"
        className="rounded-lg p-1.5 transition-colors hover:bg-black/10"
        title="Вставить ссылку"
      >
        <Link2 className="h-4 w-4 text-gray-700" />
      </button>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg p-1.5 transition-colors hover:bg-red-100 hover:text-red-600"
          title="Удалить слайд"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
