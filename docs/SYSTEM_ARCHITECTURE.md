# Memory Keeper - System Architecture

## 🏗️ Overall Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT SIDE                             │
│                    (src/app/page.tsx)                           │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Photo      │  │  Face        │  │  Memory      │         │
│  │   Display    │  │  Detection   │  │  Bank        │         │
│  │              │  │  (face-api)  │  │  (localStorage)│        │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│         │                │                    │                │
│         └────────────────┴────────────────────┘                │
│                            │                                    │
│                            ▼                                    │
│              ┌─────────────────────────┐                        │
│              │  Conversation UI        │                        │
│              │  (Messages, Input)      │                        │
│              └─────────────────────────┘                        │
│                            │                                    │
└────────────────────────────┼────────────────────────────────────┘
                             │
                             │ HTTP Requests (fetch)
                             │
┌────────────────────────────┼────────────────────────────────────┐
│                            ▼                                    │
│                    NEXT.JS API ROUTES                           │
│                    (Server-Side Only)                           │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐                   │
│  │ /api/analyze-    │  │ /api/chat        │                   │
│  │    photo         │  │                  │                   │
│  └────────┬─────────┘  └────────┬─────────┘                   │
│           │                     │                               │
│           │                     │                               │
│  ┌────────┴─────────┐  ┌───────┴─────────┐                   │
│  │ /api/synthesize- │  │ /api/generate-  │                   │
│  │    story         │  │    video        │                   │
│  └──────────────────┘  └─────────────────┘                   │
│           │                     │                               │
└───────────┼─────────────────────┼───────────────────────────────┘
            │                     │
            ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LIBRARY LAYER                                │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ gemini.ts    │  │ prompts.ts   │  │ types.ts     │         │
│  │              │  │              │  │              │         │
│  │ - analyzePhoto│  │ - System     │  │ - Data       │         │
│  │ - chat()     │  │   prompts   │  │   structures │         │
│  │ - startConv()│  │ - Builders   │  │             │         │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘         │
│         │                 │                                    │
└─────────┼─────────────────┼────────────────────────────────────┘
          │                 │
          ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│              EXTERNAL SERVICES                                  │
│                                                                  │
│  ┌──────────────────────────────────────────────┐             │
│  │         Google Gemini API                     │             │
│  │  (gemini-2.0-flash model)                    │             │
│  │  - Photo Analysis (Vision)                    │             │
│  │  - Conversation Generation                    │             │
│  │  - Story Synthesis                            │             │
│  └──────────────────────────────────────────────┘             │
│                                                                  │
│  ┌──────────────────────────────────────────────┐             │
│  │         face-api.js (Client-Side)            │             │
│  │  - Face Detection                             │             │
│  │  - Face Recognition                           │             │
│  │  - Face Embeddings                            │             │
│  └──────────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Complete Data Flow

### 1. Initial Photo Load & Face Detection

```
User loads page
    │
    ▼
page.tsx (useEffect)
    │
    ├─► Load photo from /testphoto.jpg
    │   └─► Convert to base64
    │
    └─► handlePhotoLoad()
        │
        ▼
    detectFacesInPhoto()
        │
        ├─► loadFaceModels() [face-service.ts]
        │   └─► Load models from /public/models/
        │       - ssd_mobilenetv1_model
        │       - face_landmark_68_model
        │       - face_recognition_model
        │
        ├─► detectFaces(photoRef.current) [face-service.ts]
        │   └─► faceapi.detectAllFaces()
        │       └─► Returns: DetectedFace[]
        │           - box (x, y, width, height)
        │           - descriptor (128-dim Float32Array)
        │           - confidence
        │
        ├─► getAllKnownFaces(memoryBank) [memory-bank.ts]
        │   └─► Load from localStorage
        │       └─► Returns: known faces with descriptors
        │
        └─► matchFace() for each detected face [face-service.ts]
            └─► Calculate euclidean distance
            └─► If distance < 0.45 → Match found!
            └─► Update UI with face boxes and names
```

### 2. Starting a Conversation

