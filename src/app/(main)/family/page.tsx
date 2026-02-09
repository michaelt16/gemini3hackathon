'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { GeminiLiveClient, getAuthToken } from '@/lib/gemini-live';
import { useTheme } from '@/contexts/ThemeContext';

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

// Initial mock family
// Node width: 150px, Generation gap: 260px, Partner gap: ~170px
const NODE_W = 150;
const INITIAL_FAMILY: FamilyMember[] = [
  // Grandparents (y=80)
  { id: 'gp1', name: 'William', relationship: 'Grandfather', avatarColor: '#6b7280', x: 340, y: 80, partnerId: 'gp2', birthYear: '1935', photoCount: 24, privatePhotoCount: 3 },
  { id: 'gp2', name: 'Margaret', relationship: 'Grandmother', avatarColor: '#9ca3af', x: 510, y: 80, partnerId: 'gp1', birthYear: '1938', photoCount: 31, privatePhotoCount: 5 },
  { id: 'gp3', name: 'Robert', relationship: 'Grandfather', avatarColor: '#78716c', x: 760, y: 80, partnerId: 'gp4', birthYear: '1932', photoCount: 18, privatePhotoCount: 2 },
  { id: 'gp4', name: 'Eleanor', relationship: 'Grandmother', avatarColor: '#a8a29e', x: 930, y: 80, partnerId: 'gp3', birthYear: '1936', photoCount: 22, privatePhotoCount: 4 },

  // Parents (y=340)
  { id: 'p3', name: 'David', relationship: 'Uncle', avatarColor: '#2563eb', x: 140, y: 340, parentIds: ['gp1', 'gp2'], partnerId: 'p4', birthYear: '1958', photoCount: 34, privatePhotoCount: 4 },
  { id: 'p4', name: 'Linda', relationship: 'Aunt', avatarColor: '#db2777', x: 310, y: 340, partnerId: 'p3', birthYear: '1960', photoCount: 28, privatePhotoCount: 3 },
  { id: 'p1', name: 'James', relationship: 'Father', avatarColor: '#3b82f6', x: 540, y: 340, parentIds: ['gp1', 'gp2'], partnerId: 'p2', birthYear: '1962', photoCount: 67, privatePhotoCount: 8 },
  { id: 'p2', name: 'Susan', relationship: 'Mother', avatarColor: '#ec4899', x: 710, y: 340, parentIds: ['gp3', 'gp4'], partnerId: 'p1', birthYear: '1965', photoCount: 89, privatePhotoCount: 12 },
  { id: 'p5', name: 'Thomas', relationship: 'Uncle', avatarColor: '#1d4ed8', x: 960, y: 340, parentIds: ['gp3', 'gp4'], birthYear: '1970', photoCount: 19, privatePhotoCount: 2 },

  // You & Siblings (y=600)
  { id: 'c1', name: 'Jessica', relationship: 'Cousin', avatarColor: '#f9a8d4', x: 160, y: 600, parentIds: ['p3', 'p4'], birthYear: '1991', photoCount: 38, privatePhotoCount: 5 },
  { id: 's1', name: 'Michael', relationship: 'Brother', avatarColor: '#60a5fa', x: 400, y: 600, parentIds: ['p1', 'p2'], birthYear: '1988', photoCount: 45, privatePhotoCount: 6 },
  { id: 'me', name: 'You', relationship: 'Self', avatarColor: '#8b5cf6', x: 570, y: 600, parentIds: ['p1', 'p2'], birthYear: '1990', photoCount: 156, privatePhotoCount: 24 },
  { id: 's2', name: 'Sarah', relationship: 'Sister', avatarColor: '#f472b6', x: 740, y: 600, parentIds: ['p1', 'p2'], birthYear: '1993', photoCount: 78, privatePhotoCount: 11 },
  { id: 'c2', name: 'Ryan', relationship: 'Cousin', avatarColor: '#38bdf8', x: 1000, y: 600, parentIds: ['p5'], birthYear: '1998', photoCount: 22, privatePhotoCount: 3 },

  // Children (y=860)
  { id: 'ch3', name: 'Oliver', relationship: 'Nephew', avatarColor: '#86efac', x: 330, y: 860, parentIds: ['s1'], birthYear: '2019', photoCount: 67, privatePhotoCount: 9 },
  { id: 'ch1', name: 'Emma', relationship: 'Daughter', avatarColor: '#a78bfa', x: 500, y: 860, parentIds: ['me'], birthYear: '2018', photoCount: 234, privatePhotoCount: 45 },
  { id: 'ch2', name: 'Liam', relationship: 'Son', avatarColor: '#67e8f9', x: 670, y: 860, parentIds: ['me'], birthYear: '2020', photoCount: 189, privatePhotoCount: 38 },
  { id: 'ch4', name: 'Sophia', relationship: 'Niece', avatarColor: '#fda4af', x: 840, y: 860, parentIds: ['s2'], birthYear: '2021', photoCount: 89, privatePhotoCount: 12 },
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
  const { theme } = useTheme();
  const isDark = theme === 'dark';

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
    const maxX = Math.max(...family.map(m => m.x + NODE_W));
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

  // Cleanup EVA connection on unmount (when navigating away)
  useEffect(() => {
    return () => {
      if (evaClientRef.current) {
        console.log('🎤 Disconnecting EVA on page unmount');
        evaClientRef.current.disconnect();
        evaClientRef.current = null;
      }
    };
  }, []);

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
        setMousePos({ x: member.x + NODE_W / 2, y: member.y + 50 });
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
    
    const fromCx = from.x + NODE_W / 2;
    const toCx = to.x + NODE_W / 2;
    const lineColor = isDark ? 'rgba(148,163,184,0.16)' : 'rgba(100,116,139,0.13)';
    
    if (conn.type === 'partner') {
      // Clean horizontal connector between partners
      const leftNode = from.x < to.x ? from : to;
      const rightNode = from.x < to.x ? to : from;
      const lineStart = leftNode.x + NODE_W - 8;
      const lineEnd = rightNode.x + 8;
      const y = Math.min(from.y, to.y) + 42;
      return (
        <g key={conn.id}>
          <line
            x1={lineStart} y1={y} x2={lineEnd} y2={y}
            stroke={lineColor}
            strokeWidth="1.5"
          />
          {/* Small ring at midpoint instead of heart */}
          <circle
            cx={(lineStart + lineEnd) / 2} cy={y} r="4"
            fill="none"
            stroke={isDark ? 'rgba(148,163,184,0.25)' : 'rgba(100,116,139,0.2)'}
            strokeWidth="1.5"
          />
        </g>
      );
    } else {
      // Parent → child: smooth bezier
      const fromBottom = from.y + 130;
      const toTop = to.y + 4;
      const dist = Math.abs(toTop - fromBottom);
      const cp = Math.max(dist * 0.5, 50);
      return (
        <g key={conn.id}>
          <path
            d={`M ${fromCx} ${fromBottom} C ${fromCx} ${fromBottom + cp}, ${toCx} ${toTop - cp}, ${toCx} ${toTop}`}
            fill="none"
            stroke={lineColor}
            strokeWidth="1.5"
          />
        </g>
      );
    }
  };

  const memberPhotos = selectedMember ? getPhotosForMember(selectedMember.id, family) : [];
  const visiblePhotos = showPrivate ? memberPhotos : memberPhotos.filter(p => !p.isPrivate);

  return (
    <div className="min-h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Gradient Background */}
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 30% 20%, rgba(139,92,246,0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(6,182,212,0.06) 0%, transparent 50%)'
        }}
      />
      
      {/* Header - Floating glass effect */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-4xl px-4">
        <div 
          className="rounded-2xl px-5 py-3 flex items-center justify-between backdrop-blur-xl"
          style={{ 
            background: isDark ? 'rgba(20,20,24,0.85)' : 'rgba(237,231,218,0.92)',
            border: '1px solid var(--border-subtle)',
            boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)'
          }}
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(6,182,212,0.3))' }}
              >
                <svg className={`w-5 h-5 ${isDark ? 'text-white' : 'text-gray-700'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
            </div>
            <div>
              <h1 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-[var(--text-primary)]'}`} style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>Family Tree</h1>
              <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>{family.length} members</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Draw connection toggle */}
            <button
              onClick={() => {
                setIsDrawingMode(!isDrawingMode);
                setDrawingFrom(null);
              }}
              className={`px-3 py-2 rounded-xl text-xs transition-all flex items-center gap-2 ${
                isDrawingMode 
                  ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white shadow-lg shadow-purple-500/20' 
                  : isDark ? 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10' : 'bg-black/5 text-gray-600 hover:text-gray-900 hover:bg-black/10'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              {isDrawingMode ? 'Drawing' : 'Connect'}
            </button>
            
            {isDrawingMode && (
              <select
                value={connectionType}
                onChange={(e) => setConnectionType(e.target.value as 'parent-child' | 'partner')}
                className={`${isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-[var(--text-primary)]'} text-xs px-3 py-2 rounded-xl border-none focus:outline-none`}
              >
                <option value="parent-child">Parent → Child</option>
                <option value="partner">Partner ♥</option>
              </select>
            )}
            
            {/* Zoom controls */}
            <div className={`flex items-center gap-1 rounded-xl px-1 py-1 ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
              <button
                onClick={() => setScale(s => Math.max(s * 0.8, 0.3))}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isDark ? 'text-white/50 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-gray-900 hover:bg-black/10'}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                </svg>
              </button>
              <span className={`text-[10px] w-10 text-center font-mono ${isDark ? 'text-white/40' : 'text-gray-500'}`}>{Math.round(scale * 100)}%</span>
              <button
                onClick={() => setScale(s => Math.min(s * 1.2, 2))}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isDark ? 'text-white/50 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-gray-900 hover:bg-black/10'}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            
            {/* Reset view */}
            <button
              onClick={() => { setScale(1); centerTree(1); }}
              className={`p-2 rounded-xl transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10 text-white/50 hover:text-white' : 'bg-black/5 hover:bg-black/10 text-gray-500 hover:text-gray-900'}`}
              title="Reset View"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            
            {/* Add new member */}
            <button
              onClick={() => {
                setAddingFromId(null);
                setAddingType(null);
                setShowAddModal(true);
              }}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg, var(--eva-cyan), var(--eva-teal))', color: 'white' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Container */}
      <div
        ref={containerRef}
        className={`w-full h-screen overflow-hidden ${
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
          }}
        >
          {/* Generation row labels */}
          {[
            { y: 50, label: 'Grandparents' },
            { y: 310, label: 'Parents' },
            { y: 570, label: 'You & Siblings' },
            { y: 830, label: 'Children' },
          ].map(gen => (
            <div
              key={gen.label}
              className="absolute pointer-events-none"
              style={{ left: 24, top: gen.y }}
            >
              <span
                className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${isDark ? 'text-white/[0.06]' : 'text-gray-300/50'}`}
                style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)', letterSpacing: '0.25em' }}
              >
                {gen.label}
              </span>
            </div>
          ))}

          {/* Subtle generation horizon lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {[240, 480, 740].map(y => (
              <line key={y} x1="70" y1={y} x2="1300" y2={y} stroke={isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.025)'} strokeWidth="1" />
            ))}
          </svg>

          {/* SVG for connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
            {connections.map(drawConnection)}
            
            {/* Drawing preview line */}
            {isDrawingMode && drawingFrom && (() => {
              const fromMember = family.find(m => m.id === drawingFrom);
              if (!fromMember) return null;
              const fromX = fromMember.x + NODE_W / 2;
              const fromY = fromMember.y + 50;
              return (
                <line
                  x1={fromX} y1={fromY} x2={mousePos.x} y2={mousePos.y}
                  stroke={connectionType === 'partner' ? 'rgba(244,114,182,0.5)' : 'rgba(6,182,212,0.5)'}
                  strokeWidth="2"
                  strokeDasharray="6,4"
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
                className={`absolute transition-all duration-150 group ${isDragging ? 'z-50' : 'z-10'}`}
                style={{ left: member.x, top: member.y, width: NODE_W }}
              >
                {/* Frosted glass card backing */}
                <div
                  className={`absolute -inset-x-3 -inset-y-2 rounded-2xl transition-all duration-200 ${
                    isSelected
                      ? isDark ? 'bg-white/[0.06] shadow-lg shadow-cyan-500/10' : 'bg-white/80 shadow-lg shadow-gray-200/60'
                      : isDark ? 'bg-transparent group-hover:bg-white/[0.03]' : 'bg-transparent group-hover:bg-white/40'
                  }`}
                  style={{
                    backdropFilter: isSelected ? 'blur(12px)' : undefined,
                    border: isSelected
                      ? isDark ? '1px solid rgba(6,182,212,0.2)' : '1px solid rgba(6,182,212,0.15)'
                      : '1px solid transparent',
                  }}
                />

                {/* Main node */}
                <div
                  className={`relative flex flex-col items-center select-none ${
                    isDrawingMode ? 'cursor-crosshair' : 'cursor-move'
                  } ${isDragging ? 'scale-110' : 'group-hover:scale-[1.03]'} transition-transform`}
                  onMouseDown={(e) => { if (!isDrawingMode) handleNodeDragStart(e, member); }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isDrawingMode) handleNodeClickForConnection(member.id);
                    else if (!isDragging) setSelectedMember(isSelected ? null : member);
                  }}
                >
                  {/* Avatar */}
                  <div className="relative">
                    {/* "You" — animated ring */}
                    {isYou && (
                      <>
                        <div className="absolute -inset-[8px] rounded-full pointer-events-none" style={{ border: '2px solid rgba(6,182,212,0.12)' }} />
                        <div className="absolute -inset-[14px] rounded-full pointer-events-none animate-[spin_15s_linear_infinite]" style={{ border: '1.5px dashed rgba(6,182,212,0.08)' }} />
                      </>
                    )}
                    {/* Selection ring */}
                    {(isSelected || isDrawingSource) && !isYou && (
                      <div
                        className="absolute -inset-[6px] rounded-full transition-all"
                        style={{
                          border: `2px solid ${isDrawingSource ? '#06b6d4' : 'rgba(6,182,212,0.35)'}`,
                          boxShadow: isDrawingSource ? '0 0 20px rgba(6,182,212,0.25)' : undefined,
                        }}
                      />
                    )}
                    {/* Avatar circle — 68px */}
                    <div
                      className={`relative w-[68px] h-[68px] rounded-full flex items-center justify-center text-white transition-shadow ${
                        isDragging ? 'shadow-2xl' : 'shadow-lg group-hover:shadow-xl'
                      }`}
                      style={{
                        background: isYou
                          ? `conic-gradient(from 180deg, #06b6d4, #8b5cf6, #ec4899, #06b6d4)`
                          : `linear-gradient(145deg, ${member.avatarColor}, ${member.avatarColor}bb)`,
                        boxShadow: `0 8px 24px ${member.avatarColor}20`,
                        fontSize: '24px',
                        fontWeight: 600,
                      }}
                    >
                      {isYou ? (
                        <div className="w-[58px] h-[58px] rounded-full flex items-center justify-center" style={{ background: isDark ? '#18181c' : '#f0ebe0' }}>
                          <span className="text-2xl">👤</span>
                        </div>
                      ) : (
                        member.name.charAt(0)
                      )}
                    </div>
                    {/* Online indicator */}
                    {isYou && (
                      <div className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full border-[2.5px] bg-emerald-400" style={{ borderColor: isDark ? '#18181c' : '#f0ebe0' }} />
                    )}
                  </div>

                  {/* Name & meta */}
                  <div className="mt-3 text-center w-full px-1">
                    <p
                      className={`text-sm font-semibold truncate leading-tight ${
                        isYou
                          ? isDark ? 'text-cyan-300' : 'text-teal-700'
                          : isDark ? 'text-white/90' : 'text-gray-800'
                      }`}
                      style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
                    >
                      {member.name}
                    </p>
                    <p className={`text-[11px] mt-0.5 truncate ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                      {member.relationship}
                    </p>
                    {member.birthYear && (
                      <p className={`text-[10px] mt-0.5 ${isDark ? 'text-white/15' : 'text-gray-300'}`}>
                        b. {member.birthYear}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action dots — appear on hover */}
                <div
                  className={`absolute -bottom-7 left-1/2 -translate-x-1/2 flex gap-1 transition-all duration-200 ${
                    isSelected ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0'
                  }`}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); setAddingFromId(member.id); setAddingType('parent'); setShowAddModal(true); }}
                    className={`w-[22px] h-[22px] rounded-full flex items-center justify-center transition-all hover:scale-125 ${isDark ? 'bg-white/[0.06] text-white/40 hover:bg-blue-500/30 hover:text-blue-400' : 'bg-gray-100 text-gray-400 hover:bg-blue-100 hover:text-blue-600'}`}
                    title="Add parent"
                  >
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                  </button>
                  {!member.partnerId && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setAddingFromId(member.id); setAddingType('partner'); setShowAddModal(true); }}
                      className={`w-[22px] h-[22px] rounded-full flex items-center justify-center transition-all hover:scale-125 ${isDark ? 'bg-white/[0.06] text-white/40 hover:bg-pink-500/30 hover:text-pink-400' : 'bg-gray-100 text-gray-400 hover:bg-pink-100 hover:text-pink-600'}`}
                      title="Add partner"
                    >
                      <span className="text-[8px]">♥</span>
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); setAddingFromId(member.id); setAddingType('child'); setShowAddModal(true); }}
                    className={`w-[22px] h-[22px] rounded-full flex items-center justify-center transition-all hover:scale-125 ${isDark ? 'bg-white/[0.06] text-white/40 hover:bg-purple-500/30 hover:text-purple-400' : 'bg-gray-100 text-gray-400 hover:bg-purple-100 hover:text-purple-600'}`}
                    title="Add child"
                  >
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected member panel - positioned after sidebar */}
      {selectedMember && (
        <div 
          className="fixed bottom-6 left-6 md:left-[104px] w-[calc(100%-48px)] md:w-80 backdrop-blur-xl rounded-2xl shadow-2xl z-30 overflow-hidden animate-in slide-in-from-bottom-4 md:slide-in-from-left-4 duration-300" 
          style={{ 
            background: isDark ? 'rgba(20,20,24,0.95)' : 'rgba(237,231,218,0.95)', 
            border: '1px solid var(--border-subtle)',
            boxShadow: isDark ? '0 20px 60px rgba(0,0,0,0.5)' : '0 20px 60px rgba(0,0,0,0.08)'
          }}
        >
          {/* Header with gradient */}
          <div 
            className="relative px-5 py-4"
            style={{ 
              background: `linear-gradient(135deg, ${selectedMember.avatarColor}20 0%, transparent 100%)`,
              borderBottom: '1px solid var(--border-subtle)'
            }}
          >
            <button
              onClick={() => setSelectedMember(null)}
              className={`absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center transition-all ${isDark ? 'bg-white/10 hover:bg-white/20 text-white/50 hover:text-white' : 'bg-black/5 hover:bg-black/10 text-gray-500 hover:text-gray-900'}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="flex items-center gap-4">
              <div 
                className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-medium shadow-lg"
                style={{ 
                  background: `linear-gradient(135deg, ${selectedMember.avatarColor} 0%, ${selectedMember.avatarColor}cc 100%)`,
                  boxShadow: `0 4px 20px ${selectedMember.avatarColor}40`
                }}
              >
                {selectedMember.name.charAt(0)}
              </div>
              <div>
                <h3 className={`${isDark ? 'text-white' : 'text-[var(--text-primary)]'} font-medium text-lg`} style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
                  {selectedMember.name}
                </h3>
                <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>{selectedMember.relationship}</p>
                {selectedMember.birthYear && (
                  <p className={`text-xs ${isDark ? 'text-white/30' : 'text-gray-400'}`}>Born {selectedMember.birthYear}</p>
                )}
              </div>
            </div>
          </div>
          
          {/* Stats */}
          <div className="px-5 py-3 flex gap-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="text-center flex-1">
              <p className={`text-xl font-light ${isDark ? 'text-white' : 'text-[var(--text-primary)]'}`}>{selectedMember.photoCount}</p>
              <p className={`text-[10px] uppercase tracking-wide ${isDark ? 'text-white/40' : 'text-gray-400'}`}>Photos</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-xl font-light" style={{ color: 'var(--eva-cyan)' }}>{selectedMember.privatePhotoCount}</p>
              <p className={`text-[10px] uppercase tracking-wide ${isDark ? 'text-white/40' : 'text-gray-400'}`}>Private</p>
            </div>
            <div className="text-center flex-1">
              <p className={`text-xl font-light ${isDark ? 'text-white' : 'text-[var(--text-primary)]'}`}>{family.filter(m => m.parentIds?.includes(selectedMember.id)).length}</p>
              <p className={`text-[10px] uppercase tracking-wide ${isDark ? 'text-white/40' : 'text-gray-400'}`}>Children</p>
            </div>
          </div>
          
          {/* Photos */}
          <div className="p-4">
            {visiblePhotos.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {visiblePhotos.slice(0, 6).map(photo => (
                  <div key={photo.id} className="aspect-square rounded-xl overflow-hidden bg-black/50 relative group cursor-pointer">
                    <img src={photo.url} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    {photo.isPrivate && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 backdrop-blur flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                  <svg className={`w-6 h-6 ${isDark ? 'text-white/30' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                </div>
                <p className={`text-sm ${isDark ? 'text-white/40' : 'text-gray-400'}`}>No photos yet</p>
              </div>
            )}
            
            {selectedMember.privatePhotoCount > 0 && (
              <button
                onClick={() => setShowPrivate(!showPrivate)}
                className="w-full mt-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
                style={{ 
                  background: showPrivate ? 'rgba(251,191,36,0.15)' : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                  color: showPrivate ? '#fbbf24' : isDark ? 'rgba(255,255,255,0.6)' : 'rgba(45,42,38,0.6)'
                }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={showPrivate ? "M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" : "M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"} />
                  {!showPrivate && <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />}
                </svg>
                {showPrivate ? 'Hide' : 'Show'} {selectedMember.privatePhotoCount} private
              </button>
            )}
          </div>
        </div>
      )}

      {/* Add member modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div 
            className="rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" 
            style={{ 
              background: 'var(--bg-secondary)', 
              border: '1px solid var(--border-subtle)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
            }}
          >
            {/* Header */}
            <div 
              className="px-6 py-5"
              style={{ 
                background: addingType === 'partner' 
                  ? 'linear-gradient(135deg, rgba(236,72,153,0.1) 0%, transparent 100%)'
                  : addingType === 'child'
                  ? 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, transparent 100%)'
                  : 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, transparent 100%)',
                borderBottom: '1px solid var(--border-subtle)'
              }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ 
                    background: addingType === 'partner' 
                      ? 'rgba(236,72,153,0.2)'
                      : addingType === 'child'
                      ? 'rgba(139,92,246,0.2)'
                      : 'rgba(59,130,246,0.2)'
                  }}
                >
                  {addingType === 'partner' ? (
                    <span className="text-pink-400 text-lg">♥</span>
                  ) : addingType === 'child' ? (
                    <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                    </svg>
                  )}
                </div>
                <div>
                  <h2 className={`${isDark ? 'text-white' : 'text-[var(--text-primary)]'} font-medium text-lg`} style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
                    {addingType === 'child' && 'Add Child'}
                    {addingType === 'partner' && 'Add Partner'}
                    {addingType === 'parent' && 'Add Parent'}
                    {!addingType && 'Add Family Member'}
                  </h2>
                  {addingFromId && (
                    <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                      Connected to {family.find(m => m.id === addingFromId)?.name}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-5">
              {/* Name */}
              <div>
                <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl ${isDark ? 'text-white' : 'text-[var(--text-primary)]'} text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/50 transition-all`}
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}
                  placeholder="Enter name..."
                  autoFocus
                />
              </div>
              
              {/* Relationship */}
              <div>
                <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>Relationship</label>
                <select
                  value={newRelationship}
                  onChange={e => setNewRelationship(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl ${isDark ? 'text-white' : 'text-[var(--text-primary)]'} text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/50 transition-all`}
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}
                >
                  <option value="">Select relationship...</option>
                  {RELATIONSHIPS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              
              {/* Birth Year */}
              <div>
                <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>Birth Year <span className={isDark ? 'text-white/30' : 'text-gray-400'}>(optional)</span></label>
                <input
                  type="text"
                  value={newBirthYear}
                  onChange={e => setNewBirthYear(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl ${isDark ? 'text-white' : 'text-[var(--text-primary)]'} text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/50 transition-all`}
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}
                  placeholder="e.g. 1990"
                />
              </div>
              
              {/* Color picker */}
              <div>
                <label className={`block text-xs font-medium mb-3 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>Avatar Color</label>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setNewColor(color)}
                      className={`w-9 h-9 rounded-xl transition-all ${
                        newColor === color 
                          ? 'scale-110 ring-2 ring-white ring-offset-2' 
                          : 'hover:scale-105'
                      }`}
                      style={{ 
                        backgroundColor: color,
                        boxShadow: newColor === color ? `0 4px 15px ${color}60` : undefined,
                        ['--tw-ring-offset-color' as string]: 'var(--bg-secondary)'
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 flex gap-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setAddingFromId(null);
                  setAddingType(null);
                }}
                className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${isDark ? 'text-white/70 hover:bg-white/10' : 'text-gray-600 hover:bg-black/10'}`}
                style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                disabled={!newName.trim()}
                className="flex-1 px-4 py-3 rounded-xl text-white text-sm font-medium transition-all disabled:opacity-40"
                style={{ 
                  background: newName.trim() 
                    ? 'linear-gradient(135deg, var(--eva-cyan), var(--eva-teal))' 
                    : 'rgba(6,182,212,0.2)'
                }}
              >
                Add to Tree
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions overlay */}
      <div 
        className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 backdrop-blur-xl rounded-2xl text-xs z-20 pointer-events-none"
        style={{ 
          background: isDark ? 'rgba(20,20,24,0.8)' : 'rgba(237,231,218,0.9)', 
          border: '1px solid var(--border-subtle)',
          boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.06)'
        }}
      >
        {isDrawingMode ? (
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-cyan-300">
              Click a node to start, then click another to connect
            </span>
            <span className={isDark ? 'text-white/30' : 'text-gray-400'}>•</span>
            <span className={connectionType === 'partner' ? 'text-pink-400' : 'text-purple-400'}>
              {connectionType === 'partner' ? '♥ Partner' : '↓ Parent→Child'}
            </span>
            <span className={isDark ? 'text-white/30' : 'text-gray-400'}>•</span>
            <span className={isDark ? 'text-white/40' : 'text-gray-500'}>ESC to cancel</span>
          </div>
        ) : (
          <div className={`flex items-center gap-3 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
              </svg>
              Drag to move
            </span>
            <span className={isDark ? 'text-white/20' : 'text-gray-300'}>•</span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
              </svg>
              Ctrl+Scroll to zoom
            </span>
            <span className={isDark ? 'text-white/20' : 'text-gray-300'}>•</span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Connect to link
            </span>
          </div>
        )}
      </div>

      {/* EVA Orb - Fixed corner */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="relative group">
          <div 
            className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ 
              background: 'radial-gradient(circle, rgba(6,182,212,0.3) 0%, transparent 70%)',
              filter: 'blur(15px)',
              transform: 'scale(1.5)'
            }}
          />
          <EVAOrb onClick={connectEvaLive} size={120} />
        </div>
      </div>

      {/* EVA Knowledge Base Panel */}
      {showEvaInfo && (
        <div className="fixed bottom-24 right-6 z-[100] w-80 animate-in slide-in-from-right-4 duration-300">
          <div 
            className="rounded-2xl overflow-hidden backdrop-blur-xl flex flex-col"
            style={{ 
              background: isDark ? 'rgba(20,20,24,0.95)' : 'rgba(237,231,218,0.95)', 
              border: '1px solid var(--border-subtle)',
              boxShadow: isDark ? '0 20px 60px rgba(0,0,0,0.5)' : '0 20px 60px rgba(0,0,0,0.08)'
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isEvaConnected ? 'bg-green-500' : isEvaConnecting ? 'bg-yellow-500 animate-pulse' : 'bg-cyan-400'}`} />
                <span className={`text-xs font-medium ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
                  {isEvaConnecting ? 'Connecting...' : isEvaConnected ? 'EVA Live' : 'EVA'}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider" style={{ background: 'rgba(6,182,212,0.2)', color: 'var(--eva-cyan)' }}>
                  Coming Soon
                </span>
              </div>
              <button
                onClick={() => setShowEvaInfo(false)}
                className={`p-1.5 rounded-lg transition-all ${isDark ? 'text-white/50 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-gray-700 hover:bg-black/5'}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* EVA Section */}
            <div className="p-4 flex items-start gap-4">
              <div className="flex-shrink-0">
                <EVAOrb size={48} isSpeaking={isEvaSpeaking} />
              </div>
              
              <div className="flex-1 min-w-0">
                {isEvaConnecting ? (
                  <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Waking up EVA...</p>
                ) : (
                  <div className="space-y-1">
                    <p className={`${isDark ? 'text-white' : 'text-[var(--text-primary)]'} font-medium`} style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>Knowledge Base</p>
                    <p className={`text-xs leading-relaxed ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                      {isEvaSpeaking ? 'Listening to EVA...' : 'Hear about upcoming family recognition features.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Feature pills */}
            <div className="px-4 pb-4 flex flex-wrap gap-2">
              <span className={`px-2.5 py-1 rounded-lg text-[10px] ${isDark ? 'text-purple-300' : 'text-purple-700'}`} style={{ background: 'rgba(139,92,246,0.15)' }}>🔍 Face recognition</span>
              <span className={`px-2.5 py-1 rounded-lg text-[10px] ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`} style={{ background: 'rgba(6,182,212,0.15)' }}>🧠 Memory links</span>
              <span className={`px-2.5 py-1 rounded-lg text-[10px] ${isDark ? 'text-pink-300' : 'text-pink-700'}`} style={{ background: 'rgba(236,72,153,0.15)' }}>💬 Smart stories</span>
            </div>
            
            {/* Aurora Wave */}
            <div className="h-10 relative">
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
                  className="w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{ background: 'linear-gradient(135deg, var(--eva-cyan), var(--eva-teal))', color: 'white' }}
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
