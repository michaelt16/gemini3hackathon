# Memory Keeper - User Workflow & Use Cases for Figma

This document outlines the complete user journey and workflows for designing the Memory Keeper app in Figma.

## 🎯 Target User
**Primary User**: Elderly person (60+ years old) who wants to preserve family memories
- May not be tech-savvy
- Values family connections and storytelling
- Has physical photo albums they want to digitize
- Wants to share memories with younger family members

## 📱 App Modes

### Mode 1: Photo Mode (Upload & Analyze)
For users who want to upload existing digital photos

### Mode 2: Live Mode (Camera & Real-time)
For users who want to show physical photos through their camera

---

## 🗺️ Complete User Journey

### **JOURNEY 1: First-Time User - Photo Mode**

#### Screen 1: Welcome / Landing
**State**: Initial load
- **UI Elements**:
  - App logo/title: "Memory Keeper"
  - Subtitle: "Preserve your family stories, one photo at a time"
  - Two large buttons:
    - "📷 Upload a Photo" (Photo Mode)
    - "🎥 Use Camera" (Live Mode)
  - Optional: "View My Album" (if user has existing stories)

**User Action**: Clicks "Upload a Photo"

---

#### Screen 2: Photo Upload
**State**: Photo selection
- **UI Elements**:
  - File upload area (drag & drop or click to browse)
  - Preview of selected photo
  - "Continue" button (disabled until photo selected)
  - Back button

**User Action**: Selects photo → Clicks "Continue"

**System Action**: 
- Photo loads
- Face detection runs automatically
- Shows loading indicator: "Detecting faces..."

---

#### Screen 3: Face Detection Results
**State**: Faces detected, showing face boxes
- **UI Elements**:
  - Photo displayed with colored boxes around faces
  - Each face box shows:
    - Number (1, 2, 3...)
    - "Unknown" label or recognized name
  - Side panel or bottom panel showing:
    - List of detected faces
    - For each face:
      - Thumbnail
      - Status: "Recognized: [Name]" or "Unknown - Click to name"
      - Click to name/edit
  - "Begin Sharing Memories" button (primary CTA)
  - Back button

**User Action**: 
- Optionally names unknown faces
- Clicks "Begin Sharing Memories"

**System Action**:
- Analyzes photo with Gemini Vision
- Starts conversation with AI

---

#### Screen 4: Conversation View
**State**: Active conversation
- **UI Layout**: Split screen
  - **Left Side (60%)**: Photo with face boxes
  - **Right Side (40%)**: Conversation panel

- **Conversation Panel**:
  - Header: "Tell Me About This Photo"
  - Message area (scrollable):
    - AI messages (left-aligned, styled)
    - User messages (right-aligned, styled)
    - Timestamps (subtle)
  - Input area at bottom:
    - Text input field
    - "Send" button
    - Microphone icon (if voice input enabled)
  - "Memory Notes" panel (collapsible):
    - Shows extracted: Names, Places, Dates

- **Photo Side**:
  - Photo with face boxes
  - Face recognition panel (collapsible):
    - Shows recognized faces
    - Can name unknown faces

**User Action**: 
- Responds to AI questions
- Shares memories, names, places, dates

**System Action**:
- AI asks proactive follow-up questions
- Extracts names, places, dates automatically
- Updates memory notes in real-time

---

#### Screen 5: Story Preview
**State**: Story generated, ready to review
- **UI Elements**:
  - Modal or full-screen overlay
  - Header: "Your Story"
  - Story text (editable textarea):
    - First-person narrative
    - 200-500 words
    - Read-only initially, can edit
  - Metadata:
    - Word count
    - Estimated narration duration (~X seconds)
    - Associated photos (thumbnails)
  - Actions:
    - "Continue Conversation" (back)
    - "✨ Create Living Memory Video" (primary)
    - "Save to Album" (secondary)

**User Action**: 
- Reviews story
- Optionally edits
- Clicks "Create Living Memory Video" or "Save to Album"

**System Action**:
- If video: Shows generating state
- If save: Adds to album

---

#### Screen 6: Video Generation (Future)
**State**: Video being created
- **UI Elements**:
  - Loading animation
  - Progress indicator
  - Message: "Creating your living memory video..."
  - Estimated time remaining

**User Action**: Waits

**System Action**: 
- Calls VEO 3 API
- Generates animated video
- Returns video URL

---

#### Screen 7: Video Preview
**State**: Video ready
- **UI Elements**:
  - Video player (autoplay preview)
  - Controls: Play, Pause, Volume
  - Actions:
    - "Save to Album"
    - "Share" (future)
    - "Create Another Story"
  - Story text shown below video

