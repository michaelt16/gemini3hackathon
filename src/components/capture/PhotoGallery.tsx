'use client';

import { useState } from 'react';

interface Photo {
  id: string;
  imageData: string;
  timestamp: number;
  story?: string;
  isExtracting?: boolean;
  isGeneratingStory?: boolean;
  extractionMethod?: string;
  hasConversation?: boolean;
}

interface PhotoGalleryProps {
  photos: Photo[];
  currentPhotoId: string | null;
  selectedPhotoId: string | null;
  onSelectPhoto: (id: string | null) => void;
  onRemovePhoto: (id: string, reason: 'delete' | 'retake') => void;
  onEnhancePhoto?: (id: string) => Promise<void>;
  getExtractionLabel: (method?: string) => string;
}

export function PhotoGallery({ 
  photos, 
  currentPhotoId, 
  selectedPhotoId, 
  onSelectPhoto,
  onRemovePhoto,
  onEnhancePhoto,
  getExtractionLabel,
}: PhotoGalleryProps) {
  const [enhancingId, setEnhancingId] = useState<string | null>(null);
  
  const handleEnhance = async (photoId: string) => {
    if (!onEnhancePhoto || enhancingId) return;
    setEnhancingId(photoId);
    try {
      await onEnhancePhoto(photoId);
    } finally {
      setEnhancingId(null);
    }
  };
  
  return (
    <div 
      className="absolute top-16 right-4 bottom-48 w-80 z-30 rounded-2xl overflow-hidden backdrop-blur-xl"
      style={{ background: 'rgba(15,15,20,0.9)', border: '1px solid rgba(255,255,255,0.1)' }}
    >
      <div className="p-4 border-b border-white/10">
        <h3 className="text-white font-medium">Captured Photos</h3>
        <p className="text-white/50 text-xs mt-1">{photos.length} photos in this session</p>
      </div>
      
      <div className="p-4 space-y-4 overflow-y-auto h-[calc(100%-80px)] scrollbar-hide">
        {photos.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
              <svg className="w-8 h-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <p className="text-white/40 text-sm">No photos captured yet</p>
            <p className="text-white/30 text-xs mt-1">Use the capture button while showing a photo</p>
          </div>
        ) : (
          photos.map((photo) => (
            <div 
              key={photo.id}
              className={`rounded-xl overflow-hidden cursor-pointer transition-all ${
                selectedPhotoId === photo.id ? 'ring-2 ring-green-400' : 'hover:ring-2 hover:ring-white/30'
              }`}
              onClick={() => onSelectPhoto(selectedPhotoId === photo.id ? null : photo.id)}
            >
              <div className="relative aspect-[4/3]">
                <img 
                  src={photo.imageData} 
                  alt="Captured"
                  className={`w-full h-full object-cover transition-all ${photo.isExtracting ? 'opacity-50 blur-sm' : ''}`}
                />
                {/* Extracting overlay */}
                {photo.isExtracting && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="text-center">
                      <div className="w-8 h-8 mx-auto border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <p className="text-white/80 text-xs mt-2">Processing...</p>
                    </div>
                  </div>
                )}
                {/* Status badge */}
                {photo.id === currentPhotoId ? (
                  <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-blue-500/90 flex items-center justify-center text-white text-sm" title="Currently discussing">
                    💬
                  </div>
                ) : photo.hasConversation || photo.story ? (
                  <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-green-500/90 flex items-center justify-center" title="Discussed">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                ) : null}
                {/* Extraction method badge */}
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs bg-green-500/80 text-white">
                  {getExtractionLabel(photo.extractionMethod)}
                </div>
              </div>

              {/* Simple status bar */}
              <div className="px-2 py-1.5 bg-white/5 border-t border-white/5 text-center text-white/50 text-xs">
                {photo.isGeneratingStory ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <span className="w-2.5 h-2.5 border border-cyan-400/50 border-t-cyan-400 rounded-full animate-spin" />
                    Generating story...
                  </span>
                ) : photo.story ? (
                  '✅ Story captured'
                ) : photo.hasConversation ? (
                  '💬 Has conversation'
                ) : (
                  'Tap to expand'
                )}
              </div>
              
              {/* Expanded view: actions */}
              {selectedPhotoId === photo.id && (
                <div className="p-3 bg-white/5 space-y-3">
                  {/* Story section - always visible */}
                  <div className="p-3 rounded-lg bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                      </svg>
                      <span className="text-xs text-cyan-300 font-medium uppercase tracking-wider">Story</span>
                      {photo.isGeneratingStory && (
                        <span className="ml-auto w-3 h-3 border border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                      )}
                    </div>
                    {photo.isGeneratingStory ? (
                      <p className="text-white/50 text-sm italic">Generating recap...</p>
                    ) : photo.story ? (
                      <p className="text-white/80 text-sm leading-relaxed">{photo.story}</p>
                    ) : (
                      <p className="text-white/40 text-sm italic">Talk to EVA about this photo to capture its story</p>
                    )}
                  </div>
                  
                  {/* Enhance button - only show if not already enhanced */}
                  {onEnhancePhoto && photo.extractionMethod !== 'nano-banana' && (
                    <button
                      type="button"
                      disabled={enhancingId === photo.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEnhance(photo.id);
                      }}
                      className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                        enhancingId === photo.id
                          ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-300/50 cursor-wait'
                          : 'bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/30'
                      }`}
                    >
                      {enhancingId === photo.id ? (
                        <>
                          <span className="w-4 h-4 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
                          Enhancing...
                        </>
                      ) : (
                        <>
                          🍌 Enhance (Full Frame)
                        </>
                      )}
                    </button>
                  )}
                  
                  {/* Retake / Delete buttons */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemovePhoto(photo.id, 'retake');
                      }}
                      className="flex-1 py-2 px-3 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-sm font-medium hover:bg-amber-500/30 transition-colors"
                    >
                      Retake
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemovePhoto(photo.id, 'delete');
                      }}
                      className="flex-1 py-2 px-3 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-sm font-medium hover:bg-red-500/30 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
