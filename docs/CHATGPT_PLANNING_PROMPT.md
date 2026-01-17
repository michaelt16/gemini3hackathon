# Memory Keeper - Complete Project Summary for ChatGPT Planning

## 📋 Use This Prompt with ChatGPT

Copy the entire content below and use it as a prompt with ChatGPT for planning, architecture decisions, or feature development.

---

# Memory Keeper - Full Project Context

## 🎯 Project Overview

**Memory Keeper** is a Next.js web application designed to help elderly people (60+ years old) preserve family memories through photos. The app uses AI to have natural conversations that extract stories, which are then synthesized into narratives and eventually animated videos.

**Tech Stack**: Next.js 16.1.1, React 19.2.3, TypeScript, Tailwind CSS, Google Gemini API, face-api.js

**Current Branch**: `story-veo` (for story generation and VEO 3 API work)

---

## ✅ What's Been Implemented

### **1. Photo Analysis System**
- ✅ Gemini Vision API integration for photo analysis
- ✅ Extracts: people, setting, era, mood, visual anchors
- ✅ Generates opening observations and first questions
- ✅ API Route: `/api/analyze-photo`

### **2. Face Recognition System**
- ✅ Client-side face detection using face-api.js
- ✅ 128-dim face embeddings for matching
- ✅ Face matching across photos (Euclidean distance, threshold 0.45)
- ✅ Memory bank storage (localStorage) for known faces
- ✅ Visual face boxes with names on photos
- ✅ Face naming and relationship tracking
- ✅ Face recognition models loaded from `/public/models/`

### **3. AI Conversation System**
- ✅ Context-aware conversations with Gemini
- ✅ Proactive questioning (AI asks follow-up questions)
- ✅ Automatic extraction of names, places, dates
- ✅ Memory dossier tracking (names, places, dates)
- ✅ Conversation history management
- ✅ API Route: `/api/chat`
- ✅ System prompts in `src/lib/prompts.ts`

### **4. Story Generation**
- ✅ Story synthesis from conversations
- ✅ Pure narration format (first-person, no AI references)
- ✅ 200-500 word narratives
- ✅ Photo-conversation correlation
- ✅ API Route: `/api/generate-story`
- ✅ Story generation from Live API conversations

### **5. Gemini Live API Integration**
- ✅ Real-time WebSocket connection to Gemini Live API
- ✅ Audio responses (voice output)
- ✅ Video frame streaming (camera feed)
- ✅ Microphone input (voice input)
- ✅ Photo detection and capture during conversation
- ✅ Conversation session tracking
- ✅ Message storage with photo associations
- ✅ Live mode UI component (`LiveMode.tsx`)

### **6. Photo Modes**
- ✅ **Photo Mode**: Upload and analyze static photos
- ✅ **Live Mode**: Real-time camera conversation
- ✅ Photo scanning and detection
- ✅ Multiple photo support in sessions

### **7. Data Storage**
- ✅ Conversation sessions (localStorage)
- ✅ Live conversation messages with timestamps
- ✅ Photo-to-message associations
- ✅ Memory bank (characters, faces, stories)
- ✅ Storage utilities in `src/lib/storage/conversation-storage.ts`

### **8. UI/UX**
- ✅ Playground interface for testing
- ✅ Split-screen conversation view
- ✅ Face detection panels
- ✅ Story preview and editing
- ✅ Toast notifications
- ✅ Loading states and error handling

---

## 🚧 What's Planned / In Progress

### **1. VEO 3 API Integration** (High Priority)
- ⏳ Video generation from photos + narration
- ⏳ Currently mocked in `/api/generate-video`
- ⏳ Waiting for VEO 3 API access
- ⏳ Will animate photos with story narration

