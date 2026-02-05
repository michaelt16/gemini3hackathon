'use client';

import { useState, useRef, useCallback } from 'react';

interface Photo {
  id: string;
  original_url: string | null;
  thumbnail_url: string | null;
  order_in_album: number | null;
  has_story: boolean;
  completeness: number;
  summary: string | null;
}

interface TimelineEditorProps {
  photos: Photo[];
  eventId: string;
  onOrderChange: (newOrder: Photo[]) => void;
}

export default function TimelineEditor({ photos, eventId, onOrderChange }: TimelineEditorProps) {
  const [items, setItems] = useState<Photo[]>(photos);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevPhotosRef = useRef<Photo[]>(photos);

  // Update items when photos prop changes (e.g., on page load with fresh data)
  if (prevPhotosRef.current !== photos) {
    prevPhotosRef.current = photos;
    // Only reset if photos actually changed (not just reference)
    const photosChanged = photos.length !== items.length || 
      photos.some((p, i) => p.id !== items[i]?.id);
    if (photosChanged) {
      setItems(photos);
    }
  }

  const handleDragStart = useCallback((e: React.DragEvent, photoId: string) => {
    setDraggedId(photoId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', photoId);
    // Add a slight delay to show the drag styling
    setTimeout(() => {
      const el = document.getElementById(`timeline-item-${photoId}`);
      if (el) el.style.opacity = '0.5';
    }, 0);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDragOverId(null);
    // Reset opacity
    items.forEach((item) => {
      const el = document.getElementById(`timeline-item-${item.id}`);
      if (el) el.style.opacity = '1';
    });
  }, [items]);

  const handleDragOver = useCallback((e: React.DragEvent, photoId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (photoId !== draggedId) {
      setDragOverId(photoId);
    }
  }, [draggedId]);

  const handleDragLeave = useCallback(() => {
    setDragOverId(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    
    if (sourceId === targetId) {
      setDragOverId(null);
      return;
    }

    setItems((prev) => {
      const newItems = [...prev];
      const sourceIndex = newItems.findIndex((p) => p.id === sourceId);
      const targetIndex = newItems.findIndex((p) => p.id === targetId);
      
      if (sourceIndex === -1 || targetIndex === -1) return prev;

      // Remove from source and insert at target
      const [removed] = newItems.splice(sourceIndex, 1);
      newItems.splice(targetIndex, 0, removed);

      return newItems;
    });

    setDragOverId(null);
    setSaved(false);
  }, []);

  const saveOrder = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      const photoIds = items.map((p) => p.id);
      const res = await fetch(`/api/events/${eventId}/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_ids: photoIds }),
      });
      
      if (res.ok) {
        setSaved(true);
        onOrderChange(items);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      console.error('Failed to save order:', err);
    } finally {
      setSaving(false);
    }
  }, [items, eventId, onOrderChange]);

  const moveItem = useCallback((index: number, direction: 'left' | 'right') => {
    const newIndex = direction === 'left' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;

    setItems((prev) => {
      const newItems = [...prev];
      [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
      return newItems;
    });
    setSaved(false);
  }, [items.length]);

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
          <span className="text-4xl">🎬</span>
        </div>
        <p className="text-white/50 mb-2">No photos to arrange</p>
        <p className="text-white/30 text-sm">Capture photos first, then arrange them here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timeline header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-white/50 text-sm">{items.length} photos in timeline</span>
          {items.length >= 3 && (
            <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs">
              Ready for video
            </span>
          )}
        </div>
        <button
          onClick={saveOrder}
          disabled={saving || saved}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            saved
              ? 'bg-green-500/20 text-green-400'
              : saving
              ? 'bg-white/10 text-white/50 cursor-not-allowed'
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save Order'}
        </button>
      </div>

      {/* Timeline ruler */}
      <div className="relative">
        <div className="absolute top-0 left-0 right-0 h-6 flex items-end border-b border-white/10">
          {items.map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[180px] text-center text-white/30 text-xs pb-1"
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Timeline track */}
      <div
        ref={scrollRef}
        className="relative overflow-x-auto pb-4 pt-8"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.2) transparent' }}
      >
        {/* Track line */}
        <div className="absolute top-[50%] left-0 right-0 h-0.5 bg-white/10" style={{ minWidth: `${items.length * 180}px` }} />

        {/* Items */}
        <div className="flex gap-3" style={{ minWidth: `${items.length * 180}px` }}>
          {items.map((photo, index) => (
            <div
              key={photo.id}
              id={`timeline-item-${photo.id}`}
              draggable
              onDragStart={(e) => handleDragStart(e, photo.id)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, photo.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, photo.id)}
              className={`relative flex-shrink-0 w-[168px] cursor-grab active:cursor-grabbing transition-all duration-200 ${
                dragOverId === photo.id ? 'scale-105' : ''
              } ${draggedId === photo.id ? 'opacity-50' : ''}`}
            >
              {/* Drop indicator */}
              {dragOverId === photo.id && draggedId !== photo.id && (
                <div className="absolute -left-2 top-0 bottom-0 w-1 bg-green-400 rounded-full" />
              )}

              {/* Card */}
              <div
                className={`rounded-lg overflow-hidden border transition-colors ${
                  dragOverId === photo.id
                    ? 'border-green-400 bg-green-400/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                {/* Thumbnail */}
                <div className="aspect-video relative">
                  {photo.thumbnail_url || photo.original_url ? (
                    <img
                      src={photo.thumbnail_url || photo.original_url || ''}
                      alt=""
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                  ) : (
                    <div className="w-full h-full bg-white/5 flex items-center justify-center text-white/20 text-2xl">
                      📷
                    </div>
                  )}

                  {/* Order number */}
                  <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white text-xs font-medium">
                    {index + 1}
                  </div>

                  {/* Story indicator */}
                  {photo.has_story && (
                    <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                  )}

                  {/* Move arrows */}
                  <div className="absolute bottom-1 left-1 right-1 flex justify-between opacity-0 hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); moveItem(index, 'left'); }}
                      disabled={index === 0}
                      className="w-6 h-6 rounded bg-black/60 flex items-center justify-center text-white/80 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      ←
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); moveItem(index, 'right'); }}
                      disabled={index === items.length - 1}
                      className="w-6 h-6 rounded bg-black/60 flex items-center justify-center text-white/80 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      →
                    </button>
                  </div>
                </div>

                {/* Summary */}
                <div className="p-2">
                  <p className="text-white/70 text-xs line-clamp-2 h-8">
                    {photo.summary || (
                      <span className="text-white/30 italic">No story yet</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Timeline connector dot */}
              <div className="absolute left-1/2 -translate-x-1/2 -bottom-4 w-3 h-3 rounded-full bg-white/20 border-2 border-white/10" />
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="text-center text-white/40 text-xs pt-4">
        Drag photos to reorder • Click arrows to move • Save when done
      </div>
    </div>
  );
}
