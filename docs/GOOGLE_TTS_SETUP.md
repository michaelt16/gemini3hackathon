# Google Cloud TTS Setup (Free Alternative)

## 🎯 Why Google TTS?

- ✅ **Free Tier**: 4 million characters/month (free forever)
- ✅ **No Payment Required**: Works with just API key
- ✅ **High Quality**: Natural-sounding neural voices
- ✅ **No Cloning Needed**: Pre-built voices work immediately
- ⚠️ **Not Your Voice**: Uses Google's pre-built voices (not cloned)

## 🔧 Setup Steps

### **Step 1: Get Google Cloud API Key**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Enable **Cloud Text-to-Speech API**:
   - Go to "APIs & Services" → "Library"
   - Search "Text-to-Speech API"
   - Click "Enable"
4. Create API Key:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy the API key

### **Step 2: Add to Environment**

Add to `.env.local`:

```env
GOOGLE_CLOUD_API_KEY=your_api_key_here
```

### **Step 3: Test**

The playground now has a "🆓 Use Google TTS (Free)" button that works immediately!

---

## 🎤 Available Voices

Google TTS has many pre-built voices. Popular options:

- **en-US-Neural2-D** - Natural male voice (default)
- **en-US-Neural2-F** - Natural female voice
- **en-US-Neural2-J** - Natural male voice (different style)
- **en-US-Studio-M** - Studio quality male
- **en-US-Studio-O** - Studio quality female

See full list: [Google Cloud TTS Voices](https://cloud.google.com/text-to-speech/docs/voices)

---

## 💰 Pricing

- **Free Tier**: First 4 million characters/month
- **After Free Tier**: $4 per 1 million characters
- **Your Use Case**: Stories are ~200-500 words = ~1,000-2,500 characters
- **Free Tier Capacity**: ~1,600-4,000 stories/month (FREE!)

---

## 🔄 Using in Code

### **Option 1: Use in Playground**
Just click "🆓 Use Google TTS (Free)" button - no setup needed!

### **Option 2: Use in API**
```typescript
// In create-animated-story endpoint
voiceId: 'google' // Uses Google TTS automatically
```

---

## 🆚 Comparison

| Feature | ElevenLabs | Google TTS |
|---------|-----------|------------|
| **Cost** | $5/month | Free (4M chars) |
| **Voice Cloning** | ✅ Yes | ❌ No (pre-built) |
| **Your Voice** | ✅ Yes | ❌ No |
| **Quality** | Excellent | Very Good |
| **Setup** | Easy | Easy |
| **Free Tier** | 10K chars (no cloning) | 4M chars |

---

## 💡 Recommendation

**For Testing/MVP**: Use **Google TTS** (free, works immediately)

**For Production**: 
- If budget allows: **ElevenLabs** (your actual voice)
- If free is needed: **Google TTS** (still sounds natural)
- Future: Try to get **Google Instant Custom Voice** allowlisted (free + your voice)

---

The code now supports both! You can switch between them easily.
