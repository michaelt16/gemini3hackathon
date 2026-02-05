/**
 * Utility functions for the capture session
 */

/** Human-readable label for extraction method */
export function getExtractionLabel(method?: string): string {
  if (method === 'bbox-crop') return '✨ Cropped';
  if (method === 'full-frame') return '📷 Full frame';
  if (method === 'nano-banana') return '🍌 Enhanced';
  return '📷 Captured';
}

/** Upload a photo to an event */
export async function uploadPhotoToEvent(
  eventId: string,
  imageData: string
): Promise<{ id: string; original_url: string } | null> {
  try {
    const res = await fetch('/api/photos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId, image: imageData }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { id: data.id, original_url: data.original_url };
  } catch {
    return null;
  }
}

/** Save conversation transcript to Supabase */
export async function saveConversation(
  messages: Array<{ role: string; content: string; timestamp: number }>,
  capturedPhotos: Array<{ serverId?: string }>
): Promise<boolean> {
  const photoWithServerId = capturedPhotos.find(p => p.serverId);
  if (!photoWithServerId?.serverId) {
    console.log('No uploaded photos to link conversation to, skipping save');
    return false;
  }

  const validMessages = messages.filter(m => m.content && m.content.trim());
  if (validMessages.length === 0) {
    console.log('No valid messages to save');
    return false;
  }

  try {
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        photo_id: photoWithServerId.serverId,
        messages: validMessages.map(m => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        })),
      }),
    });
    if (!res.ok) {
      console.error('Failed to save conversation:', await res.text());
      return false;
    }
    console.log('Conversation saved successfully');
    return true;
  } catch (error) {
    console.error('Error saving conversation:', error);
    return false;
  }
}

/** Result of Nano Banana enhancement */
export interface NanoBananaResult {
  imageDataUrl: string;
  model: string;
}

/** Enhance photo with Nano Banana (full-frame extraction) */
export async function enhanceWithNanoBanana(imageBase64: string): Promise<NanoBananaResult | null> {
  try {
    const res = await fetch('/api/nano-banana', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64 }),
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error('Nano Banana failed:', errorData.error || 'Unknown error');
      return null;
    }
    
    const data = await res.json();
    if (data.success && data.imageBase64) {
      const imageDataUrl = `data:${data.mimeType || 'image/png'};base64,${data.imageBase64}`;
      const model = data.model || 'unknown';
      console.log('🍌 [client] Model used:', model);
      return { imageDataUrl, model };
    }
    return null;
  } catch (error) {
    console.error('Nano Banana error:', error);
    return null;
  }
}
