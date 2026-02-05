# Phase 9D: Family Prompts

> **Status**: Planned for Hackathon Demo  
> **Effort**: ~6-8 hours  
> **Priority**: High (increases Impact score significantly)

---

## Overview

Family members can ask questions through EVA. The album owner answers through EVA, optionally adding photos. Answers become part of the story.

**Why this matters:**
- Shifts from "solo preservation" to "family conversation"
- Questions drive content creation
- Less creepy, more collaborative
- Directly addresses the Remento use case: "Questions you wish you'd asked"

---

## User Flows

### Flow 1: Question About a Specific Photo

```
Sarah (daughter) opens "Beach Trip" album
    ↓
Clicks a photo → "Ask about this"
    ↓
EVA: "What would you like to ask about this photo?"
Sarah: "Who's the kid on the left? I don't recognize them."
    ↓
Question is saved, Mom gets notified (or sees in inbox)
    ↓
Mom opens inbox → sees Sarah's question with the photo
    ↓
Mom clicks "Answer with EVA"
    ↓
EVA: "Sarah asked: 'Who's the kid on the left?' 
      I can see a young boy in this photo. Do you remember who that is?"
Mom: "That's cousin Tommy from Chicago. He visited that summer..."
    ↓
Answer is saved → becomes part of the photo's story
    ↓
Export includes: "Sarah asked about the boy on the left. 
                  That's cousin Tommy, visiting from Chicago that summer."
```

### Flow 2: General Question (Can Add Photos)

```
Sarah asks through EVA (no specific photo):
    "Mom, what was grandma like when she was younger?"
    ↓
Question is saved to album (no photo attached)
    ↓
Mom opens inbox → sees Sarah's question
    ↓
Mom clicks "Answer with EVA"
    ↓
EVA: "Sarah wants to know what grandma was like when she was younger.
      Would you like to share some memories? 
      You can also add photos if you have any."
    ↓
Mom talks to EVA, shares stories
Mom: "Let me show you this photo of her at 25..."
    ↓
Mom uses normal capture flow (camera/upload) within the answer session
    ↓
New photos + story are added to the album
    ↓
Sarah's question is answered with photos + narration
```

---

## Key Concept: EVA is the Interface for Everything

| Action | Who | Through EVA? |
|--------|-----|--------------|
| Ask a question about a photo | Family member | ✅ Yes |
| Ask a general question | Family member | ✅ Yes |
| Answer a question | Album owner | ✅ Yes |
| Add photos while answering | Album owner | ✅ Yes |

**EVA's role:**
- For askers: "What would you like to ask about this photo?"
- For answerers: "Sarah asked [question]. Let me help you answer."

---

## Data Model

```sql
-- ============================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- ============================================

-- Album members (family in an album)
CREATE TABLE IF NOT EXISTS album_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  
  -- Member info
  name TEXT NOT NULL,
  relationship TEXT,
  avatar_color TEXT DEFAULT '#60a5fa',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family prompts (questions asked through EVA)
CREATE TABLE IF NOT EXISTS family_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  
  -- Who asked (family member)
  from_member_id UUID REFERENCES album_members(id),
  
  -- What they asked about (optional - null means general question)
  photo_id UUID REFERENCES photos(id),
  
  -- The question
  question TEXT NOT NULL,
  question_type TEXT DEFAULT 'photo',
  
  -- Answer (filled when owner responds)
  answered_at TIMESTAMPTZ,
  answer_text TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_family_prompts_event ON family_prompts(event_id);
CREATE INDEX IF NOT EXISTS idx_family_prompts_unanswered ON family_prompts(event_id) WHERE answered_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_album_members_event ON album_members(event_id);
```

**If you already created the tables without `question_type`, run:**
```sql
ALTER TABLE family_prompts ADD COLUMN IF NOT EXISTS question_type TEXT DEFAULT 'photo';
```

---

## UI Design

