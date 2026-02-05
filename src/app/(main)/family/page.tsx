'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { GeminiLiveClient, getAuthToken } from '@/lib/gemini-live';

// EVA components - loaded client-side only
const EVAOrb = dynamic(() => import('@/components/EVAOrb'), { ssr: false });
const AuroraWave = dynamic(() => import('@/components/capture/AuroraWave').then(mod => ({ default: mod.AuroraWave })), { ssr: false });

// Types
interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  avatarColor: string;
  birthYear?: string;
  photoCount: number;
  privatePhotoCount: number;
  x: number;
  y: number;
  parentIds?: string[];
  partnerId?: string;
}

interface Connection {
  id: string;
  fromId: string;
  toId: string;
  type: 'parent-child' | 'partner';
}

interface MemberPhoto {
  id: string;
  url: string;
  albumName: string;
  isPrivate: boolean;
  year?: string;
}

// Colors for new members
const AVATAR_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', 
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
];

// Relationship options
const RELATIONSHIPS = [
  'Father', 'Mother', 'Son', 'Daughter', 'Brother', 'Sister',
  'Grandfather', 'Grandmother', 'Grandson', 'Granddaughter',
  'Uncle', 'Aunt', 'Cousin', 'Nephew', 'Niece', 'Spouse', 'Partner',
];

// Initial mock family - spread out on canvas
const INITIAL_FAMILY: FamilyMember[] = [
  // Grandparents
  { id: 'gp1', name: 'William', relationship: 'Grandfather', avatarColor: '#6b7280', x: 200, y: 100, partnerId: 'gp2', birthYear: '1935', photoCount: 24, privatePhotoCount: 3 },
  { id: 'gp2', name: 'Margaret', relationship: 'Grandmother', avatarColor: '#9ca3af', x: 350, y: 100, partnerId: 'gp1', birthYear: '1938', photoCount: 31, privatePhotoCount: 5 },
  { id: 'gp3', name: 'Robert', relationship: 'Grandfather', avatarColor: '#78716c', x: 600, y: 100, partnerId: 'gp4', birthYear: '1932', photoCount: 18, privatePhotoCount: 2 },
  { id: 'gp4', name: 'Eleanor', relationship: 'Grandmother', avatarColor: '#a8a29e', x: 750, y: 100, partnerId: 'gp3', birthYear: '1936', photoCount: 22, privatePhotoCount: 4 },
  
  // Parents
  { id: 'p1', name: 'James', relationship: 'Father', avatarColor: '#3b82f6', x: 350, y: 280, parentIds: ['gp1', 'gp2'], partnerId: 'p2', birthYear: '1962', photoCount: 67, privatePhotoCount: 8 },
  { id: 'p2', name: 'Susan', relationship: 'Mother', avatarColor: '#ec4899', x: 500, y: 280, parentIds: ['gp3', 'gp4'], partnerId: 'p1', birthYear: '1965', photoCount: 89, privatePhotoCount: 12 },
  { id: 'p3', name: 'David', relationship: 'Uncle', avatarColor: '#2563eb', x: 100, y: 280, parentIds: ['gp1', 'gp2'], partnerId: 'p4', birthYear: '1958', photoCount: 34, privatePhotoCount: 4 },
  { id: 'p4', name: 'Linda', relationship: 'Aunt', avatarColor: '#db2777', x: 250, y: 280, partnerId: 'p3', birthYear: '1960', photoCount: 28, privatePhotoCount: 3 },
  { id: 'p5', name: 'Thomas', relationship: 'Uncle', avatarColor: '#1d4ed8', x: 700, y: 280, parentIds: ['gp3', 'gp4'], birthYear: '1970', photoCount: 19, privatePhotoCount: 2 },
  
  // You & Siblings & Cousins
  { id: 's1', name: 'Michael', relationship: 'Brother', avatarColor: '#60a5fa', x: 300, y: 460, parentIds: ['p1', 'p2'], birthYear: '1988', photoCount: 45, privatePhotoCount: 6 },
  { id: 'me', name: 'You', relationship: 'Self', avatarColor: '#8b5cf6', x: 450, y: 460, parentIds: ['p1', 'p2'], birthYear: '1990', photoCount: 156, privatePhotoCount: 24 },
  { id: 's2', name: 'Sarah', relationship: 'Sister', avatarColor: '#f472b6', x: 600, y: 460, parentIds: ['p1', 'p2'], birthYear: '1993', photoCount: 78, privatePhotoCount: 11 },
  { id: 'c1', name: 'Jessica', relationship: 'Cousin', avatarColor: '#f9a8d4', x: 100, y: 460, parentIds: ['p3', 'p4'], birthYear: '1991', photoCount: 38, privatePhotoCount: 5 },
  { id: 'c2', name: 'Ryan', relationship: 'Cousin', avatarColor: '#38bdf8', x: 750, y: 460, parentIds: ['p5'], birthYear: '1998', photoCount: 22, privatePhotoCount: 3 },
  
  // Children
  { id: 'ch1', name: 'Emma', relationship: 'Daughter', avatarColor: '#a78bfa', x: 380, y: 640, parentIds: ['me'], birthYear: '2018', photoCount: 234, privatePhotoCount: 45 },
  { id: 'ch2', name: 'Liam', relationship: 'Son', avatarColor: '#67e8f9', x: 520, y: 640, parentIds: ['me'], birthYear: '2020', photoCount: 189, privatePhotoCount: 38 },
  { id: 'ch3', name: 'Oliver', relationship: 'Nephew', avatarColor: '#86efac', x: 230, y: 640, parentIds: ['s1'], birthYear: '2019', photoCount: 67, privatePhotoCount: 9 },
  { id: 'ch4', name: 'Sophia', relationship: 'Niece', avatarColor: '#fda4af', x: 670, y: 640, parentIds: ['s2'], birthYear: '2021', photoCount: 89, privatePhotoCount: 12 },
];