### **2. PostgreSQL Vector Database** (High Priority)
- ⏳ Migrate face recognition from localStorage to PostgreSQL
- ⏳ Use pgvector extension for 128-dim face embeddings
- ⏳ Vector similarity search for face matching
- ⏳ Multi-user support
- ⏳ Persistent storage across devices
- 📄 Plan: `docs/POSTGRES_VECTOR_DATABASE.md`

### **3. Location Agent** (Medium Priority)
- ⏳ Geocoding places mentioned in conversation
- ⏳ Distance calculations between places
- ⏳ Location information and context
- ⏳ Integration with Live API
- 📄 Plan: `docs/LOCATION_AGENT_PLAN.md`

### **4. Story Album/Archive**
- ⏳ View all generated stories
- ⏳ Filter by person, date, place
- ⏳ Story detail pages
- ⏳ Related stories suggestions

### **5. Additional AI Agents** (Future)
- Timeline Agent (organize by date)
- Relationship Agent (family tree)
- Emotion Agent (sentiment analysis)
- Memory Connection Agent (link related memories)
- 📄 List: `docs/AI_AGENTS_FOR_LIVE_CHAT.md`

### **6. Frontend Redesign**
- ⏳ Figma designs based on user workflow
- ⏳ Mobile-responsive layouts
- ⏳ Improved accessibility
- 📄 Workflow: `docs/USER_WORKFLOW_FIGMA.md`

---

## 🏗️ Architecture

### **Client-Side**
- React components (`src/app/page.tsx`, `src/app/playground/`)
- Face detection (face-api.js, client-side only)
- Memory bank (localStorage)
- Live API WebSocket client (`src/lib/gemini-live.ts`)

### **Server-Side**
- Next.js API Routes (`src/app/api/*`)
- Gemini API integration (`src/lib/gemini.ts`)
- API keys stored in `.env.local` (server-side only)

### **Data Flow**
```
User → Client Component → API Route → Gemini API → Response
```

### **Key Files**
- `src/lib/gemini.ts` - Gemini API wrapper
- `src/lib/gemini-live.ts` - Live API WebSocket client
- `src/lib/prompts.ts` - AI prompt templates
- `src/lib/face-service.ts` - Face detection/recognition
- `src/lib/memory-bank.ts` - LocalStorage persistence
- `src/lib/storage/conversation-storage.ts` - Conversation storage

---

## 🔐 Security Architecture

- ✅ API keys are SERVER-SIDE ONLY
- ✅ Never exposed to client
- ✅ All Gemini calls through API routes
- ✅ Face detection is client-side (no server needed)

---

## 📊 Current Features

### **Photo Mode Flow**
1. Upload photo → Face detection → Name faces → Start conversation
2. AI analyzes photo → Asks questions → User responds
3. Extract names/places/dates → Generate story → Preview → Create video

### **Live Mode Flow**
1. Connect to Live API → Start camera → Show photos
2. Real-time conversation (voice + text)
3. Auto-capture photos → Build conversation → Generate story

### **Story Generation**
- Input: Conversation messages + associated photos
- Process: Gemini synthesizes pure narration
- Output: First-person narrative (200-500 words)
- Format: No AI references, just the story

---

## 🎯 Key Requirements

### **User Experience**
- Simple, intuitive interface (elderly-friendly)
- Large buttons, clear labels
- Voice input support
- Natural conversation flow

### **Technical**
- TypeScript for type safety
- Server-side API key security
- Client-side face detection
- Real-time Live API integration

### **Story Quality**
- Pure narration (not conversation transcript)
- First-person perspective
- Emotional depth
- Complete stories (who, what, when, where, why)

---

## 🚀 Next Steps (Priority Order)

1. **Complete Location Agent** (3-4 hours)
   - Implement geocoding tools
   - Integrate with Live API
   - Test with real conversations

2. **PostgreSQL Migration** (4-6 hours)
   - Set up PostgreSQL with pgvector
   - Create database schema
   - Migrate face recognition
   - Update API routes

3. **VEO 3 Integration** (When API available)
   - Replace mocked video generation
   - Implement actual video creation
   - Test with generated stories

