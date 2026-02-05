import { redirect } from 'next/navigation';

/**
 * Redirect /album/[eventId]/edit to /album/[eventId]
 * The album page now includes full editing functionality.
 */
export default async function AlbumEditRedirectPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  redirect(`/album/${eventId}`);
}
