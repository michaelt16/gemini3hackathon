# Gemini Live – Prompts & Triggers (Capture Page)

Reference for all pre-placed prompts and triggers used with the Gemini Live API on the capture session page. Adjust these in code to change behavior.

---

## 1. System instruction (when connecting)

**Where:** `src/app/(main)/capture/[eventId]/page.tsx` → `buildSystemInstruction()`

**When:** Sent once when the user clicks "Start Session" and the Live client connects.

**Content (base):**
```
You are a warm, empathetic AI helping preserve precious family memories. You're like a trusted friend who genuinely cares about the stories behind old photographs.

Your personality:
- Warm, curious, and genuinely interested
- Speak naturally and conversationally
- Be observant about details in photos
- Ask thoughtful follow-up questions to build the story

CRITICAL BEHAVIORS:
1. Always ask follow-up questions - don't just acknowledge, dig deeper
2. Ask about emotions and significance - "What made that moment special?"
3. Ask about context - Who else was there? What happened before/after?
4. Keep responses BRIEF (2-3 sentences max) but always end with a question

When the user captures a photo, acknowledge it and ask about the specific details you can see. Help them tell the complete story.
```

**Added when event context exists:**
- Event/Album: `{albumContext.title}`
- Date: `{albumContext.date}`
- Location: `{albumContext.location}`
- People involved: `{albumContext.people}` (currently empty array)
- If `existingPhotos.length > 0`: line about "You already know about N photo(s)…"
- If `existingStories.length > 0`: "Previous stories captured:" plus snippets
- Closing line: "Use this context to ask more informed questions…"

**Code:** Lines ~624–682 in the same file.

---

## 2. On-connect context (optional)

**Where:** Same file, inside `onConnect` of the Live client (around line 715).

**When:** Right after connection, only if `albumContext.existingPhotos.length > 0` (currently always 0).

**Message:**
```
I'm working on the "{albumContext.title}" event. I've already captured {albumContext.existingPhotos.length} photos from this event. As we look at new photos, help me see how they connect to the overall story of this event.
```

**Code:** `client.sendContext(contextMessage)`.

---

## 3. First assistant message (on connect)

**Where:** Same file, `onConnect` (around line 722).

**When:** Right after connection.

**Content:**
```
I'm ready to help preserve your memories. Turn on the camera and show me your photos — I'll help you capture the stories behind them.
```

**Code:** `setMessages([{ role: 'assistant', content: "I'm ready to help...", ... }])`.

---

## 4. Trigger when a photo is captured by scan

**Where:** Same file, inside the scan capture `setTimeout` (around line 499).

**When:** After a photo is successfully detected and added to the list (from scan mode).

**Sent to Live API:**
```
I just captured this photo. What do you see? Help me remember the story behind it.
```

**Code:** `liveClientRef.current.sendText("I just captured this photo. What do you see? Help me remember the story behind it.")`.

**Note:** The AI already sees the photo via the live video stream — no need to send the cropped image separately. The crop is for storage/album purposes.

---

## 5. Trigger when a photo is captured manually (button)

**Where:** Same file, `handleCapturePhoto` (around line 568).

**When:** User taps the manual capture button (not scan).

**Sent to Live API:**
```
I just captured this photo. Please look at it and help me remember the story behind it.
```

**Code:** `liveClientRef.current.sendText("I just captured this photo. Please look at it and help me remember the story behind it.")`.

---

## Summary table

| Trigger              | When                         | Method / location          | Text / behavior |
|----------------------|------------------------------|----------------------------|-----------------|
| System instruction   | On "Start Session"           | `buildSystemInstruction()` | Personality + event context |
| Optional context     | On connect, if photos exist  | `sendContext()`            | "I'm working on the … event. I've already captured N photos…" |
| First message        | On connect                   | `setMessages()`            | "I'm ready to help preserve your memories…" |
| After scan capture   | After one photo from scan    | `sendText()`               | "I just captured this photo. What do you see?…" |
| After manual capture | After manual capture button  | `sendText()`               | "I just captured this photo. Please look at it…" |

---

## Scan behavior (one at a time)

- After a photo is captured in scan mode, **scanning stops** and the status shows: "Photo saved. Tap Scan again for next photo."
- The user taps "Scan" again when ready for the next photo.
- This avoids repeated Nano Banana / extract calls and keeps one-photo-at-a-time flow.

---

## Nano Banana / cropping

**Is it used?** Yes. When a photo is captured (scan or manual), the app calls `extractCleanPhoto(frame)` → **POST /api/extract-photo** → `processScannedPhoto()` in `src/lib/image-processor.ts`.

**Flow:**
1. **Nano Banana** – `extractWithNanoBanana()` uses `gemini-2.0-flash-exp` and asks the model to "Extract and create a full-frame, clean version of ONLY the photograph itself" and return an image. If the model returns image parts, we use that.
2. **If Nano Banana returns null** (e.g. model doesn't return image, or errors) → fallback: **analyze photo** (bbox/perspective) → **crop or correct** with that analysis.
3. **If analysis/crop fails** → we use the **original frame** (no crop).

**Why you might see no cropping:**
- **Nano Banana:** `gemini-2.0-flash-exp` may not return `inlineData` image parts in your project (model/API behavior), so we often get `null` and fall back.
- **Fallback:** Bounding-box or analysis can fail ("Could not detect photo boundaries"); we then try a **center-crop fallback** (~70% × 62%, same as scan frame). If Sharp fails or that fails, we return the original image.
- **API errors:** If **POST /api/extract-photo** fails (e.g. 500), the client treats it as "extraction failed" and shows the **raw frame** in the list so you still see a photo, but it won't be cropped.

**Where to change extraction:**
- Nano Banana prompt: `src/lib/image-processor.ts` → `extractWithNanoBanana()` (around line 169).
- Fallback bbox/crop: same file → `getPhotoBoundingBox`, `analyzePhotoForExtraction`, `extractFullFrameWithCorrection`, `cropImageWithBoundingBox`.
- Client fallback (use raw frame when extract fails): `src/app/(main)/capture/[eventId]/page.tsx` (use `imageToSave = extracted?.imageData ?? frame`).

**Note on sending photos to Gemini Live:**
- The AI sees the photo via the **live video stream** — no need to send the cropped image separately.
- When we `sendText("I just captured this photo...")`, the AI already has visual context from the live feed.
- The cropped image is saved to Supabase for storage/album purposes, but the conversation flows naturally via the video context.
- A `sendTextWithImage()` method exists in `src/lib/gemini-live.ts` if needed for future use (sends `clientContent` with `inlineData` + `text`).
