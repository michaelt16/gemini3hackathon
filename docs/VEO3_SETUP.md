# VEO 3 Setup - Image to Video Generation

## 🎯 What is VEO 3?

VEO 3 is Google's advanced video generation model that can:
- Convert static images into animated videos
- Generate subtle, cinematic motion
- Create "Live Photo" style animations
- Support 4, 6, or 8 second videos
- Generate at 720p or 1080p resolution

## 🔧 Setup Required

### **1. API Access**

VEO 3 requires special API access. You may need:

1. **Google Cloud Project** with Vertex AI enabled
2. **VEO 3 API Access** (may require allowlist/approval)
3. **Gemini API Key** (or Vertex AI credentials)

### **2. Environment Variables**

Add to `.env.local`:

```env
# Gemini API Key (for VEO 3)
GEMINI_API_KEY=your_gemini_api_key_here
```

### **3. Check API Availability**

VEO 3 may be available through:
- **Gemini API** (via `generativelanguage.googleapis.com`)
- **Vertex AI** (requires Google Cloud project setup)

If you get a 404/403 error, you may need:
- Vertex AI access
- VEO 3 allowlist approval
- Different API endpoint

## 🧪 Testing

### **In Playground:**

1. **Scan a photo** using the camera
2. **Click "🎬 Animate with VEO 3"** on any scanned photo
3. **Wait for generation** (can take 30-60 seconds)
4. **View the animated video** when complete

### **API Endpoint:**

```typescript
POST /api/animate-photo
{
  "photoUrl": "data:image/jpeg;base64,...", // or photoBase64
  "storyText": "Create a subtle animation..."
}
```

## 📝 Current Implementation

### **Features:**
- ✅ Minor detection (environment-only animation if minors detected)
- ✅ Subtle animation prompts
- ✅ Duration calculation (4, 6, or 8 seconds)
- ✅ Base64 video return for immediate playback
- ✅ Polling for async operations

### **Limitations:**
- ⚠️ VEO 3 API access may require special approval
- ⚠️ API endpoint may vary (currently using Gemini API endpoint)
- ⚠️ Video generation can take 30-60+ seconds

## 🔍 Troubleshooting

### **"VEO 3 API not available" Error**

This means:
1. VEO 3 might not be accessible through the current endpoint
2. You may need Vertex AI setup
3. You may need allowlist approval

**Solutions:**
1. Check [Google Cloud Console](https://console.cloud.google.com/) for VEO 3 availability
2. Contact Google Sales for VEO 3 access
3. Check if you need to use Vertex AI instead of Gemini API

### **"404 Not Found" Error**

The API endpoint might be different. Try:
1. Using Vertex AI endpoint instead
2. Checking Google's latest VEO 3 documentation
3. Verifying your API key has VEO 3 permissions

### **Video Generation Takes Too Long**

This is normal! VEO 3 video generation:
- Takes 30-60+ seconds
- Is an async operation
- Requires polling for completion

The code automatically polls every 10 seconds until complete.

## 🎬 Usage Example

```typescript
import { generateVideoWithPolling } from '@/lib/veo-service';

const result = await generateVideoWithPolling(
  imageBase64,
  {
    duration: 6,
    resolution: '720p',
    aspectRatio: '16:9',
    prompt: 'Create a subtle animation...'
  }
);

if (result.status === 'completed') {
  // Use result.videoUrl or result.videoBase64
  console.log('Video ready!', result.videoUrl);
}
```

## 📚 Resources

- [Google VEO 3 Documentation](https://cloud.google.com/vertex-ai/generative-ai/docs/video/generate-videos-from-an-image)
- [Gemini API Docs](https://ai.google.dev/docs)
- [Vertex AI Setup](https://cloud.google.com/vertex-ai/docs/start/cloud-console)

---

**Note:** VEO 3 is a premium feature and may require paid API access or special approval.
