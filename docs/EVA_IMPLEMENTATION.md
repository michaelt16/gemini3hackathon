# EVA Implementation Spec

> **EVA** — Life, to live, to breathe, bearer of good news.  
> Inspired by Eve (Adam and Eve). Our logo: tree + book. Gender-neutral name meaning "life."

---

## Overview

EVA is the AI companion of Living Memory. She transforms the app from a tool into a relationship—someone you talk to, not just an interface you use. The goal is to make users feel like they're having a conversation with another human.

---

## 1. Personality & Voice

### Tone
- **Warm, friendly, conversational** — like talking to a thoughtful friend
- **Supportive, not robotic** — uses natural language, occasional empathy
- **First person** — "I'd love to help you preserve this memory" not "The system can assist"
- **Bearer of good news** — frames memories positively, celebrates moments

### Example Phrasings
- "I'd love to hear more about this moment."
- "This looks like a special memory. Tell me about it."
- "Let's capture this together."
- "I'm here whenever you're ready to add a memory."

### What to Avoid
- Corporate/formal language
- Robotic confirmations ("Task completed")
- Overly enthusiastic exclamation marks
- Generic AI-speak ("How can I assist you today?")

---

## 2. Placement & Scope

### Hackathon Minimum (Phase 9A)
- **Location**: Bottom-right corner of **album editor page** (`/album/[id]`) only
- **Behavior**: Sticky orb → click opens capture modal
- **Scope**: Single page, single action

### Future: Global EVA (Agent Mode)
- **Location**: Every page (album list, album editor, etc.)
- **Behavior**: User can ask EVA questions in natural language
  - "Can I make a new album?" → EVA gathers info, creates album, navigates to editor
  - "I want to add a new memory" → EVA asks "Which album?" or "New album?" → navigates accordingly
- **Complexity**: High — requires intent parsing, state management, multi-step flows
- **Status**: Deferred post-hackathon

---

## 3. Visual Design: Aurora Orb

### Reference
- **Gemini's UI** — flowing, organic, alive
- Existing waves in app: Tell Story tab, Capture page (reuse/adapt that aesthetic)

### Orb Specs
- **Shape**: Soft ball/orb — not a perfect circle, slightly organic
- **Effect**: Aurora-style gradient — blues, purples, soft glow
- **Animation**: 
  - Idle: Gentle pulse, subtle movement (breathing)
  - Hover: Glows brighter, pulses more
  - Moves slightly toward cursor (optional, if performant)
- **Size**: ~48–56px diameter (thumb-friendly, not overwhelming)
- **Position**: Fixed bottom-right, ~24px from edges
- **z-index**: High enough to float above content

### Technical Approach
- CSS gradients + `animation` for pulse
- Optional: `@keyframes` for aurora color shift
- Consider: `filter: blur()` for soft glow
- Avoid heavy canvas/SVG if it impacts performance

---

## 4. Capture Modal

### Trigger
- **Click** on EVA orb opens modal
- Modal = "Add Memory" / capture flow

### Layout
- **Centered modal** — album editor visible (dimmed) behind
- **Backdrop**: Semi-transparent overlay (e.g. `bg-black/70`)
- **Modal content**: Full capture experience

### Modal Contents (Must Include Everything)
The modal must replicate everything `/capture/[id]` currently offers:

| Feature | Location in Modal | Notes |
|---------|-------------------|-------|
| **Camera / Scan** | Left side | 4-corner detection, Nano Banana extraction |
| **Gallery** | Left side | View captured photos, switch between them |
| **Tell Your Story** | Right side | Gemini Live conversation, waves UI |
| **Photo status** | Integrated | ✓ discussed, 💬 current |
| **Finish Session** | Bottom/header | Save and close modal, return to album |

### Layout Structure
```
┌─────────────────────────────────────────────────────┐
│  Add Memory with EVA                    [X] Close   │
├──────────────────────────┬─────────────────────────┤
│  LEFT                    │  RIGHT                   │
│  ┌────────────────────┐  │  ┌─────────────────────┐│
│  │ Camera / Scanner   │  │  │ Tell Your Story      ││
│  │ (or gallery view) │  │  │ (Gemini Live + waves)││
│  └────────────────────┘  │  └─────────────────────┘│
│  [Captured photos]       │  [Transcript / status]   │
│  [Finish Session]        │                         │
└──────────────────────────┴─────────────────────────┘
```

### Behavior
- **Close**: X button or click outside → return to album editor
- **Finish Session**: Same as current — save conversations, extract facts, close modal
- **Event context**: Modal knows which album (eventId) — passed as prop/context

---

## 5. Interactivity

### Hover
- Orb **pulses** or **glows** more brightly
- Optional: Slight scale up (e.g. 1.05x)
- Cursor: `pointer`

