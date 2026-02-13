# Setup Instructions

## Prerequisites

- Node.js 18+ installed
- yarn package manager

## Installation Steps

1. **Install dependencies:**
```bash
yarn install
```

2. **Set up environment variables:**
   - Copy `.env.example` to `.env`
   - Add your API keys:
     - `GIGACHAT_AUTH_KEY`, `GIGACHAT_SCOPE`: см. [GIGACHAT_SETUP.md](./GIGACHAT_SETUP.md)
     - `REPLICATE_API_TOKEN`: Get token from [Replicate](https://replicate.com/account/api-tokens)

3. **Run development server:**
```bash
yarn dev
```

4. **Open in browser:**
   - Navigate to `http://localhost:3000`

## Features

- ✅ AI-powered content generation (GigaChat API через Next.js route)
- ✅ Image generation with FLUX.1-schnell via Replicate (через Next.js route)
- ✅ Rich text editing with TipTap
- ✅ Drag-and-drop slide management
- ✅ Presentation preview with Reveal.js
- ✅ PDF export
- ✅ Auto-save to LocalStorage

## CORS и client-side запросы

**Все вызовы внешних AI-API идут только через наш backend (Next.js API routes).**

- Из браузера (React) нельзя дергать GigaChat, Replicate и т.п. напрямую → будет CORS / 500.
- Клиент вызывает только свои маршруты:
  - генерация слайдов: `POST /api/ai/generate`
  - генерация картинок: `POST /api/images/generate`
- Внутри этих route уже идёт запрос к внешнему API на сервере (без CORS).

Не добавляйте `fetch` на внешние AI-API в компоненты — только на `/api/*`.

## Project Structure

```
presentation/
├── app/
│   ├── api/              # API routes (все внешние AI-запросы только здесь)
│   │   ├── ai/           # GigaChat — генерация слайдов
│   │   └── images/       # Replicate — генерация изображений
│   ├── editor/          # Main editor page
│   ├── present/         # Presentation view page
│   └── page.tsx         # Home page
├── components/
│   ├── editor/          # Editor components
│   └── ui/              # shadcn/ui components
├── lib/                 # Utilities and types
├── store/               # Zustand state management
└── public/              # Static assets
```

## Usage

1. **Create a new presentation:**
   - Click "Create New Presentation" on the home page

2. **Generate content with AI:**
   - Click "AI Generate" button in the editor
   - Enter a topic and number of slides
   - AI will generate slide content automatically

3. **Edit slides:**
   - Click on a slide in the sidebar to edit
   - Use the rich text editor to modify content
   - Drag slides to reorder them

4. **Add images:**
   - Click the image icon on a slide
   - Enter a description
   - AI will generate an image

5. **Present:**
   - Click "Present" button to view in presentation mode
   - Use arrow keys or click to navigate

6. **Export:**
   - Click "Export PDF" to download as PDF

## Troubleshooting

- **API errors:** Make sure your API keys are correctly set in `.env.local`
- **Build errors:** Try deleting `node_modules` and `.next` folder, then run `yarn install`
- **Image generation fails:** Check your Replicate API token and account balance
