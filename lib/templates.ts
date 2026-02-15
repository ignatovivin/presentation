/**
 * Шаблоны презентаций: данные для выбора на странице outline и CSS-переменные для режима показа.
 * Первый шаблон — финтех корпоратив (B2B, доверие, строгий современный стиль).
 */

export interface TemplatePickerItem {
  id: string
  name: string
  description: string
  colors: [string, string, string]
}

export interface TemplateStyle {
  id: string
  name: string
  description: string
  cssVars: Record<string, string>
  fonts?: { heading: string; body: string }
}

/** Финтех корпоратив (B2B) — по теме PowerPoint: theme1.xml, титульный слайд = slide2.xml, контент = slide3.xml */
export const fintechCorporateTemplate: TemplateStyle = {
  id: 'fintech-corporate',
  name: 'Финтех Корпоратив',
  description: 'B2B стиль по PowerPoint: синяя палитра, Mont, титульный слайд по slide2.xml',
  fonts: {
    heading: '"Mont SemiBold", "Mont-SemiBold", Arial, sans-serif',
    body: '"Mont Regular", "Mont-Regular", Arial, sans-serif',
  },
  cssVars: {
    '--slide-bg': '#FFFFFF',
    '--slide-bg-dark': '#081C4F',
    '--slide-bg-title': 'url(/templates/fintech-title-bg.png) center/cover no-repeat',
    '--title-slide-text': '#FFFFFF',
    '--title-slide-subtitle': '#081C4F',
    '--slide-text': '#081C4F',
    '--slide-text-secondary': '#758899',
    '--slide-text-white': '#FFFFFF',
    '--slide-accent': '#3489F3',
    '--slide-accent-secondary': '#355BBB',
    '--slide-accent-light': '#7FB7FF',
    '--slide-accent-pale': '#EBF3FE',
    '--slide-card-fill': '#F5F9FE',

    '--heading-size': '48px',
    '--subheading-size': '36px',
    '--body-size': '18px',
    '--small-size': '14px',

    '--card-radius': '16px',
    '--card-shadow': '0 8px 24px rgba(8, 28, 79, 0.08)',
    '--badge-bg': '#C6DFFF',

    '--padding-large': '100px',
    '--padding-medium': '80px',
    '--padding-small': '32px',
    '--spacing': '40px',
  },
}

/** Список шаблонов для выбора на странице outline (первый — финтех корпоратив) */
export const TEMPLATES: TemplatePickerItem[] = [
  {
    id: 'fintech-corporate',
    name: 'Финтех Корпоратив',
    description: 'B2B финтех: тёмно-синий, акценты, доверие',
    colors: ['#081C4F', '#3489F3', '#7FB7FF'],
  },
  { id: 'minimal', name: 'Минимализм', description: 'Чистый дизайн для бизнеса', colors: ['#FFFFFF', '#000000', '#3B82F6'] },
  { id: 'dark', name: 'Тёмная тема', description: 'Современный tech-стиль', colors: ['#0F172A', '#1E293B', '#06B6D4'] },
  { id: 'colorful', name: 'Яркий', description: 'Креативный с акцентами', colors: ['#FFFFFF', '#EC4899', '#F59E0B'] },
  { id: 'corporate', name: 'Корпоративный', description: 'Классический стиль', colors: ['#FFFFFF', '#1F2937', '#10B981'] },
  { id: 'gradient', name: 'Градиенты', description: 'Плавные переходы', colors: ['#6366F1', '#8B5CF6', '#EC4899'] },
  { id: 'mono', name: 'Монохром', description: 'Элегантный ч/б', colors: ['#FFFFFF', '#6B7280', '#111827'] },
]

const TEMPLATE_STYLES: Record<string, TemplateStyle> = {
  'fintech-corporate': fintechCorporateTemplate,
}

/** Возвращает CSS-переменные и шрифты для шаблона (для режима презентации) */
export function getTemplateStyle(templateId: string | undefined): TemplateStyle | null {
  if (!templateId) return null
  return TEMPLATE_STYLES[templateId] ?? null
}
