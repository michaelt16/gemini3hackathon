'use client';

import { useState, useEffect, useCallback } from 'react';

interface ScriptSegment {
  photo_id: string;
  order: number;
  text: string;
  word_count: number;
  audio_url?: string;
}

interface Photo {
  id: string;
  original_url: string | null;
  thumbnail_url: string | null;
  summary: string | null;
}

interface Narration {
  id: string;
  photo_order: string[];
  full_script: string;
  script_segments: ScriptSegment[];
}

interface NarrationEditorProps {
  eventId: string;
  photos: Photo[];
  onNarrationChange?: (narration: Narration) => void;
}

export default function NarrationEditor({ eventId, photos, onNarrationChange }: NarrationEditorProps) {
  const [narration, setNarration] = useState<Narration | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [savingSegment, setSavingSegment] = useState<string | null>(null);
  const [regeneratingSegment, setRegeneratingSegment] = useState<string | null>(null);
  const [generatingAudio, setGeneratingAudio] = useState(false);

  // Load existing narration
  useEffect(() => {
    async function loadNarration() {
      try {
        const res = await fetch(`/api/events/${eventId}/narration`);
        if (res.ok) {
          const data = await res.json();
          if (data.narration) {
            setNarration(data.narration);
          }
        }
      } catch (err) {
        console.error('Failed to load narration:', err);
      } finally {
        setLoading(false);
      }
    }
    loadNarration();
  }, [eventId]);

  const generateNarration = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/events/${eventId}/narration`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        const newNarration: Narration = {
          id: data.narration_id,
          photo_order: photos.map(p => p.id),
          full_script: data.full_script,
          script_segments: data.segments,
        };
        setNarration(newNarration);
        onNarrationChange?.(newNarration);
      }
    } catch (err) {
      console.error('Failed to generate narration:', err);
    } finally {
      setGenerating(false);
    }
  }, [eventId, photos, onNarrationChange]);

  const startEditing = useCallback((segment: ScriptSegment) => {
    setEditingSegmentId(segment.photo_id);
    setEditText(segment.text);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingSegmentId(null);
    setEditText('');
  }, []);

  const saveSegment = useCallback(async () => {
    if (!editingSegmentId || !editText.trim()) return;
    
    setSavingSegment(editingSegmentId);
    try {
      const res = await fetch(`/api/events/${eventId}/narration/segment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo_id: editingSegmentId,
          text: editText.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setNarration(prev => prev ? {
          ...prev,
          full_script: data.full_script,
          script_segments: prev.script_segments.map(s =>
            s.photo_id === editingSegmentId ? data.segment : s
          ),
        } : null);
        setEditingSegmentId(null);
        setEditText('');
      }
    } catch (err) {
      console.error('Failed to save segment:', err);
    } finally {
      setSavingSegment(null);
    }
  }, [editingSegmentId, editText, eventId]);

  const regenerateSegment = useCallback(async (photoId: string) => {
    setRegeneratingSegment(photoId);
    try {
      const res = await fetch(`/api/events/${eventId}/narration/segment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo_id: photoId,
          regenerate: true,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setNarration(prev => prev ? {
          ...prev,
          full_script: data.full_script,
          script_segments: prev.script_segments.map(s =>
            s.photo_id === photoId ? data.segment : s
          ),
        } : null);
      }
    } catch (err) {
      console.error('Failed to regenerate segment:', err);
    } finally {
      setRegeneratingSegment(null);
    }
  }, [eventId]);

  const generateAudio = useCallback(async () => {
    setGeneratingAudio(true);
    try {
      const res = await fetch(`/api/events/${eventId}/narration/audio`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        // Update segments with audio URLs
        if (data.segments && narration) {
          const audioMap = new Map(data.segments.map((s: { photo_id: string; audio_url: string }) => [s.photo_id, s.audio_url]));
          const updatedSegments = narration.script_segments.map(seg => ({
            ...seg,
            audio_url: audioMap.get(seg.photo_id) as string || seg.audio_url,
          }));
          setNarration({
            ...narration,
            script_segments: updatedSegments,
          });
        }
      }
    } catch (err) {
      console.error('Failed to generate audio:', err);
    } finally {
      setGeneratingAudio(false);
    }
  }, [eventId, narration]);

  const hasAudio = narration?.script_segments?.some(s => s.audio_url) || false;

  const getPhotoForSegment = (photoId: string) => photos.find(p => p.id === photoId);

  if (loading) {
    return (
      <div className="text-center py-12 text-white/50">
        Loading narration...
      </div>
    );
  }

  if (!narration) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
          <span className="text-4xl">📝</span>
        </div>
        <h3 className="text-lg font-medium text-white mb-2">No Narration Yet</h3>
        <p className="text-white/50 mb-6 max-w-md mx-auto">
          Generate a unified narration for your photos. The AI will create a cohesive story that flows across all your memories.
        </p>
        <button
          onClick={generateNarration}
          disabled={generating || photos.length === 0}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {generating ? 'Generating...' : 'Generate Narration'}
        </button>
        {photos.length === 0 && (
          <p className="text-white/40 text-sm mt-3">Add photos to your album first</p>
        )}
      </div>
    );
  }

  const segments = narration.script_segments || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-white">Album Narration</h3>
          <p className="text-sm text-white/50">
            {segments.length} segments • ~{segments.reduce((acc, s) => acc + s.word_count, 0)} words
            {hasAudio && ' • Audio ready'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={generateAudio}
            disabled={generatingAudio || !narration}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {generatingAudio ? 'Generating Audio...' : hasAudio ? '🔊 Regenerate Audio' : '🔊 Generate Audio'}
          </button>
          <button
            onClick={generateNarration}
            disabled={generating}
            className="px-4 py-2 bg-white/10 text-white rounded-full text-sm hover:bg-white/20 disabled:opacity-50 transition-colors"
          >
            {generating ? 'Regenerating...' : 'Regenerate All'}
          </button>
        </div>
      </div>

      {/* Segments */}
      <div className="space-y-4">
        {segments.map((segment, index) => {
          const photo = getPhotoForSegment(segment.photo_id);
          const isEditing = editingSegmentId === segment.photo_id;
          const isSaving = savingSegment === segment.photo_id;
          const isRegenerating = regeneratingSegment === segment.photo_id;

          return (
            <div
              key={segment.photo_id}
              className="flex gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:border-white/20 transition-colors"
            >
              {/* Photo thumbnail */}
              <div className="flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden bg-white/10">
                {photo?.thumbnail_url || photo?.original_url ? (
                  <img
                    src={photo.thumbnail_url || photo.original_url || ''}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/30 text-xl">
                    📷
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Order label */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-white/10 rounded text-xs text-white/70">
                    {index === 0 ? 'Opening' : index === segments.length - 1 ? 'Closing' : `Part ${index + 1}`}
                  </span>
                  <span className="text-xs text-white/40">
                    ~{segment.word_count} words
                  </span>
                  {segment.audio_url && (
                    <span className="text-xs text-green-400">🔊</span>
                  )}
                </div>

                {/* Text or edit field */}
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/40 resize-none"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={saveSegment}
                        disabled={isSaving}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="px-3 py-1 bg-white/10 text-white rounded text-sm hover:bg-white/20"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className={`text-white/90 ${isRegenerating ? 'opacity-50' : ''}`}>
                    {isRegenerating ? 'Regenerating...' : segment.text}
                  </p>
                )}
              </div>

              {/* Actions */}
              {!isEditing && (
                <div className="flex-shrink-0 flex flex-col gap-1">
                  <button
                    onClick={() => startEditing(segment)}
                    disabled={isRegenerating}
                    className="px-3 py-1 text-white/50 hover:text-white hover:bg-white/10 rounded text-sm transition-colors"
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => regenerateSegment(segment.photo_id)}
                    disabled={isRegenerating}
                    className="px-3 py-1 text-white/50 hover:text-white hover:bg-white/10 rounded text-sm transition-colors"
                    title="Regenerate"
                  >
                    🔄
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Full script preview */}
      <div className="p-4 rounded-xl border border-white/10 bg-white/5">
        <h4 className="text-sm font-semibold text-white/80 uppercase tracking-wide mb-2">
          Full Script Preview
        </h4>
        <p className="text-white/70 leading-relaxed">
          {narration.full_script}
        </p>
      </div>
    </div>
  );
}