4. **Story Album** (2-3 hours)
   - Create album view
   - Story detail pages
   - Filtering and search

5. **Frontend Redesign** (Ongoing)
   - Implement Figma designs
   - Improve mobile experience
   - Enhance accessibility

---

## 📁 Project Structure

```
gemini3hackathon/
├── src/
│   ├── app/
│   │   ├── api/              # API routes (server-side)
│   │   │   ├── analyze-photo/
│   │   │   ├── chat/
│   │   │   ├── generate-story/
│   │   │   ├── generate-video/ (mocked)
│   │   │   ├── live/
│   │   │   ├── live-token/
│   │   │   └── synthesize-story/
│   │   ├── playground/       # Testing interface
│   │   └── (main)/           # Main app routes
│   └── lib/
│       ├── gemini.ts         # Gemini API wrapper
│       ├── gemini-live.ts    # Live API client
│       ├── prompts.ts        # AI prompts
│       ├── face-service.ts   # Face detection
│       ├── memory-bank.ts    # LocalStorage
│       └── storage/          # Conversation storage
├── docs/                     # Documentation
├── public/
│   └── models/               # face-api.js models
└── .env.local                # API keys (not in git)
```

---

## 🔧 Development Guidelines

### **Adding New Features**
1. API Routes: Create in `src/app/api/[name]/route.ts`
2. Client Features: Add to components, call API routes
3. Types: Add to `src/lib/types.ts`
4. Prompts: Add to `src/lib/prompts.ts`

### **Code Patterns**
- Server-side: Use `process.env.GEMINI_API_KEY`
- Client-side: Make HTTP requests to `/api/*` routes
- Never expose API keys to client
- Use TypeScript for type safety

---

## 🎨 Design Principles

- **Simplicity First**: Large buttons, minimal text, clear actions
- **Warm & Personal**: Nostalgic design, friendly tone
- **Accessibility**: High contrast, large touch targets, voice support
- **Progressive Disclosure**: Don't overwhelm, reveal features as needed

---

## 📚 Documentation Files

- `PROJECT_CONTEXT.md` - Project overview
- `SYSTEM_ARCHITECTURE.md` - Technical architecture
- `STORY_GENERATION_PLAN.md` - Story generation details
- `USER_WORKFLOW_FIGMA.md` - UI/UX workflows
- `POSTGRES_VECTOR_DATABASE.md` - Database migration plan
- `LOCATION_AGENT_PLAN.md` - Location agent implementation
- `AI_AGENTS_GUIDE.md` - How AI agents work
- `AI_AGENTS_FOR_LIVE_CHAT.md` - Recommended agents

---

## ⚠️ Important Notes

1. **API Keys**: Never commit `.env.local`, always server-side only
2. **Face Detection**: Client-side only (face-api.js in browser)
3. **Memory Bank**: Currently localStorage, migrating to PostgreSQL
4. **Live API**: WebSocket connection, requires auth token from server
5. **Story Format**: Pure narration, first-person, no AI references

---

## 🎯 Current Focus

**Active Development**:
- Story generation improvements (pure narration format)
- Proactive questioning in Live API
- Location agent planning

**Waiting On**:
- VEO 3 API access for video generation
- PostgreSQL setup for vector database

**Next Sprint**:
- Location agent implementation
- PostgreSQL migration
- Story album UI

---

## 💡 Key Insights

1. **Hybrid Approach Works**: Live API for conversation + background tools for enhancement
2. **Proactive AI**: System instructions make AI ask questions automatically
3. **Pure Narrations**: Stories should read like memories, not conversations
4. **Face Recognition**: Client-side works well, but PostgreSQL will scale better
5. **Agent Pattern**: Multiple specialized agents > one complex agent

---

Use this context to help plan features, make architecture decisions, or understand the codebase. The project is actively developed with a focus on making memory preservation easy and meaningful for elderly users.
