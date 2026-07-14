'use client';

import React from 'react';
import { Home, FileText } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 z-[100] px-4 py-2 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
      <div className="max-w-7xl mx-auto flex justify-center items-center gap-12 sm:gap-24">
        <a 
          href="https://babadasseis.netlify.app/" 
          className="flex flex-col items-center text-gray-600 hover:text-cyan-500 transition-colors group"
        >
          <div className="p-1 rounded-lg group-hover:bg-cyan-50 transition-colors">
            <Home className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider mt-0.5">Início</span>
        </a>
        
        <a 
          href="https://drive.google.com/file/d/15IdR0y2pQZdLiaF60dPTaNDR1PMTWZLT/view?usp=sharing" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex flex-col items-center text-gray-600 hover:text-cyan-500 transition-colors group"
        >
          <div className="p-1 rounded-lg group-hover:bg-cyan-50 transition-colors">
            <FileText className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider mt-0.5 text-center">Regras</span>
        </a>
      </div>
    </footer>
  );
}
