import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  OutlineScreenState,
  OutlineSlide,
  OutlineSlideType,
} from '@/lib/types'

interface OutlineStore extends OutlineScreenState {
  setTitle: (title: string) => void
  setTargetAudience: (audience: string) => void
  setEstimatedDuration: (duration: string) => void
  setSlides: (slides: OutlineSlide[]) => void
  updateSlide: (id: string, updates: Partial<OutlineSlide>) => void
  addSlide: () => void
  deleteSlide: (id: string) => void
  reorderSlides: (ids: string[]) => void
  addBulletPoint: (id: string) => void
  updateBulletPoint: (id: string, index: number, value: string) => void
  deleteBulletPoint: (id: string, index: number) => void
  toggleHasImage: (id: string) => void
  setSelectedTone: (toneId: string) => void
  setSelectedTheme: (themeId: string) => void
  resetToDefault: () => void
}

const createDefaultSlides = (): OutlineSlide[] => [
  {
    id: `outline-${Date.now()}-1`,
    type: 'title',
    title: 'Вступление и контекст',
    bulletPoints: ['Кратко представьтесь', 'Опишите цель презентации'],
    hasImage: false,
    notes: '',
  },
  {
    id: `outline-${Date.now()}-2`,
    type: 'bullets',
    title: 'Ключевые тезисы',
    bulletPoints: ['Проблема', 'Решение', 'Ценность для аудитории'],
    hasImage: true,
    imagePrompt: 'Иконки, визуально показывающие проблему и решение',
    notes: '',
  },
]

const defaultState: OutlineScreenState = {
  generatedTitle: 'Черновой заголовок презентации',
  slideCount: 5,
  targetAudience: 'Предприниматели и инвесторы ранних стадий',
  estimatedDuration: '~8 минут',
  slides: createDefaultSlides(),
  aiSuggestions: [
    '💡 Добавьте слайд с реальными кейсами клиентов',
    '💡 Уточните метрики успеха (рост, выручка, retention)',
    '💡 Добавьте слайд с планом на следующие 12 месяцев',
  ],
  toneSelector: [
    { id: 'professional', label: 'Профессиональный' },
    { id: 'casual', label: 'Неформальный' },
    { id: 'persuasive', label: 'Убедительный' },
  ],
  selectedToneId: 'professional',
  stylePreview: [
    {
      id: 'modern',
      name: 'Современный',
      description: 'Чистый минимализм с акцентами',
      previewColor: '#6366f1',
    },
    {
      id: 'corporate',
      name: 'Корпоративный',
      description: 'Строгий бизнес-стиль для совета директоров',
      previewColor: '#0f172a',
    },
    {
      id: 'vibrant',
      name: 'Яркий',
      description: 'Цветные акценты для маркетинговых презентаций',
      previewColor: '#ec4899',
    },
  ],
  selectedThemeId: 'modern',
}

export const useOutlineStore = create<OutlineStore>()(
  persist(
    (set, get) => ({
      ...defaultState,

      setTitle: (title) => set({ generatedTitle: title }),
      setTargetAudience: (audience) => set({ targetAudience: audience }),
      setEstimatedDuration: (duration) => set({ estimatedDuration: duration }),

      setSlides: (slides) =>
        set({
          slides,
          slideCount: slides.length,
        }),

      updateSlide: (id, updates) =>
        set((state) => ({
          slides: state.slides.map((slide) =>
            slide.id === id ? { ...slide, ...updates } : slide
          ),
        })),

      addSlide: () =>
        set((state) => {
          const newSlide: OutlineSlide = {
            id: `outline-${Date.now()}-${Math.random()}`,
            type: 'content',
            title: 'Новый слайд',
            bulletPoints: ['Новый пункт'],
            hasImage: false,
            notes: '',
          }
          const slides = [...state.slides, newSlide]
          return { slides, slideCount: slides.length }
        }),

      deleteSlide: (id) =>
        set((state) => {
          const slides = state.slides.filter((s) => s.id !== id)
          return { slides, slideCount: slides.length }
        }),

      reorderSlides: (ids) =>
        set((state) => {
          const idToSlide = new Map(state.slides.map((s) => [s.id, s]))
          const reordered = ids
            .map((id) => idToSlide.get(id))
            .filter((s): s is OutlineSlide => Boolean(s))
          return { slides: reordered }
        }),

      addBulletPoint: (id) =>
        set((state) => ({
          slides: state.slides.map((slide) =>
            slide.id === id
              ? {
                  ...slide,
                  bulletPoints: [...slide.bulletPoints, 'Новый пункт'],
                }
              : slide
          ),
        })),

      updateBulletPoint: (id, index, value) =>
        set((state) => ({
          slides: state.slides.map((slide) =>
            slide.id === id
              ? {
                  ...slide,
                  bulletPoints: slide.bulletPoints.map((bp, i) =>
                    i === index ? value : bp
                  ),
                }
              : slide
          ),
        })),

      deleteBulletPoint: (id, index) =>
        set((state) => ({
          slides: state.slides.map((slide) =>
            slide.id === id
              ? {
                  ...slide,
                  bulletPoints: slide.bulletPoints.filter((_, i) => i !== index),
                }
              : slide
          ),
        })),

      toggleHasImage: (id) =>
        set((state) => ({
          slides: state.slides.map((slide) =>
            slide.id === id
              ? { ...slide, hasImage: !slide.hasImage }
              : slide
          ),
        })),

      setSelectedTone: (toneId) => set({ selectedToneId: toneId }),
      setSelectedTheme: (themeId) => set({ selectedThemeId: themeId }),

      resetToDefault: () => set(defaultState),
    }),
    { name: 'outline-storage' }
  )
)