### Click
- Opens capture modal
- No other click actions for hackathon minimum

### Future: Agent Mode
- Click could open **chat panel** instead of direct modal
- User types: "Add a memory" → EVA asks which album → opens modal with context
- Deferred

---

## 6. First Impression

### Hackathon
- **Stay silent** until user interacts
- No auto-popup, no welcome message on load
- Orb is just there, waiting

### Future (Nice to Have)
- EVA could **first appear after hero screen** (e.g. after user scrolls past hero on `/album`)
- Slight fade-in or gentle entrance
- **Status**: Low priority, skip if complicated

---

## 7. Hackathon Minimum Checklist

| Item | Priority | Status | Notes |
|------|----------|--------|-------|
| Aurora orb (bottom-right, album editor) | ✅ Must | ✅ Done | `EVAOrb.tsx` component |
| Orb pulses/glows on hover | ✅ Must | ✅ Done | Canvas animation with color cycling |
| Click opens capture modal | ✅ Must | ✅ Done | Opens `CaptureModal` |
| Modal has full capture (camera + story) | ✅ Must | ✅ Done | Left/right split layout |
| EVA naming in modal/copy | ✅ Should | ✅ Done | "Add Memory with EVA" header |
| EVA personality in AI prompts | ⚠️ Nice | ✅ Done | Warm system prompt in `CaptureModal` |
| Global EVA on all pages | ❌ Skip | - | Future |
| Agent mode (ask questions) | ❌ Skip | - | Future |
| Welcome message on first load | ❌ Skip | - | Future |
| Orb appears after hero scroll | ❌ Skip | - | Future |

---

## 8. Technical Notes

### Components Created
- `EVAOrb.tsx` — Atom-style aurora orb with orbital rings, glowing nucleus
- `CaptureSession.tsx` — Core capture experience (works as page or modal)
- `CaptureModal.tsx` — Modal wrapper for CaptureSession

### Architecture
```
CaptureSession.tsx (shared logic)
├── /capture/[id]/page.tsx (uses CaptureSession as page)
└── CaptureModal.tsx (uses CaptureSession in modal mode)
```

### Modal Layout (isModal=true)
- **Left side**: Camera/Scanner + PhotoGallery + Controls
- **Right side**: Aurora wave + Conversation transcript
- **Header**: "Add Memory with EVA" + Live indicator + Finish/Close buttons

### Routes
- `/capture/[id]` — Standalone page (uses CaptureSession)
- `/album/[id]` — EVA orb opens CaptureModal with CaptureSession

---

## 9. Future Phases (Post-Hackathon)

### Phase 9A+ (Agent Mode)
- EVA on every page
- Natural language: "Create album", "Add memory to X"
- Multi-step conversation → navigation
- Intent parsing, context awareness

### Phase 9A+ (Polish)
- Orb entrance animation after hero
- Optional welcome on first visit
- EVA personality in all AI responses (system prompts)
- Micro-interactions (orb reacts to conversation state)

---

## 10. Future Feature: Photo Selection for Context Resumption

### Problem
Users may want to return to a previous photo mid-session to add more details or continue its story.

### Proposed Solution
Allow clicking on a captured photo in the gallery to:
1. Load that photo's conversation history back into context
2. Resume the conversation where they left off
3. Send context to EVA: "The user is returning to discuss this photo. Here's what they already shared: [previous conversation]"

### Data Model Changes Required
```typescript
interface CapturedPhoto {
  id: string;
  imageData: string;
  timestamp: number;
  story?: string;
  storySegment: Message[]; // Conversation history for THIS photo
  isGeneratingStory?: boolean;
  // ... other fields
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  photoId: string; // Track which photo this message belongs to
  // ... other fields
}
```

### Implementation Steps
1. **Track messages per photo**: When messages come in, associate them with `currentPhotoId`
2. **Store per-photo conversation**: When switching photos, save current conversation segment to that photo
3. **Restore on selection**: When user clicks a photo:
   - Set it as `currentPhotoId`
   - Load its `storySegment` back into the message display
   - Send context to EVA about resuming
4. **Handle new vs resume**: Distinguish between clicking a photo to view vs clicking to resume conversation

### UI/UX Considerations
- Add "Continue Story" button on photo cards
- Show visual indicator for photos with incomplete stories
- Photo divider in chat shows which photo is being discussed
- Clear feedback when switching between photos

### Complexity Assessment
- **Medium-High**: Requires restructuring message storage and conversation flow
- **Risk**: Context window limits if many photos with long conversations
- **Alternative**: Could use summarization when resuming older photos

### Status
**Deferred** — Not required for hackathon MVP. Document for future implementation.

---

*Document created for Phase 9A planning. Update as implementation progresses.*