```
User clicks "Begin Sharing Memories"
    │
    ▼
startConversation() [page.tsx]
    │
    ├─► Get memory bank summary
    │   └─► getMemoryBankSummary(memoryBank)
    │
    ├─► POST /api/analyze-photo
    │   │
    │   ├─► Request Body:
    │   │   {
    │   │     imageBase64: "...",
    │   │     knownCharacters: "Known family members: ..."
    │   │   }
    │   │
    │   └─► route.ts [analyze-photo]
    │       │
    │       ├─► analyzePhoto(base64Data) [gemini.ts]
    │       │   │
    │       │   ├─► getGeminiClient()
    │       │   │   └─► process.env.GEMINI_API_KEY ✅
    │       │   │
    │       │   ├─► genAI.getGenerativeModel('gemini-2.0-flash')
    │       │   │
    │       │   └─► model.generateContent([
    │       │         { inlineData: { data: base64, mimeType } },
    │       │         PHOTO_ANALYSIS_PROMPT
    │       │       ])
    │       │       │
    │       │       └─► Returns: PhotoAnalysis JSON
    │       │           {
    │       │             people: [...],
    │       │             setting: {...},
    │       │             era: {...},
    │       │             mood: "...",
    │       │             openingObservation: "...",
    │       │             firstQuestion: "..."
    │       │           }
    │       │
    │       └─► Response: { analysis: PhotoAnalysis }
    │
    ├─► Build face match info
    │   └─► "Roberto is on the LEFT side; Maria is on the RIGHT"
    │
    └─► POST /api/chat
        │
        ├─► Request Body:
        │   {
        │     photoAnalysis: { ...analysis, recognizedPeople: "..." },
        │     messages: [],
        │     userMessage: '',
        │     dossier: { names: [], places: [], dates: [] }
        │   }
        │
        └─► route.ts [chat]
            │
            ├─► buildConversationPrompt() [prompts.ts]
            │   └─► Combines:
            │       - CONVERSATION_SYSTEM_PROMPT
            │       - Photo analysis
            │       - Recognized faces info
            │       - Memory dossier
            │       - Conversation history
            │
            ├─► chat(prompt, userMessage) [gemini.ts]
            │   │
            │   ├─► getGeminiClient()
            │   │   └─► process.env.GEMINI_API_KEY ✅
            │   │
            │   └─► model.generateContent([systemPrompt, userMessage])
            │       └─► Returns: AI response text
            │
            ├─► Parse response for JSON metadata
            │   └─► Extract: names, places, dates, suggestComplete
            │
            └─► Response: ChatResponse
                {
                  message: "AI response text",
                  extractedInfo: { names: [...], places: [...], dates: [...] },
                  suggestComplete: false
                }
```

### 3. Sending Messages in Conversation

```
User types message → clicks Send
    │
    ▼
sendMessage() [page.tsx]
    │
    ├─► Add user message to messages array
    │
    └─► POST /api/chat
        │
        ├─► Request Body:
        │   {
        │     photoAnalysis: {...},
        │     messages: [all previous messages + new user message],
        │     userMessage: "new message text",
        │     dossier: { names: [...], places: [...], dates: [...] }
        │   }
        │
        └─► [Same flow as above]
            │
            ├─► buildConversationPrompt() with full history
            ├─► chat() → Gemini API
            ├─► Extract info from response
            └─► Update dossier with new names/places/dates
```

### 4. Synthesizing Story

```
User clicks "Preview My Story So Far"
    │
    ▼
synthesizeStory() [page.tsx]
    │
    └─► POST /api/synthesize-story
        │
        ├─► Request Body:
        │   {
        │     photoAnalysis: {...},
        │     messages: [all conversation messages],
        │     dossier: { names: [...], places: [...], dates: [...] }
        │   }
        │
        └─► route.ts [synthesize-story]
            │
            ├─► buildSynthesisPrompt() [prompts.ts]
            │   └─► STORY_SYNTHESIS_PROMPT
            │       + Photo analysis
            │       + User responses
            │       + Dossier details
            │
            ├─► new GoogleGenerativeAI(process.env.GEMINI_API_KEY) ✅
            │
            ├─► model.generateContent(prompt)
            │   └─► Returns: Cohesive first-person narrative
            │
            ├─► Calculate estimatedDuration
            │   └─► wordCount / 2.5 words per second
            │
            └─► Response: SynthesisResponse
                {
                  narrative: "This is my father Roberto...",
                  wordCount: 125,
                  estimatedDuration: 50
                }
```

### 5. Face Recognition System

