'use client';

import CaptureSession from '@/components/CaptureSession';

interface StoryConversationModalProps {
  photoId: string;
  photoUrl: string;
  existingSummary?: string | null;
  onClose: () => void;
  onStoryGenerated: (story: string) => void;
}

/**
 * StoryConversationModal - Uses CaptureSession in story mode
 * Shows a static image on the left and EVA conversation on the right
 */
export default function StoryConversationModal({ 
  photoId, 
  photoUrl, 
  existingSummary,
  onClose, 
  onStoryGenerated 
}: StoryConversationModalProps) {
  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Modal container - same size/rounded edges as EVA capture modal */}
      <div className="absolute inset-4 md:inset-8 lg:inset-12 rounded-2xl overflow-hidden shadow-2xl">
        <CaptureSession
          eventId=""
          isModal={true}
          mode="story"
          storyPhotoId={photoId}
          storyPhotoUrl={photoUrl}
          existingSummary={existingSummary}
          onClose={onClose}
          onStoryGenerated={onStoryGenerated}
        />
      </div>
    </div>
  );
}
