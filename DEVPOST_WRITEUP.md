# Living Memory

## Inspiration

We have billions of photographs. And almost zero context.

Who's in them? Why did they matter? What happened the moment after the shutter clicked? The answers to these questions aren't stored in any cloud — they're locked inside human brains. And human brains have an expiration date. We lose roughly 150,000 people every day, and with them go irreplaceable stories that no amount of storage can recover.

We started this project because one of us tried to ask about an old family photo and realised the only person who knew the story had already passed. That moment hit hard. It wasn't data loss — it felt like extinction. We looked at the tools available and saw plenty of photo storage apps, plenty of AI caption generators, but nothing that actually *sat down and listened* while someone told the story behind a photograph.

When we saw what Gemini Live could do — real-time, multimodal conversation where the AI can *see* an image and *talk* about it simultaneously — we knew we could build something that felt less like software and more like a patient, curious family member who never forgets.

## What it does

Living Memory turns your family's old photographs into narrated, animated films — using nothing but your voice and Google's AI.

At the centre of the experience is **EVA** — your AI memory companion, powered by Gemini Live. You don't fill out forms. You don't type captions. You just show her a photo and tell her the story. She asks follow-up questions — *"Who's holding you in this photo?" "What was that day like?" "Why does this one matter to you?"* — and she remembers everything.

Here's the full flow:

1. **Capture** — Point your phone camera at a physical photograph (in a shoebox, on the wall, wherever). EVA detects the photo in real-time, finds the edges, waits for you to hold still, and captures it automatically. Then Gemini's native image generation extracts just the photo — removing your fingers, the frame, the background — giving you a clean digital scan from a phone camera.

2. **Remember** — EVA starts a real-time voice conversation about the photo. She can see it and talk about it simultaneously. You just talk. She extracts the facts — who, what, when, where, why — and weaves them into a story. No typing. No forms.

3. **Animate** — Take any static photograph and bring it to life. VEO 3 generates cinematic animation — real, natural motion from a still image. You can even transform photos into entirely new art styles (Disney Pixar, Studio Ghibli, anime) before animating them. Your grandmother's wedding photo, reimagined as a Ghibli painting, coming to life.

4. **Preserve** — Upload a 30-second voice sample and we clone the voice using ElevenLabs. Your family's story isn't told by a generic AI voice — it's told by grandma, in her voice, forever. Gemini generates narration that's fully context-aware: it sees every photo, reads every conversation, knows who's in each frame and how they connect.

5. **Experience** — View your memories in multiple ways: a cinematic storybook with auto-playing narration and subtitles, a reading mode like turning book pages, a polaroid scrapbook with tape and handwritten dates, or a full cinema view with a film strip carousel. Family members join with a code, add their own perspectives, and EVA weaves every voice into one complete story.

## How we built it

**Gemini is the backbone.** We used four different Gemini capabilities:

- **Gemini 2.0 Flash** for photo understanding, story generation, fact extraction, and style transfer
- **Gemini Live API** for real-time multimodal voice conversations with EVA (she sees photos and talks simultaneously via WebSocket-based bidirectional audio streaming)
- **Gemini Native Image Output** (we nicknamed it "Nano Banana") for extracting clean photos from messy camera captures
- **VEO 3** for transforming static photographs into cinematic animated video clips (4–8 seconds each)

**The rest of the stack:**

- **Next.js** (App Router) as our frontend framework, deployed on **Vercel**
- **Supabase** for authentication, PostgreSQL database, and file storage
- **ElevenLabs** for voice cloning so families can narrate in their own voices
- **Google Cloud TTS** as a fallback when no voice clone exists
- **Grok Imagine (xAI)** as a second animation engine — it's faster and handles family photos with children where VEO 3 has content restrictions
- **face-api.js** and **TensorFlow.js** for client-side face detection and recognition
- **Remotion** for the video export/stitching pipeline

All AI API calls happen server-side through Next.js API routes — keys are never exposed to the client. Long-running tasks like animation and video stitching use a job-based processing system with a `jobs` table and polling. The data model is event-based: facts, timelines, and people entities are stored at the event level so context compounds across photos and conversations.

## Challenges we ran into

- **Gemini Live's multimodal orchestration** was the biggest technical challenge. Getting real-time bidirectional audio streaming working reliably through WebSockets — where EVA can simultaneously see a photo and carry on a natural voice conversation — required careful buffer management, audio playback queuing, and fallback handling across multiple model variants.

- **VEO 3 content restrictions** caught us off guard. Family photos often include children, and VEO 3's safety filters would reject these. We had to integrate Grok Imagine from xAI as a second animation engine specifically to handle these cases, essentially building a dual-engine animation pipeline with intelligent routing.

