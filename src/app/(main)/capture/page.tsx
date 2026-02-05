import { redirect } from 'next/navigation';

/**
 * Redirect /capture to /album
 * EVA capture is now a modal on the album page.
 */
export default function CaptureRedirectPage() {
  redirect('/album');
}
