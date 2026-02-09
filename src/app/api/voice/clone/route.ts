import { NextRequest, NextResponse } from 'next/server';
import { cloneVoice, listVoices, deleteVoice } from '@/lib/voice-service';
import { createServerClient } from '@/lib/supabase/server';

/**
 * POST /api/voice/clone
 * Clone a voice from audio samples using ElevenLabs IVC.
 * Stores samples in Supabase Storage and saves voice ID to user record.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const voiceName = formData.get('voiceName') as string || 'My Voice';
    const description = formData.get('description') as string || '';
    const userId = formData.get('userId') as string || 'default';
    
    // Collect all audio files (supports multiple samples)
    const audioFiles: { buffer: Buffer; filename: string }[] = [];
    
    // Check for single file (backward compat)
    const singleFile = formData.get('audioFile') as File;
    if (singleFile && singleFile.size > 0) {
      const arrayBuffer = await singleFile.arrayBuffer();
      audioFiles.push({ 
        buffer: Buffer.from(arrayBuffer), 
        filename: singleFile.name || 'voice-sample.mp3' 
      });
    }
    
    // Check for multiple files
    const files = formData.getAll('files') as File[];
    for (const file of files) {
      if (file instanceof File && file.size > 0) {
        const arrayBuffer = await file.arrayBuffer();
        audioFiles.push({ 
          buffer: Buffer.from(arrayBuffer), 
          filename: file.name || 'voice-sample.mp3' 
        });
      }
    }

    if (audioFiles.length === 0) {
      return NextResponse.json(
        { error: 'At least one audio file is required' },
        { status: 400 }
      );
    }

    // 1. Store voice samples in Supabase Storage
    const supabase = createServerClient();
    const sampleUrls: string[] = [];
    
    for (let i = 0; i < audioFiles.length; i++) {
      const { buffer, filename } = audioFiles[i];
      const storagePath = `voice-samples/${userId}/${Date.now()}-${i}-${filename}`;
      
      const { error: uploadError } = await supabase.storage
        .from('event-photos') // Reuse existing bucket
        .upload(storagePath, buffer, {
          contentType: 'audio/mpeg',
          upsert: true,
        });
      
      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('event-photos')
          .getPublicUrl(storagePath);
        sampleUrls.push(urlData.publicUrl);
      } else {
        console.warn(`Failed to upload sample ${i}:`, uploadError);
      }
    }

    // 2. Clone voice with ElevenLabs
    const voiceProfile = await cloneVoice(
      audioFiles.map(f => f.buffer), 
      voiceName, 
      description
    );

    // 3. Save voice ID and sample URL to user record in Supabase
    const { error: updateError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        voice_clone_id: voiceProfile.id,
        voice_sample_url: sampleUrls[0] || null, // Store first sample URL
      }, { onConflict: 'id' });
    
    if (updateError) {
      console.warn('Failed to save voice to user record:', updateError);
      // Don't fail the whole request - voice clone still succeeded
    }

    return NextResponse.json({
      success: true,
      voiceProfile,
      sampleUrls,
      storedToDb: !updateError,
    });
  } catch (error) {
    console.error('Voice cloning error:', error);
    return NextResponse.json(
      {
        error: 'Failed to clone voice',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/voice/clone
 * List all cloned voices. Also returns the user's stored voice from Supabase.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId') || 'default';
    
    // Get user's saved voice from Supabase
    const supabase = createServerClient();
    const { data: user } = await supabase
      .from('users')
      .select('voice_clone_id, voice_sample_url, name')
      .eq('id', userId)
      .single();
    
    // Also get all voices from ElevenLabs
    let elevenLabsVoices: { id: string; name: string }[] = [];
    try {
      elevenLabsVoices = await listVoices();
    } catch {
      // No API key or ElevenLabs error — just return DB data
    }
    
    return NextResponse.json({ 
      success: true, 
      voices: elevenLabsVoices,
      savedVoice: user?.voice_clone_id ? {
        id: user.voice_clone_id,
        name: user.name ? `${user.name}'s Voice` : 'My Voice',
        sampleUrl: user.voice_sample_url,
      } : null,
    });
  } catch (error) {
    console.error('List voices error:', error);
    return NextResponse.json(
      { error: 'Failed to list voices', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/voice/clone
 * Delete a cloned voice from ElevenLabs and clear from user record.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { voiceId, userId } = await request.json();
    if (!voiceId) {
      return NextResponse.json({ error: 'voiceId is required' }, { status: 400 });
    }
    
    // Delete from ElevenLabs
    await deleteVoice(voiceId);
    
    // Clear from user record
    if (userId) {
      const supabase = createServerClient();
      await supabase
        .from('users')
        .update({ voice_clone_id: null, voice_sample_url: null })
        .eq('id', userId);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete voice error:', error);
    return NextResponse.json(
      { error: 'Failed to delete voice', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
