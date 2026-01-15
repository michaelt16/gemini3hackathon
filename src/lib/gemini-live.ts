/**
 * Gemini Live API Client for Browser
 * 
 * This module provides a client for connecting to Gemini's Live API
 * with support for real-time audio and video streaming.
 */

// Types for the Live API
export interface LiveConfig {
  model?: string;
  systemInstruction?: string;
  responseModalities?: ('AUDIO' | 'TEXT')[];
  speechConfig?: {
    voiceConfig?: {
      prebuiltVoiceConfig?: {
        voiceName?: string;
      };
    };
  };
}

// List of models to try for Live API - in order of preference
export const LIVE_API_MODELS = [
  'gemini-live-2.5-flash-preview',           // Text response, audio/video input
  'gemini-2.5-flash-native-audio-preview-12-2025', // Audio response
  'gemini-2.0-flash-exp',                    // Experimental multimodal
  'gemini-2.5-flash-preview-04-17',          // Preview model
];

export interface LiveMessage {
  type: 'user' | 'model' | 'system';
  content: string;
  timestamp: number;
  audioData?: string;
}

export interface LiveCallbacks {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onMessage?: (message: LiveMessage) => void;
  onAudio?: (audioData: ArrayBuffer) => void;
  onError?: (error: Error) => void;
  onInterrupted?: () => void;
  onTurnComplete?: () => void;
}

