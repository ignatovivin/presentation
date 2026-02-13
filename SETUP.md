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
   - Copy `.env.example` to `.env.local`
   - Add your API keys:
     - `GEMINI_API_KEY`: Get free API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
     - `REPLICATE_API_TOKEN`: Get token from [Replicate](https://replicate.com/account/api-tokens)

3. **Run development server:**
```bash
yarn dev
```

4. **Open in browser:**
   - Navigate to `http://localhost:3000`

## Features

- ✅ AI-powered content generation with Google Gemini
- ✅ Image generation with FLUX.1-schnell via Replicate
- ✅ Rich text editing with TipTap
- ✅ Drag-and-drop slide management
- ✅ Presentation preview with Reveal.js
- ✅ PDF export
- ✅ Auto-save to LocalStorage

## Project Structure

```
presentation/
├── app/
│   ├── api/              # API routes
│   │   ├── ai/          # Gemini AI endpoints
│   │   └── images/      # Replicate image generation
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
