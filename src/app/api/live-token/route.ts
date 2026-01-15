// This endpoint provides auth for the Live API
// In production, you would use a more secure token mechanism

export async function POST() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Return the API key for Live API connection
    // In production, consider using ephemeral tokens when available
    return Response.json({
      apiKey: apiKey,
    });
  } catch (error) {
    console.error('Failed to get auth token:', error);
    return Response.json(
      { error: 'Failed to get token' },
      { status: 500 }
    );
  }
}
