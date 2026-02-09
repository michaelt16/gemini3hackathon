# Living Memory — Live Presentation Script

> **Duration**: ~3:15 | **Tone**: Personal, then confident, end emotional
> **Format**: Live demo presentation with screen sharing
> **Rule**: Lead with the heart. Prove with the tech. Close with the gut punch.

---

## [0:00–0:25] THE HOOK

> We have billions of photographs. And almost zero context.
>
> Who's in them? Why did they matter? What happened the moment after
> the shutter clicked? The answers are locked in human brains — and
> human brains have an expiration date. We lose 150,000 of them every day.
>
> That's not data loss. That's extinction.
>
> We built Living Memory so that when someone's finally ready to tell
> the story... something is ready to listen.

**[CLICK: Show Living Memory landing page]**

---

## [0:25–0:50] WHAT IT IS + EVA

> Living Memory turns your family's old photographs into narrated,
> animated films — using nothing but your voice and Google's AI.
>
> At the center of everything is EVA — your AI memory companion.
> She's powered by Gemini Live. You don't fill out forms. You don't
> type captions. You just... talk to her. Show her a photo. Tell her
> the story. She listens, she remembers, and she never forgets.

**[SHOW: EVA orb on screen — let it pulse for a beat]**

---

## [0:50–1:20] CAPTURE — "Show me your photographs"

> Here's how it starts. You have old photos — in a shoebox, in a frame
> on the wall, on your phone. Open the capture modal and just point
> your camera at a physical photograph.
>
> EVA detects the photo in real time — finds the edges, waits for you
> to hold still, and captures it automatically. Then Gemini's native
> image generation — we call it Nano Banana — extracts just the photo.
> Removes your fingers, the frame, the background. Gives you a clean,
> digital scan. From a phone camera.

**[DEMO: Show capture flow — camera detecting photo, auto-capture, Nano Banana extraction]**

---

## [1:20–1:50] REMEMBER — "Tell me what happened"

> Now the magic. Once the photo is captured, EVA starts a conversation.
> Through Gemini Live — real-time, multimodal — she can see the photo
> and talk to you at the same time.
>
> "Who's holding you in this photo?" "What was that day like?"
> "Why does this one matter to you?"
>
> You just talk. She extracts the facts — who, what, when, where, why —
> and weaves them into a story. No typing. No forms. Just a conversation
> between you and an AI that genuinely understands what it's looking at.

**[DEMO: Show a photo conversation — EVA asking questions, transcript appearing, fact extraction]**

---

## [1:50–2:20] ANIMATE — "Watch it come alive"

> This is where people's jaws drop.
>
> Take any static photograph and bring it to life. We integrated
> Google's VEO 3 for cinematic animation — real, natural motion from
> a still image.
>
> But we didn't stop there. Before animating, you can transform photos
> into entirely new art styles — Disney Pixar, Studio Ghibli,
> anime — using Gemini's image generation. Then animate the result.
> Your grandmother's wedding photo, reimagined as a Ghibli painting,
> coming to life.

**[DEMO: Show before/after — static photo → animated video. Show a style transfer if time allows. This is your WOW moment — let the animation play for 3-4 seconds.]**

> We also integrated Grok Imagine from xAI as a second animation engine —
> it's faster and handles family photos with children, where VEO 3 has
> content restrictions.

---

## [2:20–2:45] PRESERVE + CREATE — "Your voice. Your story."

> Here's what makes this personal.
>
> Upload a short voice sample — thirty seconds — and we clone your voice
> using ElevenLabs. When it's time to narrate, your family's story isn't
> told by some generic AI voice. It's told by grandma. In her voice. Forever.
>
> You arrange your photos in our timeline editor — drag, drop, reorder.
> Then Gemini generates narration that's fully context-aware. It sees every
> photo. It reads every conversation you've had about them. It knows who's
> in each frame and how they connect. Move a childhood photo before a wedding
> and the narration rewrites itself to bridge them naturally.

**[DEMO: Show editor timeline with photos. Show "Generate Narration" → narration text appears. Play a clip with voice narration if available.]**

---

## [2:45–3:00] EXPERIENCE — "Four ways to remember"

> And you experience these memories in multiple ways.
>
> A cinematic storybook with auto-playing narration and subtitles.
> A reading mode — like turning pages of a book.
> A polaroid scrapbook with tape and handwritten dates.
> Or a full cinema view with a film strip carousel.
>
> Every family member joins with a code, adds their own perspective,
> asks questions, answers them. Mom remembers the laughter. Dad
> remembers the drive. EVA weaves every voice into one complete story.

**[DEMO: Quick flash of Storybook watch mode → Scrapbook → Cinema view. 2-3 seconds each. Speed sells here.]**

---

## [3:00–3:20] CLOSE — The gut punch

> We built this in [X days] for the Gemini hackathon. Under the hood:
> Gemini 2.0 Flash for vision and story generation. Gemini Live for
> real-time voice. VEO 3 for animation. Gemini's native image output
> for photo extraction. Plus ElevenLabs, Grok, and Supabase.
>
> But here's what actually matters.
>
> **[Slow down. Look at the audience.]**
>
> Somewhere right now, someone's grandmother is holding a photograph
> and remembering a story that nobody else knows. That story has maybe
> five years. Maybe five months.
>
> Living Memory exists so that when she's ready to tell it...
> something is ready to listen.
>
> Thank you.

---

## TECH SUMMARY SLIDE (have ready if judges ask)

| Technology | What it does in Living Memory |
|---|---|
| **Gemini 2.0 Flash** | Photo understanding, story generation, fact extraction, style transfer |
| **Gemini Live** | Real-time voice conversations with EVA (sees photos + talks simultaneously) |
| **Gemini Native Image Output** | "Nano Banana" — extracts clean photos from messy camera captures |
| **VEO 3** | Transforms static photographs into cinematic animated video |
| **Grok Imagine (xAI)** | Alternative animation engine, handles content restrictions |
| **ElevenLabs** | Voice cloning — narrate in your family's actual voices |
| **Google Cloud TTS** | Fallback narration when no voice clone exists |
| **Supabase** | Auth, database, file storage |
| **Next.js + Remotion** | Frontend framework + video export pipeline |

---

## PRESENTATION TIPS

1. **The hook is everything.** Memorize the first 25 seconds cold. Don't read it. Say it like you mean it.
2. **One demo failure is fine.** If capture doesn't work live, have a pre-recorded clip ready. Never apologize — just say "let me show you what this looks like" and play the video.
3. **The animation is your WOW moment.** When VEO 3 plays, stop talking. Let the judges react. Silence sells.
4. **The close is the second hook.** Slow down. Make eye contact. The last 15 seconds should feel like a different conversation — not a pitch, but a truth.
5. **If you go over 3 minutes**, cut the "Four ways to experience" section. It's the most skippable. Keep the hook and the close at all costs.
6. **Have a backup plan**: Pre-record a 30-second clip of the full capture → animate → narrate flow. If anything breaks live, you play this and keep talking.
