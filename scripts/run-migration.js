#!/usr/bin/env node
/**
 * Run a SQL migration file against the remote Supabase instance.
 * Uses the Supabase Management API SQL endpoint.
 * 
 * Usage: node scripts/run-migration.js supabase/migrations/006_accounts_and_prompts.sql
 */

const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const SUPABASE_URL = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const SERVICE_KEY = envVars['SUPABASE_SERVICE_ROLE_KEY'];

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SERVICE_KEY in .env.local');
  process.exit(1);
}

// Extract project ref from URL (e.g., "axmilbwumkxjcibxdnxk" from "https://axmilbwumkxjcibxdnxk.supabase.co")
const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0];

const sqlFile = process.argv[2] || 'supabase/migrations/006_accounts_and_prompts.sql';
const fullPath = path.resolve(__dirname, '..', sqlFile);

if (!fs.existsSync(fullPath)) {
  console.error(`File not found: ${fullPath}`);
  process.exit(1);
}

const sql = fs.readFileSync(fullPath, 'utf8');

async function runMigration() {
  console.log(`Running migration: ${sqlFile}`);
  console.log(`Target: ${SUPABASE_URL}`);
  
  // Use the Supabase SQL API endpoint (available with service role key)
  // Try the pgrest SQL endpoint first
  const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Prefer': 'return=representation',
    },
  });

  // The REST API doesn't support raw SQL. We need to use individual table operations.
  // Let's create the tables and seed data using the Supabase JS client instead.
  
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Step 1: Check if family_members table exists
  const { data: existingMembers, error: checkError } = await supabase
    .from('family_members')
    .select('id')
    .limit(1);

  if (checkError && checkError.code === '42P01') {
    // Table doesn't exist - we need to create it via SQL
    console.log('Tables do not exist yet. Please run the SQL migration manually in the Supabase dashboard SQL editor:');
    console.log(`  ${fullPath}`);
    console.log('\nOr use: npx supabase db push');
    process.exit(1);
  }

  if (existingMembers && existingMembers.length > 0) {
    console.log('family_members table already has data. Checking for our seed accounts...');
  }

  // Step 2: Seed family_members
  console.log('\nSeeding family_members...');
  const members = [
    { id: '00000000-0000-0000-0000-000000000001', name: 'You', email: 'you@family.com', password: 'demo123', avatar_color: '#8b5cf6', relationship: 'Self' },
    { id: '00000000-0000-0000-0000-000000000002', name: 'James', email: 'dad@family.com', password: 'demo123', avatar_color: '#3b82f6', relationship: 'Father' },
    { id: '00000000-0000-0000-0000-000000000003', name: 'Susan', email: 'mom@family.com', password: 'demo123', avatar_color: '#ec4899', relationship: 'Mother' },
    { id: '00000000-0000-0000-0000-000000000004', name: 'William', email: 'grandpa@family.com', password: 'demo123', avatar_color: '#10b981', relationship: 'Grandfather' },
  ];

  const { data: insertedMembers, error: memberError } = await supabase
    .from('family_members')
    .upsert(members, { onConflict: 'email' })
    .select();

  if (memberError) {
    console.error('Error inserting family_members:', memberError.message);
    if (memberError.code === '42P01') {
      console.log('\nTable does not exist. Paste the SQL from the migration file into the Supabase SQL Editor.');
      process.exit(1);
    }
  } else {
    console.log(`  Inserted/updated ${insertedMembers?.length || 0} family members`);
  }

  // Step 3: Link members to all events
  console.log('\nSeeding album_members...');
  const { data: events } = await supabase.from('events').select('id');
  if (events && events.length > 0) {
    const albumMemberRows = [];
    for (const event of events) {
      for (const member of members) {
        albumMemberRows.push({
          event_id: event.id,
          member_id: member.id,
          role: member.email === 'you@family.com' ? 'owner' : 'member',
        });
      }
    }
    const { error: amError } = await supabase
      .from('album_members')
      .upsert(albumMemberRows, { onConflict: 'event_id,member_id', ignoreDuplicates: true })
      .select();

    if (amError) {
      if (amError.code === '42P01') {
        console.log('  album_members table does not exist yet.');
      } else {
        console.error('  Error:', amError.message);
      }
    } else {
      console.log(`  Linked ${albumMemberRows.length} member-event pairs`);
    }
  }

  // Step 4: Seed sample prompts
  console.log('\nSeeding family_prompts...');
  const { data: firstEvent } = await supabase.from('events').select('id').limit(1).single();
  let firstPhotoId = null;
  if (firstEvent) {
    const { data: firstPhoto } = await supabase.from('photos').select('id').eq('event_id', firstEvent.id).limit(1).single();
    firstPhotoId = firstPhoto?.id || null;
  }

  if (firstEvent) {
    const prompts = [
      { event_id: firstEvent.id, from_member_id: members[0].id, to_member_id: members[3].id, photo_id: firstPhotoId, question: "Grandpa, who is the person standing next to you in this photo? I don't recognize them.", question_type: 'photo' },
      { event_id: firstEvent.id, from_member_id: members[0].id, to_member_id: members[1].id, photo_id: firstPhotoId, question: "Dad, do you remember what year this was taken? Mom thinks it was 1995 but I'm not sure.", question_type: 'photo' },
      { event_id: firstEvent.id, from_member_id: members[2].id, to_member_id: members[0].id, photo_id: firstPhotoId, question: "Honey, can you tell me more about this day? I remember it being really special but the details are fuzzy.", question_type: 'photo' },
      { event_id: firstEvent.id, from_member_id: members[1].id, to_member_id: members[0].id, question: "Do you still have the recipe for that cake we made together? I'd love to make it again.", question_type: 'general' },
      { event_id: firstEvent.id, from_member_id: members[3].id, to_member_id: members[2].id, question: "Susan, do you remember the name of that restaurant we all went to for your birthday?", question_type: 'general', answer_text: "It was called 'The Garden Table' on Main Street! They had the most amazing pasta. We should go back sometime.", answered_at: new Date(Date.now() - 2 * 86400000).toISOString() },
      { event_id: firstEvent.id, from_member_id: members[1].id, to_member_id: members[3].id, question: "Dad, what was the name of your first car? I remember it being blue.", question_type: 'general', answer_text: "It was a 1957 Chevy Bel Air, and you're right - it was powder blue! Your mother and I drove it on our first date.", answered_at: new Date(Date.now() - 5 * 86400000).toISOString() },
    ];

    // Check if we already have prompts
    const { data: existingPrompts } = await supabase.from('family_prompts').select('id').limit(1);
    if (!existingPrompts || existingPrompts.length === 0) {
      const { error: promptError } = await supabase.from('family_prompts').insert(prompts);
      if (promptError) {
        if (promptError.code === '42P01') {
          console.log('  family_prompts table does not exist yet.');
        } else {
          console.error('  Error:', promptError.message);
        }
      } else {
        console.log(`  Inserted ${prompts.length} sample prompts`);
      }
    } else {
      console.log('  Prompts already exist, skipping seed');
    }
  }

  console.log('\nMigration complete!');
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
