# Copilot Instructions for Living Memory

**Project**: Living Memory - A generational photo album that preserves family stories through AI-powered conversations.

## 🎯 Core Architecture

**Tech Stack**: Next.js 16 (App Router) + TypeScript + Tailwind CSS + Gemini API

**Three-Layer Structure**:
1. **Client** (`src/app`) - React components, face detection via face-api.js
2. **API Routes** (`src/app/api`) - Server-side Gemini integrations and processing  
3. **Libraries** (`src/lib`) - Shared business logic: gemini.ts, memory-bank.ts, prompts.ts, face-service.ts

## ⚠️ Critical Security Pattern

**API Keys are SERVER-SIDE ONLY**:
- Store in `.env.local`, never expose to client
- Access via `process.env.GEMINI_API_KEY` inside `/api/*/route.ts` only
- Client components must call `/api/*` routes via `fetch()`, never instantiate Gemini directly
- [See PROJECT_CONTEXT.md](../docs/PROJECT_CONTEXT.md#🔐-security-architecture) for examples

## 🔄 Key Data Flows

### Photo Analysis → Conversation
1. Client calls `POST /api/analyze-photo` with base64 image
2. Server runs [analyzePhoto()](src/lib/gemini.ts) via Gemini Vision
3. Returns `PhotoAnalysis` struct: people, setting, era, mood, visual anchors, opening prompt
4. Client begins conversation using this analysis as context

### Live Conversation Mode
- WebSocket connection to `gemini-2.5-flash-native-audio-preview-12-2025` model
- Handles bidirectional audio + text + optional video frames
- [LiveMode.tsx](src/app/playground/components/LiveMode.tsx) orchestrates: camera capture, photo detection, message history, session storage
- Photos detected via motion/object classification are queued for analysis

### Memory Bank (Client-Side Persistence)
- [memory-bank.ts](src/lib/memory-bank.ts): localStorage-based character/story store
- `Character` = recognized face + metadata + story references
- `Story` = narrative extracted from conversation + associated people/places/dates
- Face matching: euclidean distance < 0.45 confidence threshold

## 🛠️ Developer Workflows

**Build & Run**:
```bash
npm run dev              # Start dev server @ localhost:3000
npm run build            # Production build (checks types)
npm run lint             # Run eslint
```

**Common Tasks**:
- **Add API endpoint**: Create `src/app/api/<name>/route.ts`, import from `@/lib/gemini.ts`
- **Add prompt template**: Edit [prompts.ts](src/lib/prompts.ts), export function like `buildConversationPrompt()`
- **Modify face detection**: Edit [face-service.ts](src/lib/face-service.ts), uses face-api.js models from `/public/models/`
- **Extend storage**: Update [conversation-storage.ts](src/lib/storage/conversation-storage.ts) for indexedDB persistence

## 📋 Project Conventions

### Type Safety
- All API responses wrapped in typed interfaces defined in [types.ts](src/lib/types.ts)
- Request bodies validated in route handlers before passing to library functions
- Use `NextRequest`/`NextResponse` for type-safe route handlers

### Prompt Engineering
- System prompts live in [prompts.ts](src/lib/prompts.ts), never hardcoded in route handlers
- Prompts accept context parameters (photoAnalysis, conversationHistory, dossier) for dynamic building
- `buildConversationPrompt()` includes heuristics: turn count limits, memory bank summary, suggested wrap-up questions

### Face Recognition Lifecycle
1. Load models via [loadFaceModels()](src/lib/face-service.ts) (one-time, heavy operation)
2. Detect faces with [detectFaces()](src/lib/face-service.ts)
3. Match against known faces via [matchFace()](src/lib/face-service.ts)
4. Store new faces as `Character` in memory bank

### Directory Structure
```
src/app/                    # Next.js App Router
  ├── api/                  # Server-side route handlers (no 'use client')
  │   ├── analyze-photo/    # Vision analysis
  │   ├── chat/             # Conversation responses
  │   └── live/             # Live API token endpoint
  └── (main)/               # Public user flows
      ├── capture/          # Photo upload + conversation UI
      └── album/            # Event library + story gallery
src/lib/                    # Business logic (exported from API routes)
  ├── gemini.ts             # Gemini API wrapper (server-only)
  ├── gemini-live.ts        # WebSocket client for Live API (browser)
  ├── face-service.ts       # face-api.js wrapper (client-side ML)
  ├── memory-bank.ts        # localStorage character/story management
  ├── prompts.ts            # Gemini system/user prompt templates
  └── storage/              # Persistence layer
src/hooks/                  # React hooks
  ├── use-camera.ts         # Camera capture lifecycle
  └── use-photo-scanner.ts  # Background photo detection + queue
docs/                       # Architecture & onboarding
  ├── PROJECT_CONTEXT.md    # Read first for full context
  └── SYSTEM_ARCHITECTURE.md
```

## 🔗 External Dependencies

- **@google/generative-ai** - Gemini API client (REST/JSON, NOT web SDK)
- **@google/genai** - Google GenAI library (Live API compatibility)
- **face-api.js** - Browser-side face detection/recognition, models in `/public/models/`
- **@mediapipe/selfie_segmentation** - Background removal (optional enhancement)
- **@tensorflow-models/coco-ssd** - Object detection for photo-in-frame detection

## 🎓 Before Modifying

1. **Read [docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md)** for mission + data flow details
2. **Check [.cursorrules](.cursorrules)** for MVP scope limits (no social features, no mobile-specific)
3. **Server-side rule**: If touching API keys or Gemini calls, code must be in `/api/*/route.ts`
4. **Face models**: Load once at app start, reuse across components (expensive 50MB+ bundle)
5. **Live API**: Uses WebSocket not HTTP; requires specific model version; audio/video streams are binary

## ❓ Common Pitfalls

- ❌ Calling Gemini API directly from client component → Must use `/api/*` route
- ❌ Storing face models in localStorage → Should lazy-load from `/public/models/` once per session
- ❌ Blocking conversation UI during face detection → Use Web Workers (see [use-photo-scanner.ts](src/hooks/use-photo-scanner.ts))
- ❌ Hardcoding prompts in route handlers → Extract to [prompts.ts](src/lib/prompts.ts) for reuse

---

**Last Updated**: January 2026 | **Scope**: Hackathon MVP (single Next.js app, Gemini-only backend, localStorage persistence)
