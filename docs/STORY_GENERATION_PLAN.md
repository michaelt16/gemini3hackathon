# Story Generation from Live Conversations - Implementation Plan

## Overview
Transform Live API conversations into coherent stories, correlating them with captured photos to create rich, contextual narratives.

## Current State
- ✅ Live API conversations working (complete sentences)
- ✅ Photo scanning working (multiple photos supported)
- ✅ Photos stored in `scannedPhotos` array
- ❌ Conversations not stored/persisted
- ❌ No photo-to-conversation correlation
- ❌ No story generation from conversations

## Implementation Goals

### 1. Conversation Storage
**Create conversation sessions and store messages:**
- Create conversation sessions (group related conversations)
- Store each message with timestamps and associated photo IDs
- Track which photos were visible during each conversation turn
- Persist to localStorage (client-side) for now

### 2. Photo-Conversation Correlation
**Link conversations to specific photos using multiple strategies:**
- **Temporal**: Photos captured within 5 seconds of a message → auto-associate
- **Explicit**: User says "this photo" → link to most recent photo
- **Visual**: Photo visible in camera when message sent → associate
- **Manual**: User can link photos to messages later (future enhancement)

### 3. Story Generation
**Create stories from conversation history:**
- New API endpoint: `/api/generate-story`
- Input: Conversation history + associated photos + photo analyses
- Process: Use Gemini to synthesize a coherent narrative (200-500 words)
- Output: Story text that weaves together the conversation and photo context

## Implementation Plan

### Phase 1: Data Models & Types

#### 1.1 Extend Types (`src/lib/types.ts`)
```typescript
// Conversation session - groups related conversations
export interface ConversationSession {
  id: string;
  title?: string; // Auto-generated or user-provided
  createdAt: number;
  updatedAt: number;
  photoIds: string[]; // Photos captured during this session
  messageIds: string[]; // Messages in this session
}

// Enhanced conversation message with photo associations
export interface LiveConversationMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  associatedPhotoIds: string[]; // Photos visible/relevant during this message
  context?: {
    cameraActive?: boolean;
    photosVisible?: string[]; // Photos in view when message was sent
  };
}

// Story generated from conversation
export interface GeneratedStory {
  id: string;
  sessionId: string;
  title: string;
  narrative: string;
  associatedPhotoIds: string[];
  wordCount: number;
  estimatedDuration: number;
  createdAt: number;
}
```

#### 1.2 Storage Utility (`src/lib/storage/conversation-storage.ts`)
- Functions to save/load sessions and messages from localStorage
- Helper functions to associate photos with messages

### Phase 2: Conversation Storage & Tracking

#### 2.1 Session Management
- Create new session when Live API connects
- Track all messages in that session
- Associate photos captured during session

#### 2.2 Photo Association Logic
**When to associate a photo with a message:**
1. **Temporal**: Photo captured within 5 seconds of message → auto-associate
2. **Explicit**: User says "this photo" or "look at this photo" → associate with most recent photo
3. **Visual**: Photo visible in camera when message sent → associate
4. **Manual**: User can manually link photos to messages later (future)

#### 2.3 Implementation in `playground/page.tsx`
```typescript
// Track current session
const [currentSession, setCurrentSession] = useState<ConversationSession | null>(null);
const lastPhotoCaptureTime = useRef<number>(0);

// When Live API connects, create session
onConnect: () => {
  const session: ConversationSession = {
    id: `session-${Date.now()}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    photoIds: [],
    messageIds: [],
  };
  setCurrentSession(session);
  saveSession(session);
}

// When message arrives, save it with photo associations
onMessage: (message) => {
  const associatedPhotoIds = getAssociatedPhotoIds(message, lastPhotoCaptureTime.current);
  
  const liveMessage: LiveConversationMessage = {
    id: `msg-${Date.now()}`,
    sessionId: currentSession.id,
    role: message.type === 'model' ? 'assistant' : 'user',
    content: message.content,
    timestamp: message.timestamp,
    associatedPhotoIds,
  };
  
  saveMessage(liveMessage);
  updateSession(currentSession.id, { messageIds: [...currentSession.messageIds, liveMessage.id] });
}

// When photo captured, track timestamp and associate with session
const handlePhotoCaptured = (photo: ScannedPhoto) => {
  lastPhotoCaptureTime.current = Date.now();
  updateSession(currentSession.id, { 
    photoIds: [...currentSession.photoIds, photo.id] 
  });
}
```

### Phase 3: Story Generation

#### 3.1 Story Generation API (`/api/generate-story`)
**Input:**
```typescript
{
  sessionId: string;
  messages: LiveConversationMessage[];
  photos: Array<{
    id: string;
    imageData: string;
    analysis?: PhotoAnalysis;
    context?: string;
  }>;
}
```

**Process:**
1. Build prompt with:
   - Full conversation history
   - Photo analyses for associated photos
   - Context about when photos were captured
2. Use Gemini to generate coherent narrative
3. Return story text

**Output:**
```typescript
{
  story: {
    id: string;
    title: string;
    narrative: string;
    associatedPhotoIds: string[];
    wordCount: number;
    estimatedDuration: number;
  }
}
```

#### 3.2 Story Generation Prompt
```
You are creating a story from a conversation about family photos.

Conversation History:
[Full conversation with timestamps]

Photos Discussed:
[Photo analyses and context]

Create a narrative that:
1. Weaves together the conversation naturally
2. References specific photos when relevant
3. Maintains chronological flow
4. Captures the emotional tone
5. Preserves important details (names, places, dates)

Format as a first-person or third-person narrative, 200-500 words.
```

## Implementation Order

1. **Phase 1**: Data models & types (Quick - ~30 min)
2. **Phase 2**: Conversation storage & tracking (Medium - ~1 hour)
3. **Phase 3**: Story generation API (Medium - ~1 hour)

## Storage Strategy
- **Client-side**: localStorage for now
- Structure:
  ```json
  {
    "conversationSessions": [
      {
        "id": "session-123",
        "createdAt": 1234567890,
        "updatedAt": 1234567890,
        "photoIds": ["photo-1", "photo-2"],
        "messageIds": ["msg-1", "msg-2"]
      }
    ],
    "liveMessages": [
      {
        "id": "msg-1",
        "sessionId": "session-123",
        "role": "user",
        "content": "...",
        "timestamp": 1234567890,
        "associatedPhotoIds": ["photo-1"]
      }
    ]
  }
  ```

## Photo Association Implementation
- Track last photo capture time
- When message arrives, check if photo captured within 5 seconds → associate
- Parse message content for "this photo", "look at this", etc. → associate with most recent
- Track which photos are in camera view (from scannedPhotos array)

## Story Generation Flow
1. User clicks "Generate Story" button
2. Collect: session messages + associated photos + photo analyses
3. Call `/api/generate-story` with this data
4. Gemini synthesizes narrative
5. Display story in UI