- **Photo extraction quality** was a rabbit hole. Getting Gemini's native image generation to reliably remove fingers, picture frames, and uneven lighting from phone-camera captures of physical photos required extensive prompt engineering and iterative refinement. We landed on a technique we call "Nano Banana" that works surprisingly well.

- **Context-aware narration at scale** was harder than expected. When you have 10+ photos with conversations, people entities, and extracted facts, generating narration that weaves a coherent story — and *rewrites itself* when you reorder photos — required carefully structured prompts that feed Gemini the full knowledge graph without exceeding context limits.

- **Real-time photo detection on mobile** — finding photo edges in a camera viewfinder, waiting for the user to hold still, and auto-capturing at the right moment — needed careful tuning of detection thresholds and debouncing to feel responsive without being trigger-happy.

## Accomplishments that we're proud of

- **EVA feels genuinely magical.** Showing someone a 40-year-old photo and having an AI companion ask thoughtful questions about it in real-time voice — and then watching their face when they realise she *remembers* the context across photos — that's the moment we knew we'd built something meaningful.

- **The animation "jaw-drop" moment.** When a static photograph of someone's grandparents suddenly comes to life with natural, cinematic motion through VEO 3, people go silent. That reaction never gets old.

- **The end-to-end pipeline actually works.** From pointing a phone camera at a physical photo in a shoebox, through voice conversation, fact extraction, animation, voice-cloned narration, to a finished cinematic film — the entire pipeline runs. That's a lot of AI services orchestrated together.

- **Voice cloning makes it personal.** When people hear their grandmother's cloned voice narrating the family story over animated photos, it stops being a tech demo and becomes something deeply emotional. That's exactly what we wanted.

- **Making it accessible.** No typing, no forms, no technical knowledge required. A grandparent can literally hold up a photo and start talking. The technology disappears behind the conversation.

## What we learned

- **Gemini Live is a paradigm shift.** Real-time multimodal AI conversation — where the model sees and talks simultaneously — unlocks interaction patterns that simply weren't possible before. It changes what "using AI" feels like from a transactional prompt-response to something that feels like a genuine conversation.

- **Multiple AI services need graceful fallbacks.** Relying on a single provider for everything is fragile. VEO 3's content restrictions taught us to always have a Plan B (and sometimes Plan C). Building a dual-engine animation system made the product significantly more robust.

- **Context compounds.** The most powerful thing about Living Memory isn't any single feature — it's that every conversation makes every subsequent interaction smarter. EVA knowing that "the woman in this photo is the same woman from the wedding photo, and she's your grandmother" transforms the quality of the narration.

- **Prompt engineering is product design.** The difference between EVA feeling like a chatbot and EVA feeling like a patient, curious family member came down entirely to prompt design. We spent as much time on prompts as on code.

- **Emotion is a feature.** We kept optimising for the moment people got quiet — not when they said "cool", but when they went silent looking at an animated photo of someone they'd lost, narrated in a familiar voice. That silence is the product working.

## What's next for Living Memory

- **Multi-contributor stories** — Full support for family members joining events with a code and adding their perspectives. Mom remembers the laughter, Dad remembers the drive home, and EVA weaves every voice into one complete story.

- **Person-based knowledge graph** — Building out a persistent knowledge base where EVA accumulates facts about people across events and conversations. She'll know your grandmother's story not just from one photo, but from every photo she's ever appeared in.

- **Face recognition with pgvector** — Moving face embeddings from client-side localStorage to PostgreSQL with pgvector for persistent, cross-device face recognition. Upload a photo anywhere and EVA already knows who everyone is.

- **Video stitching and export** — Full Remotion-powered pipeline to export finished films as shareable MP4s — a complete family documentary you can send to relatives or play at gatherings.

- **Story completeness scoring** — EVA will know when a photo's story is "complete" vs. when important gaps remain, and proactively prompt family members to fill them before the context is lost.

- **Collaborative family vaults** — Shared spaces where extended families can contribute photos and stories across generations, building a living, growing archive that gets richer over time.

- **Mobile-native app** — Bringing the capture experience to a dedicated mobile app for even smoother photo scanning and voice conversations on the go.

The ultimate vision: every family has a Living Memory — a place where the stories behind the photos are preserved, animated, and narrated in the voices of the people who lived them. Not just storage. Not just AI captions. A living, breathing memory that grows with every conversation.

---

## Try it out — Testing Instructions

### Getting Started

When you first land on Living Memory, you'll see the homepage with a video hero section and two options:

