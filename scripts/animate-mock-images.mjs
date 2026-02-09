/**
 * Animate mock images using Grok Imagine (xAI)
 * 
 * Usage: node scripts/animate-mock-images.mjs
 * 
 * Requires: XAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, basename, extname } from 'path';

// Load .env.local manually (no dotenv dependency needed)
function loadEnv(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.substring(0, eqIndex).trim();
      const value = trimmed.substring(eqIndex + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch { /* ignore */ }
}
loadEnv('.env.local');

const XAI_API_KEY = process.env.XAI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!XAI_API_KEY) {
  console.error('❌ XAI_API_KEY not found in .env.local');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env.local');
  process.exit(1);
}

const IMAGES = [
  'public/pic1.PNG',
  'public/pic2.PNG',
  'public/pic3.PNG',
  'public/pic4.PNG',
  'public/pic5.jpg',
  'public/pic6.jpg',
  'public/pic7.jpg',
  'public/pic8.jpg',
  'public/pic9.jpg',
  'public/testphoto.jpg',
];

const OUTPUT_DIR = 'public/animations';

// ============================================================================
// Supabase Storage Upload
// ============================================================================

async function uploadToSupabase(filePath) {
  const fileName = `mock-animations/${Date.now()}-${basename(filePath)}`;
  const fileBuffer = readFileSync(filePath);
  const ext = extname(filePath).toLowerCase();
  const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';

  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/object/event-photos/${fileName}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body: fileBuffer,
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upload failed (${response.status}): ${text}`);
  }

  // Get public URL
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/event-photos/${fileName}`;
  return publicUrl;
}

// ============================================================================
// Grok Imagine API
// ============================================================================

async function startGrokAnimation(imageUrl) {
  const response = await fetch('https://api.x.ai/v1/videos/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${XAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'grok-imagine-video',
      prompt: 'Bring this photograph to life with natural, cinematic animation. Add subtle movement like wind in hair and clothes, gentle breathing, environmental motion like leaves or water, light flickering. Keep the main subject stable while the environment comes alive. Smooth, natural motion.',
      image: { url: imageUrl },
      duration: 5,
      resolution: '720p',
      aspect_ratio: '16:9',
    }),
  });

  const text = await response.text();
  
  if (!response.ok) {
    throw new Error(`Grok API error (${response.status}): ${text}`);
  }

  const data = JSON.parse(text);
  return data.request_id;
}

async function pollGrokResult(requestId) {
  const response = await fetch(`https://api.x.ai/v1/videos/${requestId}`, {
    headers: {
      'Authorization': `Bearer ${XAI_API_KEY}`,
    },
  });

  const text = await response.text();
  
  if (response.status === 202) {
    return { status: 'processing' };
  }

  if (!response.ok) {
    throw new Error(`Poll error (${response.status}): ${text}`);
  }

  const data = JSON.parse(text);

  if (data.status === 'processing' || data.status === 'pending' || data.status === 'queued') {
    return { status: 'processing' };
  }

  if (data.status === 'failed' || data.error) {
    return { status: 'failed', error: data.error || data.message };
  }

  const videoUrl = data.url || data.video_url || data.result?.url || data.video?.url || data.output?.url;
  
  if (videoUrl) {
    return { status: 'completed', videoUrl };
  }

  if (data.status === 'completed' || data.status === 'succeeded') {
    return { status: 'failed', error: 'Completed but no URL in response' };
  }

  return { status: 'processing' };
}

async function waitForVideo(requestId, maxWaitSeconds = 300) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitSeconds * 1000) {
    await new Promise(r => setTimeout(r, 10000)); // Poll every 10 seconds
    
    const result = await pollGrokResult(requestId);
    
    if (result.status === 'completed') {
      return result.videoUrl;
    }
    
    if (result.status === 'failed') {
      throw new Error(`Generation failed: ${result.error}`);
    }
    
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    process.stdout.write(`  ⏳ Still processing... (${elapsed}s)\r`);
  }
  
  throw new Error('Timeout waiting for video');
}

async function downloadVideo(videoUrl, outputPath) {
  const response = await fetch(videoUrl);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(outputPath, buffer);
  return buffer.length;
}

// ============================================================================
// Main
// ============================================================================

async function animateImage(imagePath) {
  const name = basename(imagePath, extname(imagePath));
  const outputPath = join(OUTPUT_DIR, `${name}.mp4`);

  // Skip if already exists
  if (existsSync(outputPath)) {
    console.log(`⏭️  ${name} — already exists, skipping`);
    return;
  }

  console.log(`\n🖼️  Processing: ${name}`);

  // 1. Upload to Supabase
  process.stdout.write('  📤 Uploading to Supabase...');
  const publicUrl = await uploadToSupabase(imagePath);
  console.log(' ✅');

  // 2. Start Grok animation
  process.stdout.write('  🎬 Starting Grok animation...');
  const requestId = await startGrokAnimation(publicUrl);
  console.log(` ✅ (ID: ${requestId})`);

  // 3. Wait for completion
  console.log('  ⏳ Waiting for video generation...');
  const videoUrl = await waitForVideo(requestId);
  console.log('  ✅ Video ready!');

  // 4. Download MP4
  process.stdout.write('  💾 Downloading MP4...');
  const size = await downloadVideo(videoUrl, outputPath);
  console.log(` ✅ (${(size / 1024 / 1024).toFixed(1)} MB)`);

  console.log(`  ✨ Saved to: ${outputPath}`);
}

async function main() {
  console.log('🎬 Grok Imagine - Batch Animation Script');
  console.log('=========================================');
  console.log(`Images to process: ${IMAGES.length}`);
  console.log(`Output directory: ${OUTPUT_DIR}\n`);

  let success = 0;
  let failed = 0;

  for (const imagePath of IMAGES) {
    if (!existsSync(imagePath)) {
      console.log(`⚠️  ${imagePath} not found, skipping`);
      continue;
    }

    try {
      await animateImage(imagePath);
      success++;
    } catch (err) {
      console.error(`  ❌ Failed: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n=========================================`);
  console.log(`✅ Success: ${success} | ❌ Failed: ${failed}`);
}

main().catch(console.error);