```
┌─────────────────────────────────────────────────────────────┐
│                    FACE RECOGNITION FLOW                    │
└─────────────────────────────────────────────────────────────┘

Photo Loaded
    │
    ▼
detectFacesInPhoto()
    │
    ├─► Load Models (once)
    │   └─► face-api.js models from /public/models/
    │
    ├─► Detect Faces
    │   └─► faceapi.detectAllFaces()
    │       └─► Returns: DetectedFace[]
    │           Each face has:
    │           - box: { x, y, width, height }
    │           - descriptor: Float32Array (128 dimensions)
    │
    ├─► Load Known Faces
    │   └─► getAllKnownFaces(memoryBank)
    │       └─► From localStorage
    │           └─► Returns: [{ characterId, characterName, descriptor }]
    │
    └─► Match Each Face
        │
        └─► matchFace(faceDescriptor, knownFaces)
            │
            ├─► For each known face:
            │   └─► calculateDistance(faceDescriptor, knownDescriptor)
            │       └─► Euclidean distance (0.0 = identical, higher = different)
            │
            ├─► If distance < 0.45 (CONFIDENT_MATCH_THRESHOLD)
            │   └─► Match found! Return FaceMatch
            │       {
            │         characterId: "...",
            │         characterName: "Roberto",
            │         distance: 0.32,
            │         confidence: 85%
            │       }
            │
            └─► If no match → "Unknown" face

Naming Unknown Face
    │
    ▼
nameFace(faceIndex, name)
    │
    ├─► Crop face thumbnail
    │   └─► canvas.toDataURL()
    │
    ├─► upsertCharacter(memoryBank, {...})
    │   │
    │   ├─► Convert descriptor: Float32Array → number[]
    │   │
    │   ├─► Save to memoryBank.characters[]
    │   │   {
    │   │     id: "...",
    │   │     name: "Roberto",
    │   │     faces: [{
    │   │       descriptor: [0.123, 0.456, ...],
    │   │       photoId: "current-photo",
    │   │       box: {...},
    │   │       thumbnail: "data:image/jpeg;base64,..."
    │   │     }]
    │   │   }
    │   │
    │   └─► saveMemoryBank(bank)
    │       └─► localStorage.setItem('memory-keeper-bank', JSON.stringify(bank))
    │
    └─► Update UI
        └─► Face now shows "Roberto" instead of "Unknown"
```

## 📦 Component Breakdown

### Client Components

**`src/app/page.tsx`** - Main React Component
- **State Management:**
  - `phase`: 'initial' | 'conversation' | 'synthesis' | 'preview' | 'generating'
  - `photoAnalysis`: PhotoAnalysis | null
  - `messages`: ConversationMessage[]
  - `dossier`: { names, places, dates }
  - `memoryBank`: MemoryBank (from localStorage)
  - `detectedFaces`: DetectedFaceWithMatch[]

- **Key Functions:**
  - `detectFacesInPhoto()`: Runs face detection on photo load
  - `nameFace()`: Saves a new face to memory bank
  - `startConversation()`: Analyzes photo and starts chat
  - `sendMessage()`: Sends user message, gets AI response
  - `synthesizeStory()`: Creates cohesive narrative
  - `generateVideo()`: (Mock) Generates video

### Server API Routes

**`src/app/api/analyze-photo/route.ts`**
- **Input:** `{ imageBase64, mimeType }`
- **Process:** Calls Gemini Vision API with photo
- **Output:** `{ analysis: PhotoAnalysis }`

**`src/app/api/chat/route.ts`**
- **Input:** `{ photoAnalysis, messages, userMessage, dossier }`
- **Process:** 
  - Builds conversation prompt with context
  - Calls Gemini API
  - Extracts names/places/dates from response
- **Output:** `{ message, extractedInfo, suggestComplete }`

**`src/app/api/synthesize-story/route.ts`**
- **Input:** `{ photoAnalysis, messages, dossier }`
- **Process:** 
  - Builds synthesis prompt
  - Calls Gemini API to create narrative
  - Calculates duration
- **Output:** `{ narrative, wordCount, estimatedDuration }`

**`src/app/api/generate-video/route.ts`**
- **Input:** `{ photoUrl, audioTranscript, keywords, duration }`
- **Process:** Currently mocked (VEO 3 integration pending)
- **Output:** `{ success, videoUrl, status: 'mocked' }`

### Library Modules

**`src/lib/gemini.ts`**
- `getGeminiClient()`: Initializes Gemini client with API key
- `analyzePhoto()`: Analyzes photo using Gemini Vision
- `chat()`: Generates conversation response
- `startConversation()`: Starts initial conversation

**`src/lib/prompts.ts`**
- `PHOTO_ANALYSIS_PROMPT`: System prompt for photo analysis
- `CONVERSATION_SYSTEM_PROMPT`: Instructions for AI conversation
- `buildConversationPrompt()`: Builds full prompt with context
- `STORY_SYNTHESIS_PROMPT`: Instructions for story synthesis
- `buildSynthesisPrompt()`: Builds synthesis prompt

**`src/lib/face-service.ts`**
- `loadFaceModels()`: Loads face-api.js models
- `detectFaces()`: Detects faces in image
- `matchFace()`: Matches face against known faces
- `calculateDistance()`: Euclidean distance between descriptors

**`src/lib/memory-bank.ts`**
- `loadMemoryBank()`: Loads from localStorage
- `saveMemoryBank()`: Saves to localStorage
- `upsertCharacter()`: Adds/updates character
- `getAllKnownFaces()`: Gets all faces for matching
- `getMemoryBankSummary()`: Creates summary for Gemini context

**`src/lib/types.ts`**
- TypeScript interfaces for all data structures

## 🔐 Security & API Key Flow

