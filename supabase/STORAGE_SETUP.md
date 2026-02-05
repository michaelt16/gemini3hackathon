# Supabase Storage Setup

Photos captured in **Capture** mode are uploaded to Supabase Storage and linked to events.

## Create the bucket

1. Open your [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. Go to **Storage** in the left sidebar.
3. Click **New bucket**.
4. **Name:** `event-photos`
5. **Public bucket:** turn **ON** (so the app can show image URLs).
6. Click **Create bucket**.

Optional: under **Policies**, you can restrict who can upload/read (e.g. authenticated users). For MVP, the default is fine if you're using the service role key in API routes.

## What uses it

- **POST /api/photos** uploads images to `event-photos/{event_id}/{uuid}.jpg` and inserts a row in the `photos` table with `original_url`.
- **Capture** (`/capture/[eventId]`) calls this API after each photo capture so photos are stored and linked to the event.

## Bucket not found

If you see an error like *"Storage bucket 'event-photos' not found"*, create the bucket as above and retry.
