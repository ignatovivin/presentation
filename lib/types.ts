/** Горизонтальное выравнивание контента в блоке слайда */
export type ContentAlign = 'left' | 'center' | 'right'
/** Вертикальное выравнивание контента в блоке слайда */
export type VerticalAlign = 'top' | 'middle' | 'bottom'

export interface Slide {
  id: string
  type: 'title' | 'content' | 'image' | 'split'
  title?: string
  content?: string
  imageUrl?: string
  /** Описание для генерации изображения (от ИИ или введённое вручную) */
  imagePrompt?: string
  order: number
  /** Позиция блока по горизонтали (только блок) */
  contentAlign?: ContentAlign
  /** Позиция блока по вертикали (только блок) */
  verticalAlign?: VerticalAlign
  /** Выравнивание текста заголовка */
  titleAlign?: ContentAlign
  /** Выравнивание текста тела слайда */
  bodyAlign?: ContentAlign
}

export interface Presentation {
  id: string
  title: string
  slides: Slide[]
  /** Выбранный шаблон (minimal, dark, colorful, …) */
  templateId?: string
  createdAt: number
  updatedAt: number
}

export interface AIGenerationOptions {
  topic: string
  slidesCount: number
  style?: 'professional' | 'creative' | 'minimal' | 'casual' | 'academic'
  includeImages?: boolean
  imageType?: 'realistic' | 'illustration' | 'abstract' | 'none'
  language?: 'russian' | 'english' | 'spanish' | 'german' | 'french'
  audience?: string
}

export type OutlineSlideType =
  | 'title'
  | 'content'
  | 'bullets'
  | 'image'
  | 'quote'
  | 'stats'

export interface OutlineSlide {
  id: string
  type: OutlineSlideType
  title: string
  bulletPoints: string[]
  hasImage: boolean
  imagePrompt?: string
  notes: string
}

export interface ToneOption {
  id: string
  label: string
}

export interface ThemeCard {
  id: string
  name: string
  description: string
  previewColor: string
}

export interface OutlineScreenState {
  generatedTitle: string
  slideCount: number
  targetAudience: string
  estimatedDuration: string
  slides: OutlineSlide[]
  aiSuggestions: string[]
  toneSelector: ToneOption[]
  selectedToneId: string
  stylePreview: ThemeCard[]
  selectedThemeId: string
}