**User Action**: 
- Watches video
- Saves or shares

---

### **JOURNEY 2: Returning User - Live Mode**

#### Screen 1: Mode Selection
**State**: User has used app before
- **UI Elements**:
  - Same as Journey 1, Screen 1
  - Additional: "View My Album" button (prominent)

**User Action**: Clicks "Use Camera"

---

#### Screen 2: Camera View
**State**: Camera active, scanning for photos
- **UI Elements**:
  - Live camera feed (full screen)
  - Overlay showing:
    - "Show me a photo" prompt
    - Photo detection indicator (when photo detected)
  - Bottom controls:
    - "Capture Photo" button (manual)
    - "Start Conversation" button (appears when photo detected)
    - Microphone toggle
    - Camera flip (front/back)
  - Connection status: "Connected to AI" indicator

**User Action**: 
- Shows physical photo to camera
- System auto-detects or user clicks "Capture Photo"

**System Action**:
- Detects photo in camera view
- Captures photo
- Runs face detection
- Shows face boxes overlay

---

#### Screen 3: Live Conversation
**State**: Real-time conversation with camera
- **UI Elements**:
  - Split view:
    - **Left (60%)**: Live camera feed with face boxes
    - **Right (40%)**: Conversation panel
  - Conversation shows:
    - Real-time AI responses (voice + text)
    - User speech (transcribed)
    - Photo thumbnails (when photos captured)
  - Controls:
    - Microphone on/off
    - "Capture Photo" button
    - "Generate Story" button (appears after conversation)

**User Action**: 
- Speaks to AI
- Shows more photos
- Answers questions

**System Action**:
- AI responds with voice
- Captures photos when detected
- Asks proactive questions
- Builds conversation history

---

#### Screen 4: Story Generation
**State**: Conversation complete, generating story
- **UI Elements**:
  - "Generate Story" button clicked
  - Loading: "Creating your story from the conversation..."
  - Shows preview of:
    - Number of messages
    - Number of photos captured
    - Estimated story length

**User Action**: Waits

**System Action**:
- Generates pure narration story
- Associates photos with story

---

#### Screen 5: Story Review & Save
**State**: Story generated
- **UI Elements**:
  - Same as Journey 1, Screen 5
  - Shows all captured photos
  - Story narrative
  - Save/Video options

---

### **JOURNEY 3: Viewing Album**

#### Screen 1: Album View
**State**: User's saved stories
- **UI Elements**:
  - Grid or list view of stories
  - Each story card shows:
    - Photo thumbnail
    - Story title (first sentence)
    - Date created
    - Duration
    - Characters in story (face thumbnails)
  - Filters:
    - By person
    - By date
    - By place
  - Search bar
  - "Create New Story" button (floating)

**User Action**: Clicks on a story

---

#### Screen 2: Story Detail
**State**: Viewing individual story
- **UI Elements**:
  - Photo(s) displayed
  - Story narrative (read-only)
  - Metadata:
    - People in story
    - Places
    - Dates
    - Created date
  - Actions:
    - Play video (if exists)
    - Edit story
    - Delete
    - Share
  - Related stories (if same people/places)

**User Action**: 
- Reads story
- Watches video
- Shares or edits

---

## 🎨 Key UI/UX Principles

### 1. **Simplicity First**
- Large, clear buttons
- Minimal text
- Obvious next steps
- No overwhelming options

### 2. **Visual Feedback**
- Loading states for all async operations
- Success/error messages (toasts)
- Progress indicators
- Face detection visual feedback (boxes, colors)

### 3. **Accessibility**
- Large touch targets (min 44x44px)
- High contrast text
- Clear labels
- Voice input option
- Keyboard navigation support

### 4. **Emotional Design**
- Warm color palette
- Nostalgic typography
- Gentle animations
- Personal, friendly tone

### 5. **Progressive Disclosure**
- Don't show everything at once
- Reveal features as needed
- Collapsible panels for advanced features
- Clear primary actions

---

## 📐 Screen Layouts

### **Layout 1: Conversation View (Photo Mode)**
```
┌─────────────────────────────────────────────────┐
│  [Logo] Memory Keeper          [Album] [Settings]│
├──────────────────┬──────────────────────────────┤
│                  │  Tell Me About This Photo    │
│                  ├──────────────────────────────┤
│   Photo          │  🤖 AI: "What a beautiful... │
│   with           │                              │
│   face boxes     │  👤 You: "That's my father..."│
│                  │                              │
│                  │  🤖 AI: "That's wonderful..."│
│                  │                              │
│                  ├──────────────────────────────┤
│                  │  [Type your message...] [Send]│
│                  ├──────────────────────────────┤
│                  │  Memory Notes (collapsed)    │
│                  │  Names: Roberto, Maria      │
│                  │  Places: Manila              │
└──────────────────┴──────────────────────────────┘
```