- **"Get started"** — Takes you through EVA's intro tutorial (recommended for first-time experience)
- **"Sign in"** — Skips straight to login if you want to jump in quickly

---

### Path 1: The EVA Intro (Recommended)

Click **"Get started"** to begin EVA's guided introduction.

1. **Meet EVA** — A cinematic intro sequence plays where EVA introduces herself through voice narration powered by Gemini Live. She walks you through the concept — capturing photos, having conversations about them, animating them, and preserving the stories. You can **skip** at any time if you'd prefer to jump ahead.

2. **Name yourself** — After the intro, EVA asks *"What should I call you?"*. Enter your name (and optionally a family invite code if someone has shared one with you). This creates your profile.

3. **Create your first album** — EVA asks if you'd like to preserve some memories. Choose:
   - **"Let's preserve some memories"** — You'll be prompted to name your first album (e.g. "Christmas 1985", "Grandma's Photos"). EVA creates the album and drops you into the **Album Editor** with a guided tutorial.
   - **"I'll just browse"** — Skips album creation and takes you to the main Albums page.

---

### Path 2: Quick Login (Pre-existing Accounts)

Click **"Sign in"** from the homepage to go to the profile selection screen.

You'll see pre-existing family member profiles to choose from:

| Profile | Role | Colour |
|---------|------|--------|
| **Michael** | Son | Purple |
| **James** | Father | Blue |
| **Susan** | Mother | Pink |
| **William** | Grandfather | Green |

Click any profile to log in as that family member. You'll be taken straight to the **Albums page** with any albums and photos already associated with that account.

You can also click **"Add Profile"** from this screen, which takes you through the EVA intro flow (Path 1).

> **Tip:** Try logging in as different family members to see how multi-contributor perspectives work — each member can add their own stories and memories to the same album.

---

### Once You're In — Core Features to Test

#### Albums Page

The main hub. You can switch between three views using the toggle at the top:

- **Cinema Mode** (default) — Full-screen featured album with a Netflix-style carousel
- **Grid Mode** — Card-based grid layout
- **Timeline Mode** — Chronological timeline by year

Click **"Create New Album"** to make a new album, or click an existing album to open it.

#### Capture Mode (Adding Photos)

From inside an album, click the **EVA orb** (bottom-right corner) to open the capture modal.

1. **Grant camera access** when prompted
2. **Hold a physical photo** in front of your camera — EVA detects the photo edges in real-time
3. **Hold still** — she auto-captures when the photo is steady
4. **Nano Banana extraction** — Gemini's native image generation removes your fingers, the frame, and background, giving you a clean digital scan
5. **Conversation** — EVA starts a voice conversation about the photo through Gemini Live. Just talk naturally — tell her who's in the photo, what was happening, why it matters. She extracts the facts automatically.

> **Note:** Capture works best on mobile or a device with a camera. Have a printed photo or a photo on a second screen ready to scan.

#### Album Editor

From an album page, click **"Editor"** to open the timeline editor.

- **Drag and drop** photos to reorder them in your timeline
- **Animate** — Select a photo and choose an animation engine:
  - *VEO 3* for cinematic animation
  - *Grok Imagine* for faster animation (also handles photos with children)
  - *Subtle Animation* for free CSS-based Ken Burns effects
- **Style Transfer** — Transform photos into art styles (Disney Pixar, Studio Ghibli, Anime) before animating
- **Generate Narration** — Click to have Gemini write context-aware narration across all your photos. Reorder photos and regenerate to see the narration adapt.
- **Voice** — If a voice clone is set up, narration plays in that family member's voice

#### Viewing Modes

From an album page, you can experience the memories in four ways:

- **Storybook (Watch)** — Cinematic auto-playing narration with subtitles
- **Storybook (Read)** — Page-turning reading mode
- **Scrapbook** — Polaroid-style layout with tape and handwritten dates
- **Cinema** — Full-screen view with film strip carousel

#### Other Pages

- **Feed** — Activity feed showing what family members have been doing (photos added, stories recorded, animations created)
- **Questions** — AI-generated questions about photos that family members can answer to add more context
- **Profile** — Edit your name, avatar colour, and voice clone settings

---

### Switching Users

You can switch between family members at any time using the **"Switch"** link at the bottom of the left sidebar. This takes you back to the profile selection screen so you can log in as a different family member and add their perspective to the same albums.

---

### Built With

`gemini` `gemini-live` `veo-3` `google-cloud` `next.js` `react` `supabase` `elevenlabs` `grok` `tensorflow.js` `face-api.js` `remotion` `vercel` `tailwind-css`
