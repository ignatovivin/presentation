'use client'

import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react'
import type { ContentAlign } from '@/lib/types'
import { cn } from '@/lib/utils'

interface TextAlignToolbarProps {
  value: ContentAlign
  onChange: (value: ContentAlign) => void
  className?: string
}

export function TextAlignToolbar({ value, onChange, className }: TextAlignToolbarProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-xl border bg-[#f5f5f5] p-1 shadow-md',
        className
      )}
      style={{ borderColor: 'rgba(0,0,0,0.08)' }}
      role="toolbar"
      aria-label="Выравнивание текста"
    >
      <button
        type="button"
        onClick={() => onChange('left')}
        className={cn(
          'rounded-lg p-2 transition-colors hover:bg-black/10',
          value === 'left' && 'bg-black/10'
        )}
        title="По левому краю"
      >
        <AlignLeft className="h-4 w-4 text-gray-700" />
      </button>
      <button
        type="button"
        onClick={() => onChange('center')}
        className={cn(
          'rounded-lg p-2 transition-colors hover:bg-black/10',
          value === 'center' && 'bg-black/10'
        )}
        title="По центру"
      >
        <AlignCenter className="h-4 w-4 text-gray-700" />
      </button>
      <button
        type="button"
        onClick={() => onChange('right')}
        className={cn(
          'rounded-lg p-2 transition-colors hover:bg-black/10',
          value === 'right' && 'bg-black/10'
        )}
        title="По правому краю"
      >
        <AlignRight className="h-4 w-4 text-gray-700" />
      </button>
    </div>
  )
}
