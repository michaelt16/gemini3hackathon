# Animated Photo Album with Voice Narration - Implementation Plan

## 🎯 Vision

Create a system where:
1. Individual photos get **subtle animation** (like Live Photos) with **voice-cloned TTS narration**
2. Photos are grouped into **albums** (manually)
3. Albums can be **stitched into full story videos** using a **timeline editor**
4. Multiple stories can be merged with **context-aware narration** and **voice toggling**

---

## 🎬 Workflow Overview

```
1. Generate Story → 2. Clone Voice → 3. Animate Photo → 4. Add to Album
                                                              ↓
5. Timeline Editor → 6. Stitch Stories → 7. Final Video with Multi-Voice Narration
```

---

## 📋 Phase 1: Individual Animated Photo with Narration

### **Step 1: Voice Cloning & TTS**

**Requirements:**
- Clone user's voice from sample audio
- Generate natural-sounding TTS from story text
- Output: Audio file (MP3/WAV) synced to story

**Options:**
1. **ElevenLabs Voice Cloning** (Recommended)
   - High quality, natural voices
   - API available
   - Good for cloning from sample

2. **Google Cloud Text-to-Speech** (with voice cloning)
   - Integrated with Gemini ecosystem
   - Requires voice training data

3. **OpenAI TTS** (no cloning, but good quality)
   - Fallback if cloning not available

**Implementation:**
```typescript
// src/app/api/voice/clone/route.ts
POST /api/voice/clone
Body: {
  audioSample: File, // User's voice sample
  text: string,       // Story to narrate
  voiceSettings?: {...}
}
Response: {
  audioUrl: string,
  duration: number
}
```

**Voice Sample Collection:**
- Record user reading a sample text (30-60 seconds)
- Store voice profile
- Use for all future TTS generation

### **Step 2: Photo Animation (VEO 3)**

**Requirements:**
- Subtle animation (like Live Photos)
- No animation of minors (safety filter)
- Minimal movement (pan, zoom, subtle motion)

**VEO 3 Considerations:**
- Check for minors in photo before animation
- Use minimal animation prompts
- Focus on environmental movement (water, leaves, etc.) not people

**Implementation:**
```typescript
// src/app/api/animate-photo/route.ts
POST /api/animate-photo
Body: {
  photoUrl: string,
  storyText: string,
  animationStyle: 'subtle' | 'minimal',
  checkMinors: true
}
Response: {
  animatedVideoUrl: string,
  duration: number,
  hasMinors: boolean
}
```

**Animation Prompts for VEO 3:**
- "Subtle, minimal movement - like a gentle breeze"
- "Slight pan across the scene, very slow"
- "Environment only - no people movement"
- "Live Photo style - barely noticeable motion"

### **Step 3: Combine Audio + Video**

**Requirements:**
- Sync TTS audio with animated video
- Match durations
- Create final animated photo with narration

**Implementation:**
```typescript
// src/app/api/create-animated-story/route.ts
POST /api/create-animated-story
Body: {
  photoId: string,
  storyId: string,
  voiceProfileId: string
}
Response: {
  animatedStoryUrl: string,
  duration: number,
  audioUrl: string,
  videoUrl: string
}
```

**Process:**
1. Generate TTS audio from story
2. Animate photo with VEO 3
3. Sync audio to video
4. Combine into final video
5. Store result

---

## 📚 Phase 2: Album System

### **Album Data Model**

```typescript
interface Album {
  id: string;
  title: string;
  description?: string;
  coverPhotoId?: string;
  photoIds: string[]; // Ordered list
  createdAt: number;
  updatedAt: number;
}

interface AnimatedPhoto {
  id: string;
  photoId: string;
  storyId: string;
  animatedVideoUrl: string;
  audioUrl: string;
  duration: number;
  voiceProfileId: string;
  narratorName?: string; // For multi-voice albums
  createdAt: number;
}
```

### **Album Management**

**Manual Creation:**
- User creates album
- Adds photos to album
- Reorders photos
- Sets cover photo

