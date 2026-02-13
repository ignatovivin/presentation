# AI Presentation Builder (Prezo.ai Clone)

AI-powered presentation builder with modern UX and full-featured editor.

## Tech Stack

- **Frontend**: Next.js 15 (App Router) + TypeScript + React 19
- **Styling**: TailwindCSS v4 + shadcn/ui
- **State**: Zustand
- **Animations**: Framer Motion
- **Drag & Drop**: React DnD Kit
- **Rich Text**: TipTap Editor
- **AI**: Google Gemini API
- **Images**: FLUX.1-schnell via Replicate
- **Presentation**: Reveal.js
- **Export**: html2canvas + jsPDF

## Setup

1. Install dependencies:
```bash
yarn install
```

2. Create `.env.local` file:
```
GEMINI_API_KEY=your_gemini_api_key
REPLICATE_API_TOKEN=your_replicate_token
```

3. Run development server:
```bash
yarn dev
```

## Features

- AI-powered content generation
- Drag-and-drop slide management
- Rich text editing
- Image generation
- PDF export
- Auto-save to LocalStorage
- Presentation preview mode
