import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Presentation, Slide } from '@/lib/types'

interface PresentationState {
  currentPresentation: Presentation | null
  presentations: Presentation[]
  
  // Actions
  createPresentation: (title?: string) => void
  updatePresentation: (id: string, updates: Partial<Presentation>) => void
  deletePresentation: (id: string) => void
  setCurrentPresentation: (id: string) => void
  
  // Slide actions
  addSlide: (slide: Omit<Slide, 'id' | 'order'>) => void
  updateSlide: (slideId: string, updates: Partial<Slide>) => void
  deleteSlide: (slideId: string) => void
  reorderSlides: (slideIds: string[]) => void
  duplicateSlide: (slideId: string) => void
}

const createDefaultSlide = (order: number): Slide => ({
  id: `slide-${Date.now()}-${Math.random()}`,
  type: 'content',
  title: 'Новый слайд',
  content: '',
  order,
})

export const usePresentationStore = create<PresentationState>()(
  persist(
    (set, get) => ({
      currentPresentation: null,
      presentations: [],

      createPresentation: (title = 'Презентация без названия') => {
        const newPresentation: Presentation = {
          id: `pres-${Date.now()}`,
          title,
          slides: [createDefaultSlide(0)],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        
        set((state) => ({
          presentations: [...state.presentations, newPresentation],
          currentPresentation: newPresentation,
        }))
      },

      updatePresentation: (id, updates) => {
        set((state) => ({
          presentations: state.presentations.map((pres) =>
            pres.id === id
              ? { ...pres, ...updates, updatedAt: Date.now() }
              : pres
          ),
          currentPresentation:
            state.currentPresentation?.id === id
              ? { ...state.currentPresentation, ...updates, updatedAt: Date.now() }
              : state.currentPresentation,
        }))
      },

      deletePresentation: (id) => {
        set((state) => ({
          presentations: state.presentations.filter((pres) => pres.id !== id),
          currentPresentation:
            state.currentPresentation?.id === id ? null : state.currentPresentation,
        }))
      },

      setCurrentPresentation: (id) => {
        const presentation = get().presentations.find((p) => p.id === id)
        if (presentation) {
          set({ currentPresentation: presentation })
        }
      },

      addSlide: (slideData) => {
        const { currentPresentation } = get()
        if (!currentPresentation) return

        const newSlide: Slide = {
          ...slideData,
          id: `slide-${Date.now()}-${Math.random()}`,
          order: currentPresentation.slides.length,
        }

        set((state) => ({
          currentPresentation: state.currentPresentation
            ? {
                ...state.currentPresentation,
                slides: [...state.currentPresentation.slides, newSlide],
                updatedAt: Date.now(),
              }
            : null,
        }))
      },

      updateSlide: (slideId, updates) => {
        set((state) => {
          if (!state.currentPresentation) return state

          return {
            currentPresentation: {
              ...state.currentPresentation,
              slides: state.currentPresentation.slides.map((slide) =>
                slide.id === slideId ? { ...slide, ...updates } : slide
              ),
              updatedAt: Date.now(),
            },
          }
        })
      },

      deleteSlide: (slideId) => {
        set((state) => {
          if (!state.currentPresentation) return state

          const filteredSlides = state.currentPresentation.slides
            .filter((slide) => slide.id !== slideId)
            .map((slide, index) => ({ ...slide, order: index }))

          return {
            currentPresentation: {
              ...state.currentPresentation,
              slides: filteredSlides,
              updatedAt: Date.now(),
            },
          }
        })
      },

      reorderSlides: (slideIds) => {
        set((state) => {
          if (!state.currentPresentation) return state

          const reorderedSlides = slideIds
            .map((id, index) => {
              const slide = state.currentPresentation!.slides.find((s) => s.id === id)
              return slide ? { ...slide, order: index } : null
            })
            .filter((slide): slide is Slide => slide !== null)

          return {
            currentPresentation: {
              ...state.currentPresentation,
              slides: reorderedSlides,
              updatedAt: Date.now(),
            },
          }
        })
      },

      duplicateSlide: (slideId) => {
        set((state) => {
          if (!state.currentPresentation) return state

          const slideToDuplicate = state.currentPresentation.slides.find(
            (s) => s.id === slideId
          )
          if (!slideToDuplicate) return state

          const newSlide: Slide = {
            ...slideToDuplicate,
            id: `slide-${Date.now()}-${Math.random()}`,
            order: slideToDuplicate.order + 1,
          }

          const updatedSlides = [...state.currentPresentation.slides]
          updatedSlides.splice(slideToDuplicate.order + 1, 0, newSlide)
          const reorderedSlides = updatedSlides.map((slide, index) => ({
            ...slide,
            order: index,
          }))

          return {
            currentPresentation: {
              ...state.currentPresentation,
              slides: reorderedSlides,
              updatedAt: Date.now(),
            },
          }
        })
      },
    }),
    {
      name: 'presentation-storage',
    }
  )
)