// Generate connections from family data
function generateConnections(family: FamilyMember[]): Connection[] {
  const connections: Connection[] = [];
  
  family.forEach(member => {
    // Parent-child connections
    if (member.parentIds) {
      member.parentIds.forEach(parentId => {
        connections.push({
          id: `${parentId}-${member.id}`,
          fromId: parentId,
          toId: member.id,
          type: 'parent-child',
        });
      });
    }
    
    // Partner connections (only add once)
    if (member.partnerId && member.id < member.partnerId) {
      connections.push({
        id: `partner-${member.id}-${member.partnerId}`,
        fromId: member.id,
        toId: member.partnerId,
        type: 'partner',
      });
    }
  });
  
  return connections;
}

// Mock photos
function getPhotosForMember(memberId: string, members: FamilyMember[]): MemberPhoto[] {
  const member = members.find(m => m.id === memberId);
  if (!member) return [];
  const count = Math.min(member.photoCount, 6);
  return Array.from({ length: count }, (_, i) => ({
    id: `${memberId}-${i}`,
    url: `/pic${(i % 9) + 1}.jpg`,
    albumName: i % 2 === 0 ? 'Family Album' : 'Memories',
    isPrivate: i < Math.min(member.privatePhotoCount, 2),
    year: String(2020 - Math.floor(Math.random() * 30)),
  }));
}

