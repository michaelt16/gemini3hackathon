'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface PhotoChatPanelProps {
  photoId: string;
  photoUrl: string | null;
  onClose: () => void;
  onStoryUpdated?: () => void;
}

export default function PhotoChatPanel({ photoId, photoUrl, onClose, onStoryUpdated }: PhotoChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load existing chat history
  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch(`/api/photos/${photoId}/chat`);
        if (res.ok) {
          const data = await res.json();
          if (data.messages?.length > 0) {
            setMessages(data.messages.map((m: { role: string; content: string }) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            })));
          }
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      } finally {
        setLoadingHistory(false);
      }
    }
    loadHistory();
  }, [photoId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch(`/api/photos/${photoId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: messages,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I had trouble responding. Please try again.' }]);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, photoId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const extractFacts = useCallback(async () => {
    if (messages.length < 2) return; // Need at least one exchange
    
    setExtracting(true);
    try {
      const res = await fetch(`/api/photos/${photoId}/extract-facts`, {
        method: 'POST',
      });
      
      if (res.ok) {
        onStoryUpdated?.();
      }
    } catch (err) {
      console.error('Extract facts error:', err);
    } finally {
      setExtracting(false);
    }
  }, [photoId, messages.length, onStoryUpdated]);

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex">
      {/* Photo side */}
      <div className="w-1/2 p-8 flex items-center justify-center bg-black">
        {photoUrl ? (
          <img 
            src={photoUrl} 
            alt="Photo" 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
        ) : (
          <div className="text-6xl opacity-30">📷</div>
        )}
      </div>

      {/* Chat side */}
      <div className="w-1/2 flex flex-col bg-[#1a1816]">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Tell Your Story</h2>
            <p className="text-sm text-white/50">Share the memories behind this photo</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loadingHistory ? (
            <div className="text-center text-white/50 py-8">Loading conversation...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center text-3xl">
                💬
              </div>
              <p className="text-white/70 mb-2">Ready to hear your story!</p>
              <p className="text-white/40 text-sm">Tell me about this photo. Who's in it? What was happening?</p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/10 text-white/90'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/10 rounded-2xl px-4 py-2 text-white/50">
                <span className="inline-flex gap-1">
                  <span className="animate-bounce">.</span>
                  <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-white/10">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-full bg-white/10 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-white/30"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors"
            >
              ➤
            </button>
          </div>

          {/* Actions */}
          {messages.length >= 2 && (
            <div className="mt-3 flex justify-between items-center">
              <p className="text-xs text-white/40">
                {messages.filter(m => m.role === 'user').length} messages shared
              </p>
              <button
                onClick={extractFacts}
                disabled={extracting}
                className="px-4 py-2 rounded-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
              >
                {extracting ? 'Saving...' : 'Done - Save Story'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
