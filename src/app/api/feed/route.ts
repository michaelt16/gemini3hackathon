import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * GET /api/feed
 * Aggregates recent activity across photos, animations, questions, conversations, and albums
 * into a unified, chronologically-sorted feed.
 * Supports ?family_code=X to filter by family network.
 */

export interface FeedItem {
  id: string;
  type: 'photo' | 'animation' | 'question' | 'story' | 'album' | 'film' | 'storybook';
  createdAt: string;
  memberName: string;
  memberColor: string;
  albumTitle: string;
  albumId: string;
  photoUrl?: string;
  thumbnailUrl?: string;
  animatedUrl?: string;
  animationType?: string;
  questionText?: string;
  answerText?: string;
  answeredAt?: string;
  answeredByName?: string;
  answeredByColor?: string;
  storyExcerpt?: string;
  audioUrl?: string;
  voiceCloneId?: string | null;
  videoUrl?: string;
  photoCount?: number;
  storiesCount?: number;
  coverUrl?: string;
  location?: string;
}

export async function GET(request: Request) {
  try {
    const supabase = createServerClient();
    const feedItems: FeedItem[] = [];
    const url = new URL(request.url);
    const familyCode = url.searchParams.get('family_code');

    // If family_code is provided, find event IDs that belong to this family
    let familyEventIds: string[] | null = null;
    let familyMemberIds: string[] = [];
    if (familyCode) {
      const { data: familyMembers } = await supabase
        .from('family_members')
        .select('id')
        .eq('family_code', familyCode);

      if (familyMembers && familyMembers.length > 0) {
        familyMemberIds = familyMembers.map((m: { id: string }) => m.id);
        
        // Find events linked through album_members
        const { data: albumLinks } = await supabase
          .from('album_members')
          .select('event_id')
          .in('member_id', familyMemberIds);

        const eventIdSet = new Set<string>();
        albumLinks?.forEach((a: { event_id: string }) => eventIdSet.add(a.event_id));

        // Also find events created by family members (new albums may not have album_members rows yet)
        const { data: createdEvents } = await supabase
          .from('events')
          .select('id')
          .in('created_by', familyMemberIds);
        createdEvents?.forEach((e: { id: string }) => eventIdSet.add(e.id));

        if (eventIdSet.size > 0) {
          familyEventIds = [...eventIdSet];
        } else {
          return NextResponse.json([]);
        }
      } else {
        return NextResponse.json([]);
      }
    }

    // 1. Recent photos (include uploader_id for member attribution)
    let photosQuery = supabase
      .from('photos')
      .select('id, event_id, uploader_id, original_url, thumbnail_url, created_at, summary')
      .order('created_at', { ascending: false })
      .limit(30);
    if (familyEventIds) {
      photosQuery = photosQuery.in('event_id', familyEventIds);
    }
    const { data: photos } = await photosQuery;

    // 2. Recent animations
    const { data: animations } = await supabase
      .from('animation_versions')
      .select('id, photo_id, url, type, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    // 3. Recent questions — filter by family members, not event IDs
    //    Questions are personal (from/to a member), so show all involving family members
    let prompts: Array<{
      id: string; event_id: string; from_member_id: string; to_member_id: string | null; photo_id: string | null;
      question: string; question_type: string; answered_at: string | null;
      answer_text: string | null; created_at: string;
    }> | null = null;
    if (familyCode) {
      // Get family member IDs
      const { data: familyMembers } = await supabase
        .from('family_members')
        .select('id')
        .eq('family_code', familyCode);
      const fmIds = familyMembers?.map(m => m.id) || [];
      if (fmIds.length > 0) {
        // Fetch questions where from_member_id OR to_member_id is a family member
        const { data: fromPrompts } = await supabase
          .from('family_prompts')
          .select('id, event_id, from_member_id, to_member_id, photo_id, question, question_type, answered_at, answer_text, created_at')
          .in('from_member_id', fmIds)
          .order('created_at', { ascending: false })
          .limit(20);
        const { data: toPrompts } = await supabase
          .from('family_prompts')
          .select('id, event_id, from_member_id, to_member_id, photo_id, question, question_type, answered_at, answer_text, created_at')
          .in('to_member_id', fmIds)
          .order('created_at', { ascending: false })
          .limit(20);
        // Merge and deduplicate
        const promptMap = new Map<string, typeof fromPrompts extends (infer T)[] | null ? T : never>();
        fromPrompts?.forEach(p => promptMap.set(p.id, p));
        toPrompts?.forEach(p => promptMap.set(p.id, p));
        prompts = [...promptMap.values()];
      }
    } else {
      const { data: allPrompts } = await supabase
        .from('family_prompts')
        .select('id, event_id, from_member_id, to_member_id, photo_id, question, question_type, answered_at, answer_text, created_at')
        .order('created_at', { ascending: false })
        .limit(20);
      prompts = allPrompts;
    }

    // 4. Recent conversations/stories (include author_id and transcript)
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id, photo_id, author_id, transcript, duration_seconds, audio_url, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    // 5. Recent storybooks (album_narrations — indicates a storybook was created/updated)
    let narrationsQuery = supabase
      .from('album_narrations')
      .select('id, event_id, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(10);
    if (familyEventIds) {
      narrationsQuery = narrationsQuery.in('event_id', familyEventIds);
    }
    const { data: narrations } = await narrationsQuery;

    // 6. Recent albums (include created_by for attribution)
    let eventsQuery = supabase
      .from('events')
      .select('id, title, location, cover_photo_id, created_by, created_at, video_url')
      .order('created_at', { ascending: false })
      .limit(10);
    if (familyEventIds) {
      eventsQuery = eventsQuery.in('id', familyEventIds);
    }
    const { data: events } = await eventsQuery;

    // Gather all IDs we need to resolve
    const eventIds = new Set<string>();
    const photoIds = new Set<string>();
    const memberIds = new Set<string>();

    photos?.forEach(p => {
      if (p.event_id) eventIds.add(p.event_id);
      if (p.uploader_id) memberIds.add(p.uploader_id);
    });
    animations?.forEach(a => { if (a.photo_id) photoIds.add(a.photo_id); });
    prompts?.forEach(p => {
      if (p.event_id) eventIds.add(p.event_id);
      if (p.photo_id) photoIds.add(p.photo_id);
      if (p.from_member_id) memberIds.add(p.from_member_id);
      if (p.to_member_id) memberIds.add(p.to_member_id);
    });
    conversations?.forEach(c => {
      if (c.photo_id) photoIds.add(c.photo_id);
      if (c.author_id) memberIds.add(c.author_id);
    });
    events?.forEach(e => {
      eventIds.add(e.id);
      if (e.cover_photo_id) photoIds.add(e.cover_photo_id);
      if (e.created_by) memberIds.add(e.created_by);
    });

    // Batch-fetch lookups
    const eventMap = new Map<string, { title: string; location?: string }>();
    const photoMap = new Map<string, { original_url: string; thumbnail_url?: string; event_id?: string; uploader_id?: string }>();
    const memberMap = new Map<string, { name: string; avatar_color: string; voice_clone_id?: string | null }>();

    if (eventIds.size > 0) {
      const { data: evts } = await supabase
        .from('events')
        .select('id, title, location')
        .in('id', [...eventIds]);
      evts?.forEach(e => eventMap.set(e.id, { title: e.title, location: e.location }));
    }

    if (photoIds.size > 0) {
      const { data: phs } = await supabase
        .from('photos')
        .select('id, original_url, thumbnail_url, event_id, uploader_id')
        .in('id', [...photoIds]);
      phs?.forEach(p => {
        photoMap.set(p.id, { original_url: p.original_url, thumbnail_url: p.thumbnail_url, event_id: p.event_id, uploader_id: p.uploader_id });
        if (p.uploader_id) memberIds.add(p.uploader_id);
      });
    }

    // Fetch family members for name/color resolution, plus voice_clone_id from users
    {
      const { data: members } = await supabase
        .from('family_members')
        .select('id, name, avatar_color');
      members?.forEach(m => memberMap.set(m.id, { name: m.name, avatar_color: m.avatar_color }));

      // Enrich with voice_clone_id from users table
      if (members && members.length > 0) {
        const mIds = members.map(m => m.id);
        const { data: users } = await supabase
          .from('users')
          .select('id, voice_clone_id')
          .in('id', mIds);
        users?.forEach(u => {
          const existing = memberMap.get(u.id);
          if (existing && u.voice_clone_id) {
            existing.voice_clone_id = u.voice_clone_id;
          }
        });
      }
    }

    // Also fetch album_members for IDs not found in family_members
    if (memberIds.size > 0) {
      const missingIds = [...memberIds].filter(id => !memberMap.has(id));
      if (missingIds.length > 0) {
        const { data: albumMembers } = await supabase
          .from('album_members')
          .select('id, name, avatar_color')
          .in('id', missingIds);
        albumMembers?.forEach(m => memberMap.set(m.id, { name: m.name, avatar_color: m.avatar_color }));
      }
    }

    // Get photo counts per event for album cards
    const albumPhotoCounts = new Map<string, number>();
    if (eventIds.size > 0) {
      const { data: photoCounts } = await supabase
        .from('photos')
        .select('event_id')
        .in('event_id', [...eventIds]);
      photoCounts?.forEach(p => {
        albumPhotoCounts.set(p.event_id, (albumPhotoCounts.get(p.event_id) || 0) + 1);
      });
    }

    // Helper to resolve member or fall back
    const resolveMember = (id?: string) => {
      if (!id) return { name: 'Family', color: '#06b6d4', voiceCloneId: null as string | null };
      const m = memberMap.get(id);
      return m ? { name: m.name, color: m.avatar_color, voiceCloneId: m.voice_clone_id || null } : { name: 'Family', color: '#06b6d4', voiceCloneId: null as string | null };
    };

    // ---- Build feed items ----

    // Photos: group by event_id to avoid spamming the feed
    const photosByEvent = new Map<string, (typeof photos extends (infer T)[] | null ? T : never)[]>();
    photos?.forEach(p => {
      const key = p.event_id || 'unknown';
      if (!photosByEvent.has(key)) photosByEvent.set(key, []);
      photosByEvent.get(key)!.push(p);
    });

    photosByEvent.forEach((eventPhotos, eventId) => {
      const evt = eventMap.get(eventId);
      const latestPhoto = eventPhotos[0];
      const member = resolveMember(latestPhoto.uploader_id);
      feedItems.push({
        id: `photo-${eventId}-${latestPhoto.id}`,
        type: 'photo',
        createdAt: latestPhoto.created_at,
        memberName: member.name,
        memberColor: member.color,
        albumTitle: evt?.title || 'Album',
        albumId: eventId,
        photoUrl: latestPhoto.original_url || latestPhoto.thumbnail_url,
        thumbnailUrl: latestPhoto.thumbnail_url,
        photoCount: eventPhotos.length,
      });
    });

    // Animations: inherit member from parent photo's uploader
    animations?.forEach(a => {
      const photo = photoMap.get(a.photo_id);
      const evt = photo?.event_id ? eventMap.get(photo.event_id) : undefined;
      const member = resolveMember(photo?.uploader_id);
      feedItems.push({
        id: `anim-${a.id}`,
        type: 'animation',
        createdAt: a.created_at,
        memberName: member.name,
        memberColor: member.color,
        albumTitle: evt?.title || 'Album',
        albumId: photo?.event_id || '',
        photoUrl: photo?.original_url || photo?.thumbnail_url,
        animatedUrl: a.url,
        animationType: a.type === 'grok-imagine' ? 'Cinematic' : 'VEO 3',
      });
    });

    // Questions: use from_member_id for asker, to_member_id for answerer
    prompts?.forEach(p => {
      const member = resolveMember(p.from_member_id);
      const answerer = p.to_member_id ? resolveMember(p.to_member_id) : null;
      const evt = p.event_id ? eventMap.get(p.event_id) : undefined;
      const photo = p.photo_id ? photoMap.get(p.photo_id) : undefined;
      feedItems.push({
        id: `question-${p.id}`,
        type: 'question',
        // If answered, use answered_at so it bubbles up as recent activity
        createdAt: p.answered_at || p.created_at,
        memberName: member.name,
        memberColor: member.color,
        albumTitle: evt?.title || 'Album',
        albumId: p.event_id || '',
        photoUrl: photo?.original_url || photo?.thumbnail_url,
        questionText: p.question,
        answerText: p.answer_text,
        answeredAt: p.answered_at,
        answeredByName: answerer?.name,
        answeredByColor: answerer?.color,
      });
    });

    // Stories: use author_id, show transcript excerpt
    conversations?.forEach(c => {
      const photo = c.photo_id ? photoMap.get(c.photo_id) : undefined;
      const evt = photo?.event_id ? eventMap.get(photo.event_id) : undefined;
      const member = resolveMember(c.author_id);
      // Use transcript as excerpt (truncate to ~150 chars)
      const excerpt = c.transcript
        ? (c.transcript.length > 150 ? c.transcript.slice(0, 150) + '...' : c.transcript)
        : (c.duration_seconds ? `${Math.round(c.duration_seconds / 60)} min story` : 'Shared a story');
      feedItems.push({
        id: `story-${c.id}`,
        type: 'story',
        createdAt: c.created_at,
        memberName: member.name,
        memberColor: member.color,
        albumTitle: evt?.title || 'Album',
        albumId: photo?.event_id || '',
        photoUrl: photo?.original_url || photo?.thumbnail_url,
        storyExcerpt: excerpt,
        audioUrl: c.audio_url,
        voiceCloneId: member.voiceCloneId,
      });
    });

    // Albums: use created_by for attribution
    const eventVideoMap = new Map<string, string>();
    events?.forEach(e => {
      const coverPhoto = e.cover_photo_id ? photoMap.get(e.cover_photo_id) : undefined;
      const member = resolveMember(e.created_by);
      if (e.video_url) eventVideoMap.set(e.id, e.video_url);
      feedItems.push({
        id: `album-${e.id}`,
        type: 'album',
        createdAt: e.created_at,
        memberName: member.name,
        memberColor: member.color,
        albumTitle: e.title,
        albumId: e.id,
        coverUrl: coverPhoto?.original_url || coverPhoto?.thumbnail_url,
        photoCount: albumPhotoCounts.get(e.id) || 0,
        location: e.location,
      });
      // If album has an exported film, add a film entry
      if (e.video_url) {
        feedItems.push({
          id: `film-${e.id}`,
          type: 'film',
          createdAt: e.created_at,
          memberName: member.name,
          memberColor: member.color,
          albumTitle: e.title,
          albumId: e.id,
          videoUrl: e.video_url,
          coverUrl: coverPhoto?.original_url || coverPhoto?.thumbnail_url,
          photoCount: albumPhotoCounts.get(e.id) || 0,
        });
      }
    });

    // Storybooks: narrations that exist for albums
    narrations?.forEach(n => {
      const evt = eventMap.get(n.event_id);
      // Find creator from events data
      const eventData = events?.find(e => e.id === n.event_id);
      const member = resolveMember(eventData?.created_by);
      const coverPhotoData = eventData?.cover_photo_id ? photoMap.get(eventData.cover_photo_id) : undefined;
      feedItems.push({
        id: `storybook-${n.id}`,
        type: 'storybook',
        createdAt: n.updated_at || n.created_at,
        memberName: member.name,
        memberColor: member.color,
        albumTitle: evt?.title || 'Album',
        albumId: n.event_id,
        coverUrl: coverPhotoData?.original_url || coverPhotoData?.thumbnail_url,
        photoCount: albumPhotoCounts.get(n.event_id) || 0,
      });
    });

    // Sort by createdAt DESC
    feedItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(feedItems.slice(0, 50));
  } catch (error) {
    console.error('[Feed API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load feed' },
      { status: 500 }
    );
  }
}