```
┌─────────────────────────────────────────────────────────────┐
│              API KEY SECURITY FLOW                           │
└─────────────────────────────────────────────────────────────┘

.env.local (NOT in git)
    │
    │ GEMINI_API_KEY=AIzaSy...
    │
    ▼
Server-Side Only (process.env.GEMINI_API_KEY)
    │
    ├─► gemini.ts
    │   └─► getGeminiClient()
    │       └─► new GoogleGenerativeAI(apiKey)
    │
    └─► API Routes
        ├─► /api/analyze-photo
        ├─► /api/chat
        └─► /api/synthesize-story
            │
            └─► All call gemini.ts functions
                └─► API key NEVER exposed to client

Client-Side (page.tsx)
    │
    └─► Only makes HTTP requests to /api/* routes
        └─► Never sees API key
        └─► Never directly calls Gemini API
```

## 🗄️ Data Storage

### Memory Bank (localStorage)
```json
{
  "characters": [
    {
      "id": "1234567890-abc",
      "name": "Roberto",
      "relationship": "father",
      "faces": [
        {
          "descriptor": [0.123, 0.456, ...], // 128 numbers
          "photoId": "current-photo",
          "box": { "x": 100, "y": 150, "width": 80, "height": 80 },
          "thumbnail": "data:image/jpeg;base64,..."
        }
      ],
      "stories": ["story-id-1"],
      "places": ["Manila"],
      "createdAt": 1234567890,
      "updatedAt": 1234567890
    }
  ],
  "stories": [
    {
      "id": "story-id-1",
      "photoId": "current-photo",
      "narrative": "This is my father Roberto...",
      "characterIds": ["1234567890-abc"],
      "places": ["Manila"],
      "dates": ["1980s"],
      "createdAt": 1234567890
    }
  ],
  "version": 1
}
```

## 🎯 Key Features

1. **Face Recognition**
   - Detects faces in photos using face-api.js
   - Matches against previously named faces
   - Stores face embeddings for future matching
   - Visual overlay with face boxes and names

2. **AI-Powered Conversation**
   - Gemini Vision analyzes photos
   - Context-aware conversation with memory
   - Extracts names, places, dates automatically
   - Suggests when story is complete

3. **Memory Bank**
   - Persistent storage in localStorage
   - Tracks family members across photos
   - Links stories to characters
   - Provides context to AI for continuity

4. **Story Synthesis**
   - Transforms Q&A into cohesive narrative
   - First-person storytelling format
   - Ready for video narration

5. **Video Generation** (Mock)
   - Placeholder for VEO 3 integration
   - Will animate photos with narration

## 📊 State Management Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    STATE FLOW                               │
└─────────────────────────────────────────────────────────────┘

Initial State
    │
    ├─► phase: 'initial'
    ├─► photoAnalysis: null
    ├─► messages: []
    ├─► memoryBank: loadMemoryBank()
    └─► detectedFaces: []

After Face Detection
    │
    ├─► detectedFaces: DetectedFaceWithMatch[]
    └─► showFacePanel: true

After "Begin Sharing Memories"
    │
    ├─► phase: 'conversation'
    ├─► photoAnalysis: PhotoAnalysis
    ├─► messages: [assistant message]
    └─► dossier: { names: [...], places: [...], dates: [...] }

During Conversation
    │
    ├─► messages: [...previous, user, assistant]
    └─► dossier: { names: [...new], places: [...new], dates: [...new] }

After "Preview Story"
    │
    ├─► phase: 'synthesis' → 'preview'
    └─► narrative: "This is my father..."

After "Create Video"
    │
    └─► phase: 'generating' → 'preview'
```

## 🔧 Environment Variables

Required:
- `GEMINI_API_KEY`: Your Google Gemini API key (from .env.local)

## 📁 File Structure

```
gemini3hackathon/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── analyze-photo/route.ts    # Photo analysis endpoint
│   │   │   ├── chat/route.ts              # Conversation endpoint
│   │   │   ├── synthesize-story/route.ts  # Story synthesis endpoint
│   │   │   └── generate-video/route.ts     # Video generation (mock)
│   │   ├── page.tsx                        # Main React component
│   │   ├── layout.tsx                     # App layout
│   │   └── globals.css                    # Styles
│   └── lib/
│       ├── gemini.ts                      # Gemini API wrapper
│       ├── prompts.ts                     # AI prompts
│       ├── face-service.ts                # Face detection/recognition
│       ├── memory-bank.ts                 # LocalStorage persistence
│       └── types.ts                       # TypeScript types
├── public/
│   ├── models/                            # face-api.js models
│   └── testphoto.jpg                      # Test photo
├── .env.local                              # API keys (not in git)
└── package.json                           # Dependencies
```

---

This architecture ensures:
- ✅ API keys stay server-side
- ✅ Face recognition works client-side (no server needed)
- ✅ Memory persists across sessions
- ✅ AI has full context for natural conversations
- ✅ Scalable structure for adding features
