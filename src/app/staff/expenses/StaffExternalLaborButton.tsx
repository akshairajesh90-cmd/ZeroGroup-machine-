'use client';

import React, { useState } from 'react';
import { Users } from 'lucide-react';
import ExternalLaborModal from '@/app/owner/settlements/ExternalLaborModal';

export default function StaffExternalLaborButton() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button 
        onClick={() => setIsOpen(true)} 
        className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:bg-amber-500/20 px-5 py-3 rounded-xl font-bold transition-all shadow-lg"
      >
        <Users className="h-5 w-5" /> Log External Labor
      </button>
      {isOpen && <ExternalLaborModal onClose={() => setIsOpen(false)} />}
    </>
  );
}