### **Layout 2: Live Mode**
```
┌─────────────────────────────────────────────────┐
│  [Logo] Live Mode        [Connected] [Mic: ON]    │
├──────────────────┬──────────────────────────────┤
│                  │  Live Conversation      │
│   Camera Feed    │                              │
│   (with overlay) │  🤖 "I see a family photo..."│
│                  │                              │
│   [Face Boxes]   │  👤 "That's my uncle..."     │
│                  │                              │
│                  │  🤖 "Tell me more about..."  │
│                  │                              │
│                  ├──────────────────────────────┤
│                  │  [🎤 Listening...]           │
│                  │  [Capture Photo] [Story]     │
└──────────────────┴──────────────────────────────┘
```

### **Layout 3: Album View**
```
┌─────────────────────────────────────────────────┐
│  My Album                    [+ New Story]       │
├─────────────────────────────────────────────────┤
│  [Search...]  [Filter: All] [Sort: Recent]       │
├─────────────────────────────────────────────────┤
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐        │
│  │ 📷   │  │ 📷   │  │ 📷   │  │ 📷   │        │
│  │Beach │  │Family│  │Wedding│  │Birthday│      │
│  │Trip  │  │Reunion│ │       │  │Party  │      │
│  │2023  │  │2022  │  │2021  │  │2020  │      │
│  └──────┘  └──────┘  └──────┘  └──────┘        │
└─────────────────────────────────────────────────┘
```

---

## 🔄 State Transitions

### Photo Mode Flow
```
Initial → Photo Upload → Face Detection → Conversation → Story Preview → Video/Album
```

### Live Mode Flow
```
Initial → Camera View → Live Conversation → Story Generation → Story Preview → Video/Album
```

### Error States
- Photo upload failed
- Face detection failed
- AI connection lost
- Video generation failed
- Network error

**Design**: Show clear error message with retry option

---

## 🎯 Key Interactions

### 1. **Face Naming**
- Click on face box → Input field appears
- Type name → Auto-saves
- Shows confirmation

### 2. **Conversation**
- Type message → Send
- Voice input → Auto-transcribes
- AI responds with voice + text

### 3. **Story Editing**
- Click edit → Text becomes editable
- Save changes → Updates story

### 4. **Photo Capture (Live Mode)**
- Auto-detect or manual button
- Shows preview
- Confirm or retake

---

## 📱 Responsive Design

### Desktop (1024px+)
- Side-by-side layout
- Larger photo display
- More information visible

### Tablet (768px - 1023px)
- Stacked layout
- Full-width photo
- Conversation below

### Mobile (< 768px)
- Single column
- Full-screen photo
- Conversation overlay (can dismiss)
- Bottom sheet for inputs

---

## 🎨 Color & Typography

### Colors
- Primary: Warm amber/gold (#D97706)
- Secondary: Soft blue (#2563eb)
- Background: Cream/off-white
- Text: Dark brown/charcoal
- Accent: Green for success (#16a34a)

### Typography
- Headings: Serif font (Crimson Pro, Georgia)
- Body: Sans-serif (Inter, system)
- Large, readable sizes (min 16px body)

---

## 🚀 Future Features (Design Considerations)

1. **Family Sharing**
   - Share stories with family members
   - Collaborative editing
   - Comments/reactions

2. **Timeline View**
   - Chronological story view
   - Filter by person/place/date

3. **Export Options**
   - PDF book
   - Video download
   - Print-ready format

4. **Voice Narration**
   - Record user's voice
   - AI-generated voice options
   - Multiple language support

---

## 📋 Figma Design Checklist

- [ ] Welcome/Landing screen
- [ ] Photo upload screen
- [ ] Face detection results
- [ ] Conversation view (Photo Mode)
- [ ] Camera view (Live Mode)
- [ ] Live conversation view
- [ ] Story preview/edit screen
- [ ] Video generation loading
- [ ] Video preview screen
- [ ] Album/gallery view
- [ ] Story detail view
- [ ] Error states
- [ ] Loading states
- [ ] Empty states
- [ ] Mobile responsive layouts
- [ ] Component library (buttons, inputs, cards)
- [ ] Color palette
- [ ] Typography system
- [ ] Icon set
- [ ] Animation/motion specs

---

This workflow document should serve as the foundation for your Figma designs. Each screen should be designed with the user's emotional journey in mind - making it easy, warm, and meaningful to preserve their family memories.
