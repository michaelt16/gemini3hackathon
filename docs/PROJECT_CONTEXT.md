# Memory Keeper - Project Context

> **Purpose**: This file provides comprehensive context about the Memory Keeper project for AI assistants. When a new model or conversation starts, read this file first to understand the project without searching the entire codebase.

## 🎯 Project Mission

Memory Keeper is a Next.js web application designed to help elderly people preserve family memories. Users upload photos, the app recognizes faces, and uses AI to have natural conversations that extract stories. These stories are then synthesized into narratives and (eventually) animated videos.

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT SIDE                          │
│  - React UI (page.tsx)                                  │
│  - Face detection (face-api.js)                         │
│  - Memory bank (localStorage)                           │
└──────────────────┬──────────────────────────────────────┘
                   │ HTTP Requests
┌──────────────────▼──────────────────────────────────────┐
│                  SERVER SIDE                            │
│  - Next.js API Routes (/api/*)                          │
│  - Gemini API integration (gemini.ts)                   │
│  - API keys (process.env)                              │
└──────────────────┬──────────────────────────────────────┘
                   │ API Calls
┌──────────────────▼──────────────────────────────────────┐
│              EXTERNAL SERVICES                            │
│  - Google Gemini API (gemini-2.0-flash)                 │
│  - face-api.js (client-side, no server)                 │
└─────────────────────────────────────────────────────────┘
```

## 📁 Critical Files

### Core Application Files
- **`src/app/page.tsx`** - Main React component (CLIENT-SIDE)
  - Handles UI, state management, face detection UI
  - Makes HTTP requests to API routes
  - Never directly accesses API keys

- **`src/app/api/analyze-photo/route.ts`** - Photo analysis endpoint (SERVER-SIDE)
- **`src/app/api/chat/route.ts`** - Conversation endpoint (SERVER-SIDE)
- **`src/app/api/synthesize-story/route.ts`** - Story synthesis endpoint (SERVER-SIDE)
- **`src/app/api/generate-video/route.ts`** - Video generation (mocked, SERVER-SIDE)

### Library Files
- **`src/lib/gemini.ts`** - Gemini API wrapper (SERVER-SIDE ONLY)
  - Uses `process.env.GEMINI_API_KEY`
  - Functions: `analyzePhoto()`, `chat()`, `startConversation()`
  
- **`src/lib/prompts.ts`** - AI prompt templates
  - `PHOTO_ANALYSIS_PROMPT` - For analyzing photos
  - `CONVERSATION_SYSTEM_PROMPT` - For conversations
  - `buildConversationPrompt()` - Builds context-aware prompts
  
- **`src/lib/face-service.ts`** - Face detection/recognition (CLIENT-SIDE)
  - Uses face-api.js
  - Functions: `detectFaces()`, `matchFace()`, `loadFaceModels()`
  
- **`src/lib/memory-bank.ts`** - LocalStorage persistence (CLIENT-SIDE)
  - Stores characters, faces, stories
  - Functions: `loadMemoryBank()`, `upsertCharacter()`, `getAllKnownFaces()`
  
- **`src/lib/types.ts`** - TypeScript type definitions

## 🔐 Security Architecture

### API Key Security (CRITICAL)
- **API keys are SERVER-SIDE ONLY**
- Stored in `.env.local` (not in git)
- Accessed via `process.env.GEMINI_API_KEY` in server code only
- Client components make HTTP requests to `/api/*` routes
- Client never directly calls Gemini API or sees API keys

### Pattern to Follow
```typescript
// ✅ CORRECT - Server-side API route
// src/app/api/chat/route.ts
import { analyzePhoto } from '@/lib/gemini'; // Server-side only

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY; // ✅ Server-side only
  // ...
}

// ❌ WRONG - Never do this in client components
'use client';
const apiKey = process.env.GEMINI_API_KEY; // ❌ Won't work, exposes key
```

## 🔄 Data Flow Patterns

### 1. Photo Analysis Flow
```
User clicks "Begin Sharing Memories"
  → page.tsx calls fetch('/api/analyze-photo')
  → route.ts receives request
  → gemini.ts.analyzePhoto() called
  → Gemini Vision API analyzes photo
  → Returns PhotoAnalysis JSON
  → Response sent to client
```

### 2. Conversation Flow
```
User sends message
  → page.tsx calls fetch('/api/chat', { messages, photoAnalysis, dossier })
  → route.ts builds conversation prompt
  → gemini.ts.chat() called
  → Gemini API generates response
  → Response parsed for names/places/dates
  → Extracted info updates dossier
  → Response sent to client
```

### 3. Face Recognition Flow
```
Photo loads
  → page.tsx detects image load
  → face-service.ts.loadFaceModels() (loads from /public/models/)
  → face-service.ts.detectFaces() (uses face-api.js)
  → memory-bank.ts.getAllKnownFaces() (from localStorage)
  → face-service.ts.matchFace() for each detected face
  → UI updates with face boxes and names
```

## 📊 Key Data Structures

### PhotoAnalysis
```typescript
{
  people: [{ description, estimatedAge, clothing, expression }],
  setting: { location, indoor, details },
  era: { estimatedDecade, clues },
  mood: 'happy' | 'formal' | 'melancholic' | ...,
  visualAnchors: string[],
  openingObservation: string,
  firstQuestion: string
}
```

### ConversationMessage
```typescript
{
  role: 'user' | 'assistant',
  content: string,
  timestamp: number
}
```

### MemoryBank
```typescript
{
  characters: [{
    id: string,
    name: string,
    relationship?: string,
    faces: [{
      descriptor: number[], // 128-dim face embedding
      photoId: string,
      box: { x, y, width, height },
      thumbnail?: string // base64
    }],
    stories: string[],
    places: string[]
  }],
  stories: [...],
  version: number
}
```

## 🎨 UI Flow States

1. **`initial`** - Photo loaded, faces detected, ready to start
2. **`conversation`** - Active conversation with AI
3. **`synthesis`** - Generating narrative from conversation
4. **`preview`** - Showing synthesized narrative for review
5. **`generating`** - Creating video (future feature)

## 🛠️ Development Guidelines

### Adding New Features

1. **New API Endpoint?**
   - Create `src/app/api/[name]/route.ts`
   - Import from `@/lib/gemini` if using Gemini
   - Use `process.env.GEMINI_API_KEY` (server-side only)
   - Return `NextResponse.json()`

2. **New Client Feature?**
   - Add to `src/app/page.tsx` or create new component
   - Make HTTP requests to `/api/*` routes
   - Never import `gemini.ts` directly

3. **New Type?**
   - Add to `src/lib/types.ts`
   - Export and use consistently

4. **New Prompt?**
   - Add to `src/lib/prompts.ts`
   - Follow existing prompt structure

### Code Patterns

**API Route Pattern:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { someFunction } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Validate input
    // Call library function
    const result = await someFunction(body.data);
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error message' },
      { status: 500 }
    );
  }
}
```

**Client Component Pattern:**
```typescript
'use client';
import { useState } from 'react';

export default function Component() {
  const [data, setData] = useState(null);
  
  const handleAction = async () => {
    const response = await fetch('/api/endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data })
    });
    const result = await response.json();
    setData(result);
  };
  
  return <div>...</div>;
}
```

## 🔍 Common Tasks

### How to add a new Gemini API call?
1. Add function to `src/lib/gemini.ts`
2. Use `getGeminiClient()` to get client
3. Create API route in `src/app/api/[name]/route.ts`
4. Call the function from the route
5. Client component calls the API route

### How to add face recognition to a new photo?
1. Load photo in `page.tsx`
2. Call `detectFacesInPhoto()` (already implemented)
3. Faces are automatically matched against memory bank
4. User can name unknown faces
5. Named faces are saved to memory bank

### How to persist new data?
- Use `memory-bank.ts` functions for client-side storage
- Use `localStorage` via memory-bank.ts (don't access directly)
- For server-side persistence, would need database (not implemented yet)

## 📚 Dependencies

- **Next.js 16.1.1** - Framework (App Router)
- **React 19.2.3** - UI library
- **@google/generative-ai 0.24.1** - Gemini API client
- **face-api.js 0.22.2** - Face detection/recognition
- **TypeScript 5** - Type safety
- **Tailwind CSS 4** - Styling

## 🚀 Current Status

### Implemented ✅
- Face detection and recognition
- Photo analysis with Gemini Vision
- AI-powered conversation with context
- Story synthesis from conversation
- Memory bank persistence
- Face matching across photos

### In Progress / Planned ⏳
- Video generation (mocked, waiting for VEO 3 API)
- Multiple photo support
- Story library/archive
- Export/sharing features

## 📖 Additional Documentation

- **`SYSTEM_ARCHITECTURE.md`** - Detailed architecture diagrams
- **`CALL_FLOW_DIAGRAM.md`** - Sequence diagrams for all flows
- **`.cursorrules`** - Cursor-specific rules and patterns

## ⚠️ Important Notes

1. **Never commit `.env.local`** - Contains API keys
2. **API keys are server-side only** - Check all imports
3. **Face detection is client-side** - Uses face-api.js in browser
4. **Memory bank is localStorage** - Client-side only, not synced
5. **All Gemini calls go through API routes** - Never direct from client

## 🎯 Quick Reference

**Where is the API key used?**
- `src/lib/gemini.ts` - `getGeminiClient()` function
- `src/app/api/synthesize-story/route.ts` - Direct access (should use gemini.ts)

**Where are faces detected?**
- `src/app/page.tsx` - `detectFacesInPhoto()` function
- `src/lib/face-service.ts` - Actual detection logic

**Where is conversation handled?**
- `src/app/page.tsx` - UI and state
- `src/app/api/chat/route.ts` - Server endpoint
- `src/lib/gemini.ts` - Gemini API calls
- `src/lib/prompts.ts` - Prompt building

**Where is data stored?**
- `localStorage` via `src/lib/memory-bank.ts`
- Memory bank contains: characters, faces, stories

---

**Last Updated**: When this file is read, check git history for latest changes.
