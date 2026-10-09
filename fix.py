import re

with open('src/app/owner/settlements/SettlementClient.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

top_str = """'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  calculateOperatorSettlement,
  calculateCrewPayroll,
  createManualAdjustment,
  approveManualAdjustment,
  generateSettlement,
  finalizeSettlement,
} from '@/actions/settlement';
import { OperatorDiaryModal } from '@/components/settlements/OperatorDiaryModal';
import ExternalLaborModal from './ExternalLaborModal';
import {
  Calculator,
  DollarSign,
  ShieldAlert,
  CheckCircle2,
  Lock,
  PlusCircle,
  Clock,
  Loader2,
  FileText,
  UserCheck,
  AlertTriangle,
  Calendar,
  Users,
  TrendingUp,
  Edit3,
  Save,
  ChevronRight,
  UserPlus,
  ArrowRight,
  Filter,
  BookOpen,
} from 'lucide-react';

interface SettlementClientProps {
  operators: any[];
  pendingAdjustments: any[];
  recentSettlements: any[];
  userRole: string;
}

export default function SettlementClient({
  operators,
  pendingAdjustments,
  recentSettlements,
  userRole,
}: SettlementClientProps) {"""

idx = content.find('const router = useRouter();')
if idx != -1:
    content = top_str + '\n  ' + content[idx:]

broken_func = """  const handleFetchMultiBreakdown = (start: string, end: string, checkDirty = true) => {
    if (checkDirty && Object.keys(customPayOverrides).length > 0) {
        setCustomPayOverrides({});
      }
    });
  };"""

fixed_func = """  const handleFetchMultiBreakdown = (start: string, end: string, checkDirty = true) => {
    if (checkDirty && Object.keys(customPayOverrides).length > 0) {
      if (!window.confirm("You have unsaved edits. Are you sure you want to change the date/tab and lose them?")) {
        return;
      }
    }
    setErrorMsg(null);
    startTransition(async () => {
      const res = await calculateCrewPayroll({ startDate: start, endDate: end });
      if (!res.success || !res.data) {
        setErrorMsg(res.error || 'Failed to fetch player settlements.');
      } else {
        setMultiBreakdown(res.data);
        setCustomPayOverrides({});
      }
    });
  };"""

content = content.replace(broken_func, fixed_func)

with open('src/app/owner/settlements/SettlementClient.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
