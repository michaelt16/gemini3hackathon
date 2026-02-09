#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...v] = line.split('=');
  if (key && v.length) envVars[key.trim()] = v.join('=').trim();
});

const s = createClient(envVars['NEXT_PUBLIC_SUPABASE_URL'], envVars['SUPABASE_SERVICE_ROLE_KEY'], {
  auth: { autoRefreshToken: false, persistSession: false },
});

const YOU     = '00000000-0000-0000-0000-000000000001';
const JAMES   = '00000000-0000-0000-0000-000000000002'; // Dad
const SUSAN   = '00000000-0000-0000-0000-000000000003'; // Mom
const WILLIAM = '00000000-0000-0000-0000-000000000004'; // Grandpa

const EVENT = '41eef81d-d2ac-430a-a94e-9b962fd7bc05';
const PHOTO_GRANDPARENTS = 'dcdbdc54-ff4d-49a4-a3e3-48cd6ec204f5';
const PHOTO_ELEPHANT     = 'beab5cdc-12df-48b0-8e0c-38c201dc45e4';
const PHOTO_THIRD        = '19e1022a-605f-4493-862b-86c2febad5ba';
const PHOTO_BABY         = '1acba8f3-1214-425b-a955-85173a70e78f';

async function run() {
  // Clear ALL existing prompts
  const { error: delErr } = await s.from('family_prompts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delErr) { console.error('Delete error:', delErr.message); return; }
  console.log('Cleared all old prompts');

  const now = Date.now();
  const hr = 3600000;
  const day = 86400000;

  const prompts = [
    // ===================================================================
    // FROM YOU -> others (shows in You's "Awaiting Response")
    // ===================================================================

    // You -> William (unanswered - waiting for Grandpa)
    {
      event_id: EVENT, from_member_id: YOU, to_member_id: WILLIAM,
      photo_id: PHOTO_GRANDPARENTS,
      question: "Grandpa, who is the woman standing next to you in this photo? She looks familiar but I can't place her.",
      question_type: 'photo',
      created_at: new Date(now - 1 * hr).toISOString(),
    },
    // You -> James (unanswered - waiting for Dad)
    {
      event_id: EVENT, from_member_id: YOU, to_member_id: JAMES,
      photo_id: PHOTO_ELEPHANT,
      question: "Dad, do you remember where this was? I was riding an elephant but I can't remember what country we were in.",
      question_type: 'photo',
      created_at: new Date(now - 2 * hr).toISOString(),
    },
    // You -> Susan (ANSWERED by Mom)
    {
      event_id: EVENT, from_member_id: YOU, to_member_id: SUSAN,
      photo_id: PHOTO_BABY,
      question: 'Mom, how old was I in this photo? And who is holding me on the left?',
      question_type: 'photo',
      created_at: new Date(now - 3 * day).toISOString(),
      answer_text: "You were about 6 months old! That's your Aunt Clara holding you. She flew in from Oregon just to meet you for the first time. She was so happy she cried.",
      answered_at: new Date(now - 2 * day).toISOString(),
    },

    // ===================================================================
    // TO YOU (shows in You's "For Me" - needs to answer)
    // ===================================================================

    // Susan -> You (unanswered)
    {
      event_id: EVENT, from_member_id: SUSAN, to_member_id: YOU,
      photo_id: PHOTO_BABY,
      question: "Sweetie, do you have any memories from this day? You were so little but I always wondered if anything stuck.",
      question_type: 'photo',
      created_at: new Date(now - 30 * 60000).toISOString(),
    },
    // James -> You (unanswered)
    {
      event_id: EVENT, from_member_id: JAMES, to_member_id: YOU,
      question: "Do you still have the recipe for that chocolate cake we used to make together every birthday? Your mom and I can't find it anywhere.",
      question_type: 'general',
      created_at: new Date(now - 90 * 60000).toISOString(),
    },

    // ===================================================================
    // JAMES (Dad) -> others
    // ===================================================================

    // James -> William (ANSWERED by Grandpa)
    {
      event_id: EVENT, from_member_id: JAMES, to_member_id: WILLIAM,
      question: "Dad, what was the name of your first car? I keep telling the kids it was blue but I can't remember the model.",
      question_type: 'general',
      created_at: new Date(now - 5 * day).toISOString(),
      answer_text: "It was a 1957 Chevy Bel Air, powder blue! Your mother and I drove it on our first date. I sold it in '72 to pay for the house down payment. Biggest regret of my life.",
      answered_at: new Date(now - 4 * day).toISOString(),
    },
    // James -> Susan (unanswered - waiting for Mom)
    {
      event_id: EVENT, from_member_id: JAMES, to_member_id: SUSAN,
      photo_id: PHOTO_GRANDPARENTS,
      question: "Susan, do you remember what year your parents' anniversary photo was taken? I want to get the date right for the scrapbook.",
      question_type: 'photo',
      created_at: new Date(now - 3 * hr).toISOString(),
    },

    // ===================================================================
    // SUSAN (Mom) -> others
    // ===================================================================

    // Susan -> William (unanswered - waiting for Grandpa)
    {
      event_id: EVENT, from_member_id: SUSAN, to_member_id: WILLIAM,
      photo_id: PHOTO_GRANDPARENTS,
      question: "William, I've always wanted to ask - where was this photo of you and your wife taken? It looks like it could be the old house on Maple Street.",
      question_type: 'photo',
      created_at: new Date(now - 4 * hr).toISOString(),
    },
    // Susan -> James (ANSWERED by Dad)
    {
      event_id: EVENT, from_member_id: SUSAN, to_member_id: JAMES,
      photo_id: PHOTO_ELEPHANT,
      question: "James, wasn't this the trip where you got lost at the market? I remember being so worried!",
      question_type: 'photo',
      created_at: new Date(now - 4 * day).toISOString(),
      answer_text: "Ha! Yes, I wandered off trying to find a gift for you. The guide found me haggling over a wooden elephant figurine. I still have it in my office drawer.",
      answered_at: new Date(now - 3 * day).toISOString(),
    },

    // ===================================================================
    // WILLIAM (Grandpa) -> others
    // ===================================================================

    // William -> Susan (ANSWERED by Mom)
    {
      event_id: EVENT, from_member_id: WILLIAM, to_member_id: SUSAN,
      question: "Susan dear, do you remember the name of that restaurant we all went to for your 40th birthday? The one with the garden patio.",
      question_type: 'general',
      created_at: new Date(now - 6 * day).toISOString(),
      answer_text: "It was called The Garden Table on Main Street! They had the most amazing mushroom risotto. We should go back - I heard they renovated last year.",
      answered_at: new Date(now - 5 * day).toISOString(),
    },
    // William -> James (unanswered - waiting for Dad)
    {
      event_id: EVENT, from_member_id: WILLIAM, to_member_id: JAMES,
      photo_id: PHOTO_THIRD,
      question: "Son, I can't quite make out this photo. Is this from the fishing trip we took to Lake Huron? Must have been around '98.",
      question_type: 'photo',
      created_at: new Date(now - 6 * hr).toISOString(),
    },
  ];

  const { data, error } = await s.from('family_prompts').insert(prompts).select('id');
  if (error) { console.error('Insert error:', error.message); return; }
  console.log(`Inserted ${data.length} prompts\n`);

  // Verify per-user breakdown
  for (const [name, id] of [['You', YOU], ['James (Dad)', JAMES], ['Susan (Mom)', SUSAN], ['William (Grandpa)', WILLIAM]]) {
    const { data: forMe } = await s.from('family_prompts').select('id, question').eq('to_member_id', id).is('answered_at', null);
    const { data: awaiting } = await s.from('family_prompts').select('id, question').eq('from_member_id', id).is('answered_at', null);
    const { data: answered } = await s.from('family_prompts').select('id').eq('from_member_id', id).not('answered_at', 'is', null);
    console.log(`${name}:`);
    console.log(`  For Me (unanswered): ${forMe?.length || 0}`);
    forMe?.forEach(p => console.log(`    - "${p.question.substring(0, 70)}..."`));
    console.log(`  Awaiting Response: ${awaiting?.length || 0}`);
    awaiting?.forEach(p => console.log(`    - "${p.question.substring(0, 70)}..."`));
    console.log(`  Got Answers: ${answered?.length || 0}`);
    console.log('');
  }
}

run().catch(console.error);