**API:**
```typescript
POST /api/albums (create)
GET /api/albums (list)
GET /api/albums/:id (get album)
PUT /api/albums/:id (update)
POST /api/albums/:id/photos (add photo)
PUT /api/albums/:id/photos/order (reorder)
```

---

## 🎞️ Phase 3: Timeline Editor & Stitching

### **Timeline Editor UI**

**Features:**
- Drag-and-drop photo ordering
- Visual timeline (like video editing software)
- Preview individual segments
- Adjust transitions
- Toggle narrator voices
- Edit combined narration

**UI Components:**
```
┌─────────────────────────────────────────┐
│ Timeline Editor: "Bangka Trip 2005"    │
├─────────────────────────────────────────┤
│ [Photo 1] [Photo 2] [Photo 3] [Photo 4]│
│  5s       8s       6s       7s          │
│                                         │
│ Narrator: [You ▼] [You ▼] [Mom ▼] [You]│
│                                         │
│ [Preview] [Generate Full Story]        │
└─────────────────────────────────────────┘
```

### **Stitching Process**

**Step 1: Context-Aware Story Merging**
- Combine multiple stories from album
- Create cohesive narrative
- Maintain chronological flow
- Preserve important details

**Step 2: Multi-Voice Narration**
- Generate narration for each segment
- Use appropriate voice (toggle between narrators)
- Smooth transitions between voices
- Natural flow

**Step 3: Video Stitching**
- Combine animated videos in order
- Add transitions between segments
- Sync audio narration
- Create final video

**Implementation:**
```typescript
// src/app/api/albums/:id/stitch/route.ts
POST /api/albums/:id/stitch
Body: {
  photoOrder: string[],
  narratorMap: { [photoId: string]: string }, // Which voice for each photo
  generateNewNarration: boolean, // Create new combined story
  transitionStyle: 'fade' | 'cut' | 'crossfade'
}
Response: {
  stitchedVideoUrl: string,
  duration: number,
  narration: string
}
```

---

## 🔧 Technical Implementation

### **Voice Cloning Setup**

1. **Collect Voice Sample**
   ```typescript
   // Record user reading sample text
   const voiceSample = await recordAudio(sampleText);
   // Upload to voice cloning service
   const voiceProfile = await cloneVoice(voiceSample);
   ```

2. **Generate TTS**
   ```typescript
   // Use cloned voice for story narration
   const audio = await generateTTS(storyText, voiceProfile);
   ```

### **VEO 3 Animation**

1. **Check for Minors**
   ```typescript
   const hasMinors = await detectMinors(photo);
   if (hasMinors) {
     // Skip animation or animate environment only
     return animateEnvironmentOnly(photo);
   }
   ```

2. **Minimal Animation Prompt**
   ```typescript
   const prompt = `
     Create a subtle, minimal animation of this photo.
     - Very slow, gentle movement
     - Focus on environmental elements (water, leaves, clouds)
     - No movement of people
     - Like a Live Photo - barely noticeable
     - Duration: ${storyDuration} seconds
   `;
   ```

3. **Animate**
   ```typescript
   const animatedVideo = await veo3.animate(photo, prompt);
   ```

### **Video Stitching**

1. **Combine Videos**
   ```typescript
   // Use FFmpeg or video processing library
   const stitchedVideo = await combineVideos(
     animatedVideos,
     transitions,
     audioTracks
   );
   ```

2. **Sync Audio**
   ```typescript
   // Match audio to video segments
   const syncedAudio = await syncAudioToVideo(
     narrationAudio,
     videoSegments
   );
   ```

---

## 📊 Data Flow

### **Individual Animated Photo**
```
Story Generated
    ↓
Voice Cloned (one-time setup)
    ↓
TTS Generated (from story)
    ↓
Photo Animated (VEO 3)
    ↓
Audio + Video Combined
    ↓
Animated Photo with Narration
    ↓
Stored in Database
```

