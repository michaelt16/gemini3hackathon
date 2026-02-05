# Living Memory - Hackathon Recap

> **For**: ChatGPT discussion / context handoff  
> **Hackathon**: Google Gemini 3 Hackathon, 50k prizepool, 4 winning spots, 30k+ submissions  
> **Time left**: ~5 days

---

## Project Summary

**Living Memory** turns family photos into narrated memory films. Users capture photos, talk to EVA (AI companion) via Gemini Live to add context/stories, then generate animated videos with AI narration. Think: Remento (books for family stories) meets AI-powered video.

**Core flow**: Photo → EVA conversation (Gemini Live) → Story extraction → Animate (Veo 3/Grok) → Timeline → Export video

---

## What's Been Done ✅

### Core MVP
- Next.js 14 App Router, Supabase, Tailwind
- Album list page, album editor with timeline
- Photo upload, media pool, drag-drop timeline
- Nano Banana crop (Gemini vision) for photo extraction
- Veo 3 + Grok Imagine for photo animation
- AI narration generation (Gemini), editable per clip
- Video export pipeline (stitches animated clips + narration)
- Film Ready badge for exported albums

### EVA (AI Companion)
- Named "EVA" throughout, aurora orb UI, Gemini-style glow
- Capture modal: camera/gallery + Gemini Live conversation
- Intro page: cinematic flow with Live API voice (Kore), typewriter text, vintage photo scene (pic1-9)
- Tutorial: multi-step guided flow (intro → album → capture → edit → export → album list)
- EVA orb on album list + album editor pages

### Polish & Fixes
- Loading screens updated to EVA futuristic style (orb, gradient, ambient glow)
- Intro "Memories fade" scene: real photos (pic1-9) instead of gradient rectangles
- Scene/text timing: 800ms delay in Live API `onTurnComplete` before advancing
- Logo: livingmemory.png, sizing reverted to w-20/h-20 etc.
- WebSocket reconnect issues fixed (per user)
- Timing bugs fixed (per user)

### Infrastructure
- `voice-service.ts` exists with ElevenLabs (`cloneVoice`, `generateTTS`) - not wired to UI
- Narration audio uses Google Cloud TTS (en-US-Studio-O)
- Schema has `voice_clone_id` fields ready

---

## What Needs to Be Done 🔲

### High Priority (Hackathon)
1. **Demo mode** — Preloaded album + "Try demo" button so judges never hit empty states
2. **Better question quality** — Prompt engineering: observation-based questions ("I see candles on a cake - whose birthday?") instead of generic "Do you remember?"
3. **Voice cloning** (optional, 1 day) — ElevenLabs integration: upload sample → clone → use for narration. `voice-service.ts` already has the API calls.

### Medium Priority
4. **Fallback messaging** — If Live API fails: "EVA is connecting..." or graceful degradation
5. **200-word Gemini integration writeup** — Required submission: which Gemini 3 features, how central
6. **3-minute demo video** — User has video editing experience, going hard on it

### Deferred (Post-hackathon)
- Knowledge base (RAG, cross-album context)
- Multi-user / collaboration
- Voice cloning consent workflow

---

## Hackathon Rubric & Self-Assessment

| Criterion | Weight | Est. Score | Notes |
|----------|--------|------------|-------|
| Technical Execution | 40% | 32-35/40 | Strong Gemini use (Live, vision, Veo, TTS). Some polish needed. Codebase large (2700+ line page) |
| Potential Impact | 20% | 14-16/20 | Real problem (memory loss). Niche but meaningful. Remento comparison |
| Innovation / Wow | 30% | 22-25/30 | EVA companion, live capture, gift/export angle. Not radically new |
| Presentation | 10% | 6-8/10 | Depends on video + demo quality |

**Overall**: ~74-84/100. Competitive but top 4 is tough with 30k submissions.

---

## Strategic Discussion Summary

### Positioning
- **Lead with**: "Preserve family stories while people are still here"
- **Remento**: "They proved the need. We're the AI-native version—voice, video, scale"
- **Black Mirror / creepiness**: Don't lead with it. Acknowledge if asked: "We're inspired by that conversation, but focused on helping families with consent and control"

### Tone for Video
- **Recommended**: Warm, hopeful, human-centered
- **Avoid**: Leaning into creepiness for shock value (can backfire)
- **If asked**: "We know this touches something deep—memory, loss, legacy. We're building it with care"

### Wow Factor Angles
- Gift: "Export a memory film and give it as a gift"
- Older users: "For grandparents who want to leave something behind"
- Export: "Not just an app—a video you can share and pass down"

### Technical Notes
- WebSocket/reconnect: User says fixed
- Timing: User says fixed
- Demo fragility: Unknown—demo mode would de-risk
- Codebase size: Acknowledge if asked; refactor is post-hackathon

---

## Gemini 3 Features Used

- **Gemini Live API**: EVA voice (intro, capture, tutorial), real-time conversation
- **Gemini Vision**: Nano Banana crop, image analysis
- **Veo 3**: Photo-to-video animation
- **Gemini TTS** (or Google Cloud): Narration audio for exported videos
- **Gemini (text)**: Narration script generation, story extraction

---

## Files to Know

- `src/app/(main)/album/[eventId]/page.tsx` — Album editor (2700+ lines)
- `src/app/intro/page.tsx` — Cinematic intro
- `src/components/CaptureModal.tsx` — EVA capture flow
- `src/lib/gemini-live.ts` — Live API client
- `src/lib/voice-service.ts` — ElevenLabs (exists, not wired)
- `FINAL_PROJECT_PLAN.md` — Full project plan

---

## Open Questions for ChatGPT

1. How to structure the 3-minute video for maximum impact?
2. Demo mode: best UX for "Try demo" with preloaded data?
3. Voice cloning: worth 1 day given 5 days left?
4. Better questions: specific prompt changes for observation-based EVA?
5. 200-word writeup: template or structure for Gemini integration description?
