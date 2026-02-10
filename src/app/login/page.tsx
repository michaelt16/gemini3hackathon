'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';
import { setActiveUser, CurrentUser } from '@/hooks/use-current-user';

interface FamilyMember {
  id: string;
  name: string;
  email: string;
  avatar_color: string;
  relationship: string | null;
  family_code: string | null;
}

export default function LoginPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/auth/members');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setMembers(data);
        }
      } catch { /* fallback below */ }
      setLoading(false);
    }
    load();
  }, []);

  // Fallback hardcoded profiles if API fails
  const profiles: FamilyMember[] = members.length > 0 ? members : [
    { id: '00000000-0000-0000-0000-000000000001', name: 'Michael', email: 'you@family.com', avatar_color: '#8b5cf6', relationship: 'Son', family_code: 'FAMILY2024' },
    { id: '00000000-0000-0000-0000-000000000002', name: 'James', email: 'dad@family.com', avatar_color: '#3b82f6', relationship: 'Father', family_code: 'FAMILY2024' },
    { id: '00000000-0000-0000-0000-000000000003', name: 'Susan', email: 'mom@family.com', avatar_color: '#ec4899', relationship: 'Mother', family_code: 'FAMILY2024' },
    { id: '00000000-0000-0000-0000-000000000004', name: 'William', email: 'grandpa@family.com', avatar_color: '#10b981', relationship: 'Grandfather', family_code: 'FAMILY2024' },
  ];

  const handleSelect = (member: FamilyMember) => {
    setSelectedId(member.id);
    const user: CurrentUser = {
      id: member.id,
      name: member.name,
      avatarColor: member.avatar_color,
      relationship: member.relationship || '',
      familyCode: member.family_code || '',
    };
    setActiveUser(user);
    // Brief animation then redirect
    setTimeout(() => {
      router.push('/album');
    }, 400);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: isDark ? '#0a0a0c' : '#f5f3ef' }}
    >
      {/* Ambient glow */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full opacity-20 blur-[120px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.4), transparent)', top: '-200px', left: '50%', transform: 'translateX(-50%)' }}
      />

      {/* Logo */}
      <div className="mb-12 text-center">
        <h1
          className={`text-5xl font-bold tracking-tight mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}
          style={{ fontFamily: 'var(--font-inter), sans-serif' }}
        >
          EVA
        </h1>
        <p className={`text-base ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
          Who&apos;s remembering today?
        </p>
      </div>

      {/* Profile Grid */}
      <div className="flex flex-wrap justify-center gap-8 max-w-2xl px-6">
        {loading ? (
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin" />
            <span className={isDark ? 'text-white/50' : 'text-gray-400'}>Loading profiles...</span>
          </div>
        ) : (
          profiles.map((member) => {
            const isSelected = selectedId === member.id;
            return (
              <button
                key={member.id}
                onClick={() => handleSelect(member)}
                className={`flex flex-col items-center gap-3 group transition-all duration-300 ${
                  isSelected ? 'scale-110' : 'hover:scale-105'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-28 h-28 rounded-2xl flex items-center justify-center text-white text-4xl font-bold shadow-lg transition-all duration-300 ${
                    isSelected ? 'ring-4 ring-cyan-400 ring-offset-4 shadow-cyan-500/30 shadow-2xl' : 'group-hover:shadow-xl'
                  }`}
                  style={{
                    backgroundColor: member.avatar_color,
                    // @ts-expect-error -- Tailwind ring-offset-color via CSS variable
                    '--tw-ring-offset-color': isDark ? '#0a0a0c' : '#f5f3ef',
                  }}
                >
                  {member.name.charAt(0)}
                </div>

                {/* Name */}
                <div className="text-center">
                  <p className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {member.name}
                  </p>
                  {member.relationship && (
                    <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                      {member.relationship}
                    </p>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Add Profile */}
      <div className="mt-12">
        <Link
          href="/intro"
          className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium transition-all ${
            isDark
              ? 'text-white/50 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10'
              : 'text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200'
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Profile
        </Link>
      </div>

      {/* Footer */}
      <p className={`absolute bottom-6 text-xs ${isDark ? 'text-white/20' : 'text-gray-300'}`}>
        Built with Google AI for Gemini API Developer Competition
      </p>
    </div>
  );
}
