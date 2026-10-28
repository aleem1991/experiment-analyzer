import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FlaskConical, History, PlusCircle, Database } from 'lucide-react';
import { getCurrentUser, isLiveAppwriteConfigured, AuthUser } from '../lib/appwrite';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    getCurrentUser().then(setUser).catch(console.error);
  }, []);

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-[#0c0d12]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/20 group-hover:scale-105 transition-transform">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold tracking-tight text-white group-hover:text-rose-400 transition-colors">
                Experiment Analyzer
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                v1.0
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-none">
              Rigorous A/B Testing on Appwrite TablesDB
            </p>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            to="/new"
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
              isActive('/new')
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Analysis</span>
          </Link>

          <Link
            to="/history"
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
              isActive('/history')
                ? 'bg-zinc-800 text-white border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
            }`}
          >
            <History className="w-4 h-4" />
            <span>History</span>
          </Link>
        </nav>

        {/* Status & Auth Badge */}
        <div className="flex items-center gap-3">
          {/* Appwrite TablesDB Status Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-zinc-900/80 border-zinc-800">
            <Database className={`w-3.5 h-3.5 ${isLiveAppwriteConfigured ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span className="text-zinc-400">
              {isLiveAppwriteConfigured ? 'Appwrite TablesDB' : 'Local Storage Mode'}
            </span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isLiveAppwriteConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
          </div>

          {/* User info */}
          {user && (
            <div className="flex items-center gap-2 pl-2 border-l border-zinc-800 text-xs text-zinc-400">
              <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300 font-mono text-[11px] border border-zinc-700">
                {user.isAnonymous ? 'A' : user.name.charAt(0)}
              </div>
              <span className="hidden md:inline truncate max-w-[120px]">
                {user.name}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
