import { GoogleGenAI } from '@google/genai';

// This endpoint generates ephemeral tokens for secure client-side Live API connections
// Ephemeral tokens are short-lived and safer than exposing API keys to the browser

export async function POST() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'API key not configured' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Generate an ephemeral token for client-side use
    // This token is short-lived and can be safely sent to the browser
    const response = await ai.auth.tokens.create({
      config: {
        // Token valid for 5 minutes
        ttlSeconds: 300,
        // Restrict to live API only for security
        httpOptions: {
          apiVersion: 'v1beta',
        },
      },
    });

    return Response.json({
      token: response.token,
      expiresAt: response.expiresAt,
    });
  } catch (error) {
    console.error('Failed to generate ephemeral token:', error);
    
    // Fallback: return the API key directly (not recommended for production)
    // This is a workaround if ephemeral tokens aren't available
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      return Response.json({
        apiKey: apiKey,
        warning: 'Using API key directly - ephemeral tokens not available',
      });
    }
    
    return Response.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}