### **Album Stitching**
```
Album Created (manual)
    ↓
Photos Added to Album
    ↓
Timeline Editor (manual ordering)
    ↓
Narrator Selection (per photo)
    ↓
Context-Aware Story Merging
    ↓
Multi-Voice Narration Generated
    ↓
Videos Stitched Together
    ↓
Final Album Video
```

---

## 🎨 UI/UX Flow

### **Creating Animated Photo**
1. User generates story
2. System prompts: "Record your voice sample (30 seconds)"
3. User records sample
4. Voice cloned
5. TTS generated from story
6. Photo animated (VEO 3)
7. Combined into animated photo
8. User can preview and save

### **Creating Album**
1. User creates new album
2. Adds animated photos to album
3. Reorders photos (drag-and-drop)
4. Sets cover photo
5. Saves album

### **Stitching Album**
1. User opens album in timeline editor
2. Sees all photos in timeline
3. Reorders if needed
4. Selects narrator for each photo (if multiple voices)
5. Clicks "Generate Full Story"
6. System:
   - Merges stories into cohesive narrative
   - Generates multi-voice narration
   - Stitches videos together
7. User previews final video
8. User saves/downloads

---

## 🔐 Safety & Compliance

### **Minor Detection**
- Check photos before animation
- If minors detected:
  - Skip animation OR
  - Animate environment only (no people movement)
  - Warn user

### **Voice Cloning**
- Get user consent for voice cloning
- Store voice profile securely
- Allow user to delete voice profile

---

## 📝 API Endpoints Needed

### **Voice**
- `POST /api/voice/sample` - Upload voice sample
- `POST /api/voice/clone` - Clone voice from sample
- `POST /api/voice/tts` - Generate TTS with cloned voice
- `DELETE /api/voice/profile/:id` - Delete voice profile

### **Animation**
- `POST /api/animate-photo` - Animate photo with VEO 3
- `GET /api/animate-photo/:id/status` - Check animation status
- `POST /api/animate-photo/check-minors` - Check for minors

### **Animated Stories**
- `POST /api/animated-stories` - Create animated story
- `GET /api/animated-stories/:id` - Get animated story
- `DELETE /api/animated-stories/:id` - Delete

### **Albums**
- `POST /api/albums` - Create album
- `GET /api/albums` - List albums
- `GET /api/albums/:id` - Get album
- `PUT /api/albums/:id` - Update album
- `POST /api/albums/:id/photos` - Add photo to album
- `PUT /api/albums/:id/photos/order` - Reorder photos
- `DELETE /api/albums/:id/photos/:photoId` - Remove photo

### **Stitching**
- `POST /api/albums/:id/stitch` - Stitch album into video
- `GET /api/albums/:id/stitch/status` - Check stitching status
- `POST /api/albums/:id/narration` - Generate combined narration

---

## 🚀 Implementation Priority

### **Phase 1: Foundation** (Now)
1. Voice cloning setup (ElevenLabs or Google TTS)
2. VEO 3 animation integration
3. Basic animated photo creation
4. Minor detection

### **Phase 2: Albums** (Next)
1. Album data model
2. Album CRUD operations
3. Photo management in albums
4. Basic album UI

### **Phase 3: Stitching** (Later)
1. Timeline editor UI
2. Context-aware story merging
3. Multi-voice narration
4. Video stitching
5. Final video generation

---

## 💡 Key Considerations

1. **Voice Cloning Quality**: Need good quality for natural sound
2. **VEO 3 Limitations**: Handle minor detection gracefully
3. **Animation Subtlety**: Keep it minimal, not distracting
4. **Timeline Editor**: Make it intuitive (like video editing apps)
5. **Story Merging**: AI needs to create cohesive narrative from multiple stories
6. **Multi-Voice**: Smooth transitions between different narrators

---

This plan gives you a complete system for creating animated photo albums with voice narration, and stitching them into full story videos. The timeline editor gives you control over the final product, while AI handles the heavy lifting of story merging and narration generation.