export default function FamilyPage() {
  // Canvas state
  const [family, setFamily] = useState<FamilyMember[]>(INITIAL_FAMILY);
  const [connections, setConnections] = useState<Connection[]>(() => generateConnections(INITIAL_FAMILY));
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  // Drag state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Selection & UI state
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingFromId, setAddingFromId] = useState<string | null>(null);
  const [addingType, setAddingType] = useState<'child' | 'partner' | 'parent' | null>(null);
  const [showPrivate, setShowPrivate] = useState(false);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [showEvaInfo, setShowEvaInfo] = useState(false);
  
  // Connection drawing mode
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingFrom, setDrawingFrom] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [connectionType, setConnectionType] = useState<'parent-child' | 'partner'>('parent-child');
  
  // EVA Live API states
  const [isEvaConnected, setIsEvaConnected] = useState(false);
  const [isEvaConnecting, setIsEvaConnecting] = useState(false);
  const [isEvaSpeaking, setIsEvaSpeaking] = useState(false);
  const [evaMessage, setEvaMessage] = useState('');
  const evaClientRef = useRef<GeminiLiveClient | null>(null);
  
  // New member form
  const [newName, setNewName] = useState('');
  const [newRelationship, setNewRelationship] = useState('');
  const [newBirthYear, setNewBirthYear] = useState('');
  const [newColor, setNewColor] = useState(AVATAR_COLORS[0]);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load user's name from localStorage and update the "me" node
  useEffect(() => {
    const storedName = localStorage.getItem('userName');
    if (storedName) {
      setFamily(prev => prev.map(m => 
        m.id === 'me' ? { ...m, name: storedName } : m
      ));
    }
  }, []);

  // Handle wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setScale(s => Math.min(Math.max(s * delta, 0.3), 2));
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  // Center tree in viewport (scaleToUse: pass 1 for reset, or omit to use current scale)
  const centerTree = useCallback((scaleToUse?: number) => {
    const container = containerRef.current;
    if (!container || family.length === 0) return;
    const s = scaleToUse ?? scale;
    const minX = Math.min(...family.map(m => m.x));
    const maxX = Math.max(...family.map(m => m.x + 100));
    const minY = Math.min(...family.map(m => m.y));
    const maxY = Math.max(...family.map(m => m.y + 120));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const { width, height } = container.getBoundingClientRect();
    setOffset({
      x: width / 2 - centerX * s,
      y: height / 2 - centerY * s,
    });
  }, [family, scale]);

  // Center tree on initial mount only
  useEffect(() => {
    centerTree(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // EVA Knowledge Base explanation script
  const evaKnowledgeBaseScript = `This Family Tree you're looking at? It's the foundation for something really exciting I'm working on.

Soon, I'll be able to recognize faces across all your photos automatically. I'll know that's Grandma Margaret in that beach photo from 1985, and connect her to the stories you've already shared about her.

I'll remember context too. When you tell me a story about one photo, I can weave that knowledge into other memories. Like knowing your parents met at that specific restaurant before I narrate their anniversary photos.

The relationships here will help me tell richer stories. Instead of just describing what I see, I'll say things like "Here's little Emma with her great-grandmother Margaret, four generations together."

And when your family members send you questions, I'll help them ask about the right people, the right moments. Pretty amazing what we're building together, right?`;

  // Connect to EVA Live API
  const connectEvaLive = useCallback(async () => {
    if (isEvaConnecting || isEvaConnected) return;
    
    setIsEvaConnecting(true);
    setShowEvaInfo(true);
    
    try {
      const auth = await getAuthToken();
      const apiKey = auth.apiKey || auth.token;
      if (!apiKey) throw new Error('Failed to get API credentials');
      
      const client = new GeminiLiveClient(apiKey, {
        responseModalities: ['AUDIO'],
        systemInstruction: `You are EVA (pronounced EE-vuh), a warm AI companion for Living Memory. You're explaining the upcoming Knowledge Base feature for the Family Tree. Speak naturally, warmly, and conversationally. Keep it engaging but don't ramble. Read this script naturally, adding your own warmth: "${evaKnowledgeBaseScript}"`,
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Kore',
            },
          },
        },
      }, {
        onConnect: () => {
          setIsEvaConnected(true);
          setIsEvaConnecting(false);
          // Trigger EVA to explain the feature
          client.sendText("Explain the Knowledge Base feature warmly and conversationally.");
        },
        onDisconnect: () => {
          setIsEvaConnected(false);
          setIsEvaSpeaking(false);
        },
        onMessage: (message) => {
          if (message.type === 'model' && message.content) {
            setEvaMessage(message.content);
          }
        },
        onAudio: () => {
          setIsEvaSpeaking(true);
        },
        onTurnComplete: () => {
          setIsEvaSpeaking(false);
        },
        onError: (error) => {
          console.error('EVA Live error:', error);
          setIsEvaConnecting(false);
          setIsEvaConnected(false);
        },
      });
      
      evaClientRef.current = client;
      await client.connect();
    } catch (error) {
      console.error('Failed to connect EVA:', error);
      setIsEvaConnecting(false);
    }
  }, [isEvaConnecting, isEvaConnected, evaKnowledgeBaseScript]);

  // Cleanup EVA connection on modal close
  useEffect(() => {
    if (!showEvaInfo && evaClientRef.current) {
      evaClientRef.current.disconnect();
      evaClientRef.current = null;
      setIsEvaConnected(false);
      setIsEvaSpeaking(false);
      setEvaMessage('');
    }
  }, [showEvaInfo]);

  // Keyboard handler for drawing mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (drawingFrom) {
          setDrawingFrom(null);
        } else if (isDrawingMode) {
          setIsDrawingMode(false);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawingMode, drawingFrom]);

  // Pan handlers
  const handlePanStart = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-bg')) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  const handlePanMove = (e: React.MouseEvent) => {
    // Track mouse position for drawing lines
    if (isDrawingMode && drawingFrom) {
      setMousePos({
        x: (e.clientX - offset.x) / scale,
        y: (e.clientY - offset.y) / scale,
      });
    }
    
    if (isPanning) {
      setOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
    
    if (draggingId && !isDrawingMode) {
      const member = family.find(m => m.id === draggingId);
      if (member) {
        const newX = (e.clientX - offset.x) / scale - dragOffset.x;
        const newY = (e.clientY - offset.y) / scale - dragOffset.y;
        setFamily(prev => prev.map(m => 
          m.id === draggingId ? { ...m, x: newX, y: newY } : m
        ));
      }
    }
  };

  const handlePanEnd = () => {
    setIsPanning(false);
    if (!isDrawingMode) {
      setDraggingId(null);
    }
  };
  
  // Handle connecting two nodes in drawing mode
  const handleNodeClickForConnection = (memberId: string) => {
    if (!isDrawingMode) return;
    
    if (!drawingFrom) {
      // Start drawing from this node
      setDrawingFrom(memberId);
      const member = family.find(m => m.id === memberId);
      if (member) {
        setMousePos({ x: member.x + 50, y: member.y + 50 });
      }
    } else if (drawingFrom !== memberId) {
      // Complete the connection
      const fromMember = family.find(m => m.id === drawingFrom);
      const toMember = family.find(m => m.id === memberId);
      
      if (fromMember && toMember) {
        // Check if connection already exists
        const existingConnection = connections.find(
          c => (c.fromId === drawingFrom && c.toId === memberId) ||
               (c.fromId === memberId && c.toId === drawingFrom)
        );
        
        if (!existingConnection) {
          if (connectionType === 'partner') {
            // Update partner IDs on both members
            setFamily(prev => prev.map(m => {
              if (m.id === drawingFrom) return { ...m, partnerId: memberId };
              if (m.id === memberId) return { ...m, partnerId: drawingFrom };
              return m;
            }));
            setConnections(prev => [...prev, {
              id: `partner-${drawingFrom}-${memberId}`,
              fromId: drawingFrom,
              toId: memberId,
              type: 'partner',
            }]);
          } else {
            // Parent-child: from is parent, to is child
            setFamily(prev => prev.map(m => {
              if (m.id === memberId) {
                return { ...m, parentIds: [...(m.parentIds || []), drawingFrom] };
              }
              return m;
            }));
            setConnections(prev => [...prev, {
              id: `${drawingFrom}-${memberId}`,
              fromId: drawingFrom,
              toId: memberId,
              type: 'parent-child',
            }]);
          }
        }
      }
      
      // Reset drawing state
      setDrawingFrom(null);
    } else {
      // Clicked same node, cancel
      setDrawingFrom(null);
    }
  };

  // Node drag handlers
  const handleNodeDragStart = (e: React.MouseEvent, member: FamilyMember) => {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setDraggingId(member.id);
    setDragOffset({
      x: (e.clientX - offset.x) / scale - member.x,
      y: (e.clientY - offset.y) / scale - member.y,
    });
  };

  // Add member
  const handleAddMember = () => {
    if (!newName.trim()) return;
    
    const baseMember = addingFromId ? family.find(m => m.id === addingFromId) : null;
    const newId = `member-${Date.now()}`;
    
    let newX = 500;
    let newY = 400;
    let parentIds: string[] | undefined;
    let partnerId: string | undefined;
    
    if (baseMember) {
      if (addingType === 'child') {
        newX = baseMember.x + (Math.random() - 0.5) * 100;
        newY = baseMember.y + 180;
        parentIds = [baseMember.id];
        if (baseMember.partnerId) {
          parentIds.push(baseMember.partnerId);
        }
      } else if (addingType === 'partner') {
        newX = baseMember.x + 150;
        newY = baseMember.y;
        partnerId = baseMember.id;
        // Update the base member to have this as partner
        setFamily(prev => prev.map(m => 
          m.id === baseMember.id ? { ...m, partnerId: newId } : m
        ));
      } else if (addingType === 'parent') {
        newX = baseMember.x + (Math.random() - 0.5) * 100;
        newY = baseMember.y - 180;
      }
    }
    
    const newMember: FamilyMember = {
      id: newId,
      name: newName,
      relationship: newRelationship || 'Family',
      avatarColor: newColor,
      birthYear: newBirthYear || undefined,
      photoCount: Math.floor(Math.random() * 50) + 10,
      privatePhotoCount: Math.floor(Math.random() * 10),
      x: newX,
      y: newY,
      parentIds,
      partnerId,
    };
    
    setFamily(prev => [...prev, newMember]);
    
    // Add connections
    if (addingType === 'child' && parentIds) {
      parentIds.forEach(pid => {
        setConnections(prev => [...prev, {
          id: `${pid}-${newId}`,
          fromId: pid,
          toId: newId,
          type: 'parent-child',
        }]);
      });
    } else if (addingType === 'partner' && baseMember) {
      setConnections(prev => [...prev, {
        id: `partner-${baseMember.id}-${newId}`,
        fromId: baseMember.id,
        toId: newId,
        type: 'partner',
      }]);
    } else if (addingType === 'parent' && baseMember) {
      // Update the child to have this new parent
      setFamily(prev => prev.map(m => 
        m.id === baseMember.id 
          ? { ...m, parentIds: [...(m.parentIds || []), newId] }
          : m
      ));
      setConnections(prev => [...prev, {
        id: `${newId}-${baseMember.id}`,
        fromId: newId,
        toId: baseMember.id,
        type: 'parent-child',
      }]);
    }
    
    // Reset form
    setShowAddModal(false);
    setAddingFromId(null);
    setAddingType(null);
    setNewName('');
    setNewRelationship('');
    setNewBirthYear('');
    setNewColor(AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]);
  };

  // Draw connection line
  const drawConnection = (conn: Connection) => {
    const from = family.find(m => m.id === conn.fromId);
    const to = family.find(m => m.id === conn.toId);
    if (!from || !to) return null;
    
    const fromX = from.x + 50;
    const fromY = from.y + 50;
    const toX = to.x + 50;
    const toY = to.y + 50;
    
    if (conn.type === 'partner') {
      // Straight line with heart
      const midX = (fromX + toX) / 2;
      const midY = (fromY + toY) / 2;
      return (
        <g key={conn.id}>
          <line
            x1={fromX}
            y1={fromY}
            x2={toX}
            y2={toY}
            stroke="rgba(236, 72, 153, 0.5)"
            strokeWidth="2"
            strokeDasharray="5,5"
          />
          <circle cx={midX} cy={midY} r="12" fill="rgba(236, 72, 153, 0.2)" />
          <text x={midX} y={midY + 4} textAnchor="middle" fontSize="12" fill="#ec4899">♥</text>
        </g>
      );
    } else {
      // Parent-child: orthogonal lines
      const midY = fromY + (toY - fromY) / 2;
      return (
        <g key={conn.id}>
          <path
            d={`M ${fromX} ${fromY + 40} L ${fromX} ${midY} L ${toX} ${midY} L ${toX} ${toY - 40}`}
            fill="none"
            stroke="rgba(139, 92, 246, 0.4)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Arrow at end */}
          <polygon
            points={`${toX},${toY - 40} ${toX - 6},${toY - 52} ${toX + 6},${toY - 52}`}
            fill="rgba(139, 92, 246, 0.4)"
          />
        </g>
      );
    }
  };

  const memberPhotos = selectedMember ? getPhotosForMember(selectedMember.id, family) : [];
  const visiblePhotos = showPrivate ? memberPhotos : memberPhotos.filter(p => !p.isPrivate);

  return (
    <div className="min-h-screen pt-[88px] md:pt-[96px] bg-[#0a0908] overflow-hidden">
      {/* Header */}
      <div className="absolute top-[88px] md:top-[96px] left-0 right-0 z-20 px-6 py-4 bg-gradient-to-b from-[#0a0908] via-[#0a0908]/90 to-transparent pointer-events-none">
        <div className="flex items-center justify-between max-w-7xl mx-auto pointer-events-auto">
          <div className="flex items-center gap-4">
            <EVAOrb size={40} isSpeaking={false} />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-white">Family Tree</h1>
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-semibold uppercase tracking-wider rounded">
                  Beta
                </span>
              </div>
              <p className="text-white/40 text-xs">
                {family.length} members · Drag to move · Scroll to zoom · Click + buttons to add
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Draw connection toggle */}
            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
              <button
                onClick={() => {
                  setIsDrawingMode(!isDrawingMode);
                  setDrawingFrom(null);
                }}
                className={`px-3 py-1.5 rounded text-xs transition-colors flex items-center gap-2 ${
                  isDrawingMode 
                    ? 'bg-cyan-500 text-white' 
                    : 'text-white/50 hover:text-white hover:bg-white/10'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                {isDrawingMode ? 'Drawing' : 'Draw Lines'}
              </button>
              
              {isDrawingMode && (
                <select
                  value={connectionType}
                  onChange={(e) => setConnectionType(e.target.value as 'parent-child' | 'partner')}
                  className="bg-white/10 text-white text-xs px-2 py-1.5 rounded border-none focus:outline-none"
                >
                  <option value="parent-child">Parent → Child</option>
                  <option value="partner">Partner ♥</option>
                </select>
              )}
            </div>
            
            {/* Zoom controls */}
            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
              <button
                onClick={() => setScale(s => Math.max(s * 0.8, 0.3))}
                className="w-8 h-8 rounded flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              >
                −
              </button>
              <span className="text-white/50 text-xs w-12 text-center">{Math.round(scale * 100)}%</span>
              <button
                onClick={() => setScale(s => Math.min(s * 1.2, 2))}
                className="w-8 h-8 rounded flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              >
                +
              </button>
            </div>
            
            {/* Reset view */}
            <button
              onClick={() => { setScale(1); centerTree(1); }}
              className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/50 hover:text-white text-xs transition-colors"
            >
              Reset View
            </button>
            
            {/* Add new member */}
            <button
              onClick={() => {
                setAddingFromId(null);
                setAddingType(null);
                setShowAddModal(true);
              }}
              className="px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg text-purple-400 text-xs transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Member
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Container */}
      <div
        ref={containerRef}
        className={`w-full h-[calc(100vh-88px)] md:h-[calc(100vh-96px)] overflow-hidden ${
          isDrawingMode 
            ? 'cursor-crosshair' 
            : 'cursor-grab active:cursor-grabbing'
        }`}
        onMouseDown={handlePanStart}
        onMouseMove={handlePanMove}
        onMouseUp={handlePanEnd}
        onMouseLeave={() => {
          handlePanEnd();
          if (isDrawingMode) setDrawingFrom(null);
        }}
      >
        {/* Canvas with transform */}
        <div
          ref={canvasRef}
          className="canvas-bg relative"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            width: '2000px',
            height: '1500px',
            backgroundImage: `
              radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)
            `,
            backgroundSize: '40px 40px',
          }}
        >
          {/* SVG for connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            {connections.map(drawConnection)}
            
            {/* Drawing preview line */}
            {isDrawingMode && drawingFrom && (() => {
              const fromMember = family.find(m => m.id === drawingFrom);
              if (!fromMember) return null;
              const fromX = fromMember.x + 50;
              const fromY = fromMember.y + 50;
              return (
                <line
                  x1={fromX}
                  y1={fromY}
                  x2={mousePos.x}
                  y2={mousePos.y}
                  stroke={connectionType === 'partner' ? 'rgba(236, 72, 153, 0.7)' : 'rgba(6, 182, 212, 0.7)'}
                  strokeWidth="3"
                  strokeDasharray="8,4"
                  strokeLinecap="round"
                />
              );
            })()}
          </svg>

          {/* Family member nodes */}
          {family.map(member => {
            const isYou = member.id === 'me';
            const isSelected = selectedMember?.id === member.id;
            const isDragging = draggingId === member.id;
            const isDrawingSource = drawingFrom === member.id;
            
            return (
              <div
                key={member.id}
                className={`absolute transition-shadow ${isDragging ? 'z-50' : 'z-10'}`}
                style={{
                  left: member.x,
                  top: member.y,
                  width: 100,
                }}
              >
                {/* Main node */}
                <div
                  className={`relative bg-[#1a1715] rounded-2xl p-3 border transition-all select-none ${
                    isDrawingMode ? 'cursor-crosshair' : 'cursor-move'
                  } ${
                    isDrawingSource
                      ? 'border-cyan-500 shadow-lg shadow-cyan-500/30 ring-2 ring-cyan-500/50'
                      : isSelected 
                        ? 'border-purple-500 shadow-lg shadow-purple-500/20' 
                        : 'border-white/10 hover:border-white/20'
                  } ${isYou && !isDrawingSource ? 'ring-2 ring-purple-500/30' : ''} ${
                    isDragging ? 'scale-105 shadow-2xl' : ''
                  }`}
                  onMouseDown={(e) => {
                    if (!isDrawingMode) {
                      handleNodeDragStart(e, member);
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isDrawingMode) {
                      handleNodeClickForConnection(member.id);
                    } else if (!isDragging) {
                      setSelectedMember(isSelected ? null : member);
                    }
                  }}
                >
                  {/* Avatar */}
                  <div 
                    className="w-12 h-12 rounded-full mx-auto flex items-center justify-center text-white text-lg font-medium"
                    style={{ backgroundColor: member.avatarColor }}
                  >
                    {member.id === 'me' ? '👤' : member.name.charAt(0)}
                  </div>
                  
                  {/* Name */}
                  <p className={`text-center text-xs font-medium mt-2 truncate ${isYou ? 'text-purple-400' : 'text-white'}`}>
                    {member.name}
                  </p>
                  <p className="text-center text-[10px] text-white/40 truncate">{member.relationship}</p>
                  {member.birthYear && (
                    <p className="text-center text-[9px] text-white/20">{member.birthYear}</p>
                  )}
                  
                  {/* Photo count badge */}
                  <div className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-purple-500/80 rounded-full">
                    <span className="text-[9px] text-white font-medium">{member.photoCount}</span>
                  </div>
                </div>
                
                {/* Action buttons (visible on hover) */}
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 hover:opacity-100 transition-opacity group-hover:opacity-100"
                  style={{ opacity: isSelected ? 1 : undefined }}
                >
                  {/* Add child */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAddingFromId(member.id);
                      setAddingType('child');
                      setShowAddModal(true);
                    }}
                    className="w-6 h-6 rounded-full bg-purple-500 hover:bg-purple-400 flex items-center justify-center text-white text-xs shadow-lg transition-colors"
                    title="Add child"
                  >
                    ↓
                  </button>
                  
                  {/* Add partner */}
                  {!member.partnerId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAddingFromId(member.id);
                        setAddingType('partner');
                        setShowAddModal(true);
                      }}
                      className="w-6 h-6 rounded-full bg-pink-500 hover:bg-pink-400 flex items-center justify-center text-white text-xs shadow-lg transition-colors"
                      title="Add partner"
                    >
                      ♥
                    </button>
                  )}
                  
                  {/* Add parent */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAddingFromId(member.id);
                      setAddingType('parent');
                      setShowAddModal(true);
                    }}
                    className="w-6 h-6 rounded-full bg-blue-500 hover:bg-blue-400 flex items-center justify-center text-white text-xs shadow-lg transition-colors"
                    title="Add parent"
                  >
                    ↑
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected member panel */}
      {selectedMember && (
        <div className="fixed bottom-4 left-4 right-4 md:right-auto md:left-4 md:w-96 bg-[#1a1715]/95 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl z-30 overflow-hidden animate-in slide-in-from-left-4 duration-300">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                style={{ backgroundColor: selectedMember.avatarColor }}
              >
                {selectedMember.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-white font-medium text-sm">{selectedMember.name}</h3>
                <p className="text-white/40 text-xs">{selectedMember.relationship} · {selectedMember.photoCount} photos</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedMember(null)}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50"
            >
              ✕
            </button>
          </div>
          
          <div className="p-4">
            {visiblePhotos.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {visiblePhotos.slice(0, 6).map(photo => (
                  <div key={photo.id} className="aspect-square rounded-lg overflow-hidden bg-black/50 relative group">
                    <img src={photo.url} alt="" className="w-full h-full object-cover" />
                    {photo.isPrivate && (
                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
                        <span className="text-amber-400 text-[8px]">🔒</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/40 text-sm text-center py-4">No photos to show</p>
            )}
            
            {selectedMember.privatePhotoCount > 0 && (
              <button
                onClick={() => setShowPrivate(!showPrivate)}
                className="w-full mt-3 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/50 text-xs transition-colors"
              >
                {showPrivate ? 'Hide' : 'Show'} {selectedMember.privatePhotoCount} private photos
              </button>
            )}
          </div>
        </div>
      )}

      {/* Add member modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1715] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10">
              <h2 className="text-white font-semibold">
                {addingType === 'child' && 'Add Child'}
                {addingType === 'partner' && 'Add Partner'}
                {addingType === 'parent' && 'Add Parent'}
                {!addingType && 'Add Family Member'}
              </h2>
              {addingFromId && (
                <p className="text-white/40 text-sm">
                  Connected to {family.find(m => m.id === addingFromId)?.name}
                </p>
              )}
            </div>
            
            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-white/50 text-xs mb-1">Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                  placeholder="Enter name..."
                  autoFocus
                />
              </div>
              
              {/* Relationship */}
              <div>
                <label className="block text-white/50 text-xs mb-1">Relationship</label>
                <select
                  value={newRelationship}
                  onChange={e => setNewRelationship(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="">Select...</option>
                  {RELATIONSHIPS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              
              {/* Birth Year */}
              <div>
                <label className="block text-white/50 text-xs mb-1">Birth Year (optional)</label>
                <input
                  type="text"
                  value={newBirthYear}
                  onChange={e => setNewBirthYear(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                  placeholder="e.g. 1990"
                />
              </div>
              
              {/* Color picker */}
              <div>
                <label className="block text-white/50 text-xs mb-2">Avatar Color</label>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setNewColor(color)}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        newColor === color ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#1a1715]' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-white/10 flex gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setAddingFromId(null);
                  setAddingType(null);
                }}
                className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/70 text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                disabled={!newName.trim()}
                className="flex-1 px-4 py-2 bg-purple-500 hover:bg-purple-400 disabled:bg-purple-500/30 rounded-lg text-white text-sm font-medium transition-colors"
              >
                Add Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions overlay */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/5 backdrop-blur rounded-full text-white/40 text-xs z-20 pointer-events-none">
        {isDrawingMode ? (
          <span className="text-cyan-400">
            Drawing mode: Click a node to start, click another to connect • {connectionType === 'partner' ? '♥ Partner' : '↓ Parent→Child'} • ESC to cancel
          </span>
        ) : (
          'Drag nodes to move • Ctrl/Cmd + Scroll to zoom • Use "Draw Lines" to connect nodes'
        )}
      </div>

      {/* EVA Orb - Fixed corner (matching /album style) */}
      <div className="fixed bottom-6 right-6 z-50">
        <EVAOrb onClick={connectEvaLive} size={120} />
      </div>

      {/* EVA Knowledge Base Panel - Smaller side panel */}
      {showEvaInfo && (
        <div className="fixed bottom-24 right-6 z-[100] w-80 animate-in slide-in-from-right-4 duration-300">
          {/* Panel */}
          <div className="rounded-2xl overflow-hidden bg-gradient-to-b from-[#0a0a0f] to-[#0f0a15] border border-white/10 shadow-2xl flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isEvaConnected ? 'bg-green-500' : isEvaConnecting ? 'bg-yellow-500 animate-pulse' : 'bg-white/30'}`} />
                <span className="text-white/70 text-xs">
                  {isEvaConnecting ? 'Connecting...' : isEvaConnected ? 'EVA Live' : 'EVA'}
                </span>
                <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[8px] font-semibold uppercase tracking-wider rounded">
                  Beta
                </span>
              </div>
              <button
                onClick={() => setShowEvaInfo(false)}
                className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* EVA Section */}
            <div className="p-4 flex items-start gap-3">
              <div className="flex-shrink-0">
                <EVAOrb size={56} isSpeaking={isEvaSpeaking} />
              </div>
              
              <div className="flex-1 min-w-0">
                {isEvaConnecting ? (
                  <p className="text-white/50 text-xs">Waking up EVA...</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-white text-sm font-medium">Knowledge Base</p>
                    <p className="text-white/60 text-xs leading-relaxed">
                      {isEvaSpeaking ? 'Listening to EVA...' : 'Click below to hear about upcoming family recognition features.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Feature pills */}
            <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                <span className="px-2 py-1 bg-purple-500/10 rounded-full text-[10px] text-purple-400">🔍 Face recognition</span>
                <span className="px-2 py-1 bg-blue-500/10 rounded-full text-[10px] text-blue-400">🧠 Memory links</span>
                <span className="px-2 py-1 bg-pink-500/10 rounded-full text-[10px] text-pink-400">💬 Smart stories</span>
              </div>
            
            {/* Aurora Wave */}
            <div className="h-12 relative">
              <AuroraWave 
                isActive={isEvaSpeaking} 
                isAISpeaking={isEvaSpeaking} 
                userAudioLevel={0} 
              />
            </div>
            
            {/* Action button */}
            {!isEvaConnected && !isEvaConnecting && (
              <div className="px-4 pb-4">
                <button
                  onClick={connectEvaLive}
                  className="w-full px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl text-sm font-medium hover:from-purple-500 hover:to-purple-400 transition-all"
                >
                  Let EVA Explain
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