### Album List Page (`/album`)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Your Albums                                              [+ New]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────┐  ┌────────────────────────┐  │
│  │  Beach Trip 2020                 │  │  Grandma's 80th        │  │
│  │  ┌─────────────────────────────┐ │  │  ┌──────────────────┐  │  │
│  │  │                             │ │  │  │                  │  │  │
│  │  │      [Cover Photo]          │ │  │  │  [Cover Photo]   │  │  │
│  │  │                             │ │  │  │                  │  │  │
│  │  └─────────────────────────────┘ │  │  └──────────────────┘  │  │
│  │                                  │  │                        │  │
│  │  (S)(M)(E) 3 family members      │  │  (S)(M) 2 members      │  │
│  │  📬 2 questions                  │  │  ✓ All answered       │  │
│  └──────────────────────────────────┘  └────────────────────────┘  │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  📬 Questions for You                                        (3)   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌────┐  Sarah asked about "Beach Trip"              [Answer →]    │
│  │ 👤 │  "Who's the kid on the left?"                              │
│  │ S  │  ┌─────┐ (photo thumbnail)                                 │
│  └────┘  └─────┘                                                   │
│                                                                     │
│  ┌────┐  Michael asked in "Grandma's 80th"           [Answer →]    │
│  │ 👤 │  "What was grandma like when she was younger?"             │
│  │ M  │  (no photo - general question)                             │
│  └────┘                                                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Answer Modal (Photo Question)

```
┌─────────────────────────────────────────────────────────────────────┐
│  ✕                Answer Sarah's Question                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────┐    ┌─────────────────────────────────────┐│
│  │                     │    │  💬 Sarah asked:                    ││
│  │                     │    │  "Who's the kid on the left?"       ││
│  │    [Photo]          │    │                                     ││
│  │                     │    │  ────────────────────────────────── ││
│  │                     │    │                                     ││
│  └─────────────────────┘    │  🔮 EVA                             ││
│                             │  "I see a young boy on the left.   ││
│                             │   Do you remember who that is?"    ││
│                             │                                     ││
│                             │  🎤 [Speaking...]                   ││
│                             │                                     ││
│                             └─────────────────────────────────────┘│
│                                                                     │
│                                     [Save Answer]  [Cancel]         │
└─────────────────────────────────────────────────────────────────────┘
```

### Answer Modal (General Question - Can Add Photos)

```
┌─────────────────────────────────────────────────────────────────────┐
│  ✕                Answer Michael's Question                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────┐    ┌─────────────────────────────────────┐│
│  │                     │    │  💬 Michael asked:                  ││
│  │  [Camera / Upload]  │    │  "What was grandma like when she   ││
│  │                     │    │   was younger?"                     ││
│  │  ─────────────────  │    │                                     ││
│  │                     │    │  ────────────────────────────────── ││
│  │  📷 Add photos to   │    │                                     ││
│  │     your answer     │    │  🔮 EVA                             ││
│  │                     │    │  "Michael wants to know about      ││
│  │  ┌───┐ ┌───┐ ┌───┐  │    │   grandma. Would you like to share ││
│  │  │+  │ │   │ │   │  │    │   some memories? Feel free to add  ││
│  │  └───┘ └───┘ └───┘  │    │   photos too."                     ││
│  │  (added photos)     │    │                                     ││
│  └─────────────────────┘    │  🎤 [Speaking...]                   ││
│                             │                                     ││
│                             └─────────────────────────────────────┘│
│                                                                     │
│                                     [Save Answer]  [Cancel]         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## EVA System Prompts

### For Asking (Family Member)

```
You're EVA, helping a family member ask a question.

Context:
- Album: "Beach Trip 2020"
- Family member: Sarah (daughter)
- They're looking at a photo (or browsing the album)

Your role:
- Help them formulate a clear question
- If they're looking at a photo: "What would you like to ask about this photo?"
- If general: "What would you like to know? You can ask about memories, people, or events."
- Confirm the question before sending: "So you'd like to ask: '[question]'. Should I send this?"
```

### For Answering (Album Owner)

```
You're EVA, helping the album owner answer a family member's question.

Context:
- Album: "Beach Trip 2020"
- Question from: Sarah (their daughter)
- Question: "Who's the kid on the left?"
- Photo: [attached if photo-specific question]

Your role:
- Read the question warmly: "Sarah asked about this photo: 'Who's the kid on the left?'"
- Help them recall: "I can see a young boy on the left side. Do you remember who that is?"
- If they're uncertain, help them: "That's okay! Do you remember anything about that day?"
- For general questions, offer to add photos: "Would you like to add any photos to go with your answer?"
- Summarize their answer at the end for storage