// WebSocket URL for Gemini Live API
const LIVE_API_WS_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private config: LiveConfig;
  private callbacks: LiveCallbacks;
  private audioContext: AudioContext | null = null;
  private audioWorklet: AudioWorkletNode | null = null;
  private mediaStream: MediaStream | null = null;
  private isConnected: boolean = false;
  private audioQueue: ArrayBuffer[] = [];
  private isPlaying: boolean = false;
  private playbackContext: AudioContext | null = null;
  private nextPlayTime: number = 0;
  // Buffer for accumulating model responses until turn complete
  private modelResponseBuffer: string = '';
  private userResponseBuffer: string = '';

  constructor(apiKey: string, config: LiveConfig = {}, callbacks: LiveCallbacks = {}) {
    this.apiKey = apiKey;
    this.config = {
      // Model from official docs that supports Live API bidiGenerateContent:
      // This model REQUIRES AUDIO response modality
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      responseModalities: ['AUDIO'],
      systemInstruction: 'You are a helpful, friendly AI assistant helping someone explore and share memories through photos. Keep responses conversational and brief.',
      ...config,
    };
    this.callbacks = callbacks;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Build WebSocket URL with API key
        const url = `${LIVE_API_WS_URL}?key=${this.apiKey}`;
        
        this.ws = new WebSocket(url);
        this.ws.binaryType = 'arraybuffer';

        // Store resolve/reject for use in message handler
        this.connectResolve = resolve;
        this.connectReject = reject;

        this.ws.onopen = () => {
          console.log('WebSocket connected to Gemini Live API');
          console.log('Using model:', this.config.model);
          this.sendSetupMessage();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.callbacks.onError?.(new Error('WebSocket connection error'));
          this.connectReject?.(error);
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          this.isConnected = false;
          this.callbacks.onDisconnect?.();
          // If we haven't resolved yet, this is an error
          if (!this.isConnected && this.connectReject) {
            this.connectReject(new Error(`Connection closed: ${event.reason || 'Unknown reason'}`));
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }
  
  private connectResolve?: (value: void) => void;
  private connectReject?: (reason: unknown) => void;

  private sendSetupMessage(): void {
    if (!this.ws) return;

    const setupMessage = {
      setup: {
        model: `models/${this.config.model}`,
        generationConfig: {
          responseModalities: this.config.responseModalities,
          speechConfig: this.config.speechConfig || {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Puck', // More expressive voice (options: Puck, Charon, Kore, Fenrir, Aoede)
              },
            },
          },
        },
        systemInstruction: {
          parts: [{ text: this.config.systemInstruction }],
        },
        // Enable input transcription so we can see what was said
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
    };

    this.ws.send(JSON.stringify(setupMessage));
  }

  private handleMessage(data: ArrayBuffer | string): void {
    try {
      let message: Record<string, unknown>;
      
      if (typeof data === 'string') {
        message = JSON.parse(data);
      } else {
        // Binary data - likely audio
        const text = new TextDecoder().decode(data);
        message = JSON.parse(text);
      }

      // Handle setup complete
      if (message.setupComplete) {
        console.log('Gemini Live setup complete!');
        this.isConnected = true;
        this.callbacks.onConnect?.();
        this.connectResolve?.();
        return;
      }

      // Handle server content (model responses)
      if (message.serverContent) {
        const serverContent = message.serverContent as Record<string, unknown>;
        
        // Check for interruption
        if (serverContent.interrupted) {
          this.audioQueue = []; // Clear audio queue
          this.callbacks.onInterrupted?.();
          return;
        }

        // Handle model turn - only process audio, text comes via transcription
        if (serverContent.modelTurn) {
          const modelTurn = serverContent.modelTurn as { parts?: Array<{ text?: string; inlineData?: { mimeType?: string; data?: string } }> };
          if (modelTurn.parts) {
            for (const part of modelTurn.parts) {
              // Audio response - play it
              if (part.inlineData?.data) {
                const audioData = this.base64ToArrayBuffer(part.inlineData.data);
                this.audioQueue.push(audioData);
                this.callbacks.onAudio?.(audioData);
                this.playQueuedAudio();
              }
              // Note: We skip part.text here because outputTranscription gives us 
              // the complete text, avoiding fragmented messages
            }
          }
        }

        // Handle input transcription (what the user said) - accumulate chunks
        if (serverContent.inputTranscription) {
          const transcription = serverContent.inputTranscription as { text?: string };
          if (transcription.text) {
            // Accumulate user speech
            this.userResponseBuffer += transcription.text;
          }
        }
        
        // Handle output transcription (what the AI said) - accumulate chunks
        if (serverContent.outputTranscription) {
          const transcription = serverContent.outputTranscription as { text?: string };
          if (transcription.text) {
            // Accumulate model response
            this.modelResponseBuffer += transcription.text;
          }
        }
        
        // Handle turn complete - emit the complete messages
        if (serverContent.turnComplete) {
          // Emit user message if we have accumulated content
          if (this.userResponseBuffer.trim()) {
            console.log('User said (complete):', this.userResponseBuffer.trim());
            this.callbacks.onMessage?.({
              type: 'user',
              content: this.userResponseBuffer.trim(),
              timestamp: Date.now(),
            });
            this.userResponseBuffer = '';
          }
          
          // Emit model message if we have accumulated content
          if (this.modelResponseBuffer.trim()) {
            console.log('AI said (complete):', this.modelResponseBuffer.trim());
            this.callbacks.onMessage?.({
              type: 'model',
              content: this.modelResponseBuffer.trim(),
              timestamp: Date.now(),
            });
            this.modelResponseBuffer = '';
          }
          
          this.callbacks.onTurnComplete?.();
        }
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // Send text message
  sendText(text: string): void {
    if (!this.ws || !this.isConnected) {
      console.error('Not connected to Live API');
      return;
    }

    const message = {
      clientContent: {
        turns: [
          {
            role: 'user',
            parts: [{ text }],
          },
        ],
        turnComplete: true,
      },
    };

    this.ws.send(JSON.stringify(message));
    
    this.callbacks.onMessage?.({
      type: 'user',
      content: text,
      timestamp: Date.now(),
    });
  }

  // Send audio data (PCM 16-bit, 16kHz, mono)
  sendAudio(audioData: ArrayBuffer): void {
    if (!this.ws || !this.isConnected) return;

    const message = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: 'audio/pcm;rate=16000',
            data: this.arrayBufferToBase64(audioData),
          },
        ],
      },
    };

    this.ws.send(JSON.stringify(message));
  }

  // Send video frame (JPEG)
  sendVideoFrame(frameData: string): void {
    if (!this.ws || !this.isConnected) return;

    // Remove data URL prefix if present
    const base64Data = frameData.replace(/^data:image\/\w+;base64,/, '');

    const message = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: 'image/jpeg',
            data: base64Data,
          },
        ],
      },
    };

    this.ws.send(JSON.stringify(message));
  }

  // Start microphone capture and send to API
  async startMicrophone(): Promise<void> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      this.audioContext = new AudioContext({ sampleRate: 16000 });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      // Create a script processor to capture audio data
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (event) => {
        if (!this.isConnected) return;
        
        const inputData = event.inputBuffer.getChannelData(0);
        // Convert float32 to int16
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
        }
        
        this.sendAudio(pcmData.buffer);
      };

      source.connect(processor);
      processor.connect(this.audioContext.destination);
      
      console.log('Microphone started');
    } catch (error) {
      console.error('Failed to start microphone:', error);
      throw error;
    }
  }

  // Stop microphone capture
  stopMicrophone(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  // Play audio from queue - optimized for low latency
  private playQueuedAudio(): void {
    if (this.audioQueue.length === 0) return;
    
    try {
      // Reuse existing AudioContext for lower latency
      if (!this.playbackContext || this.playbackContext.state === 'closed') {
        this.playbackContext = new AudioContext({ sampleRate: 24000 });
        this.nextPlayTime = this.playbackContext.currentTime;
      }
      
      const ctx = this.playbackContext;
      
      // Process all queued audio immediately
      while (this.audioQueue.length > 0) {
        const audioData = this.audioQueue.shift()!;
        
        // Convert PCM int16 to float32
        const int16Data = new Int16Array(audioData);
        const float32Data = new Float32Array(int16Data.length);
        for (let i = 0; i < int16Data.length; i++) {
          float32Data[i] = int16Data[i] / 32768;
        }
        
        const audioBuffer = ctx.createBuffer(1, float32Data.length, 24000);
        audioBuffer.getChannelData(0).set(float32Data);
        
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        
        // Schedule immediately or after previous chunk
        const startTime = Math.max(ctx.currentTime, this.nextPlayTime);
        source.start(startTime);
        this.nextPlayTime = startTime + audioBuffer.duration;
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  }

  // Disconnect from Live API
  disconnect(): void {
    this.stopMicrophone();
    
    if (this.playbackContext && this.playbackContext.state !== 'closed') {
      this.playbackContext.close();
      this.playbackContext = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
    this.audioQueue = [];
    this.modelResponseBuffer = '';
    this.userResponseBuffer = '';
  }

  // Check connection status
  get connected(): boolean {
    return this.isConnected;
  }
}

// Helper to get API key or token from server
export async function getAuthToken(): Promise<{ apiKey?: string; token?: string }> {
  try {
    const response = await fetch('/api/live-token', { method: 'POST' });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to get auth token:', error);
    throw error;
  }
}