Be warm, patient, and encouraging. This is a family moment.
```

---

## API Endpoints

### GET `/api/albums/[id]/members`

Returns family members in an album.

```json
{
  "members": [
    { "id": "...", "name": "Sarah", "relationship": "daughter", "avatar_color": "#f472b6" },
    { "id": "...", "name": "Michael", "relationship": "son", "avatar_color": "#60a5fa" }
  ]
}
```

### GET `/api/prompts`

Returns all unanswered prompts for the user (across all albums).

```json
{
  "prompts": [
    {
      "id": "...",
      "event_id": "...",
      "album_title": "Beach Trip 2020",
      "from_member": { "name": "Sarah", "relationship": "daughter", "avatar_color": "#f472b6" },
      "question": "Who's the kid on the left?",
      "question_type": "photo",
      "photo": { "id": "...", "thumbnail_url": "..." },
      "created_at": "..."
    }
  ]
}
```

### POST `/api/prompts`

Create a new prompt (family member asking).

```json
{
  "event_id": "...",
  "from_member_id": "...",
  "photo_id": "..." | null,
  "question": "Who's the kid on the left?",
  "question_type": "photo" | "general"
}
```

### POST `/api/prompts/[id]/answer`

Save an answer.

```json
{
  "answer_text": "That's cousin Tommy from Chicago...",
  "answer_photo_ids": ["...", "..."]  // For general questions with added photos
}
```

---

## Implementation Checklist

### Database (10 min)
- [ ] Create `album_members` table
- [ ] Create `family_prompts` table
- [ ] Add indexes

### APIs (1.5 hr)
- [ ] `GET /api/albums/[id]/members`
- [ ] `POST /api/albums/[id]/members` (for seeding)
- [ ] `GET /api/prompts`
- [ ] `POST /api/prompts`
- [ ] `POST /api/prompts/[id]/answer`

### UI - Album List Page (2 hr)
- [ ] Family member avatars on album cards
- [ ] Question count badge
- [ ] "Questions for You" section
- [ ] Question cards with photo thumbnail

### UI - Answer Modal (2 hr)
- [ ] `AnswerPromptModal.tsx` component
- [ ] Reuse CaptureSession layout
- [ ] Photo display (for photo questions)
- [ ] Camera/upload option (for general questions)
- [ ] EVA with question context

### EVA Integration (30 min)
- [ ] System prompt for answering
- [ ] Include question + asker in context
- [ ] Answer extraction after conversation

### Demo Seeding (15 min)
- [ ] Add family members to demo album
- [ ] Add 2-3 questions (mix of photo and general)

### Polish (1 hr)
- [ ] Smooth transitions
- [ ] Loading states
- [ ] Success feedback ("Answer saved!")

---

## Demo Script

**Narrator**: "Living Memory isn't just for you—it's for your whole family."

**Screen**: Album list showing family avatars and question badges

**Narrator**: "Family members can ask questions through EVA."

**Screen**: Show a question card: "Sarah asked: Who's the kid on the left?"

**Narrator**: "You answer with EVA, and your answer becomes part of the story."

**Screen**: Open answer modal, show EVA conversation

**Narrator**: "For bigger questions, you can even add photos to your answer."

**Screen**: Show general question, adding photos

**Narrator**: "When you export, the film answers what your family actually wanted to know."

**Screen**: Export showing "Sarah asked about the boy on the left. That's cousin Tommy..."

---

## Post-Hackathon Roadmap

1. **Real user accounts** — Family members log in
2. **Invite flow** — Share link to join album
3. **Notifications** — Email when you have questions
4. **Ask flow** — "Ask about this photo" button with EVA
5. **Permissions** — Who can view, ask, add photos
6. **Chapter pages** — Questions/answers as structured chapters in the story

---

## Files to Create/Modify

| File | Action |
|------|--------|
| Supabase SQL | Create tables |
| `src/app/api/albums/[id]/members/route.ts` | New |
| `src/app/api/prompts/route.ts` | New |
| `src/app/api/prompts/[id]/answer/route.ts` | New |
| `src/app/(main)/album/page.tsx` | Add avatars, questions section |
| `src/components/AnswerPromptModal.tsx` | New |
| `src/components/FamilyAvatars.tsx` | New (small component) |

---

*This phase turns Living Memory from "solo preservation" into "family conversation."*
