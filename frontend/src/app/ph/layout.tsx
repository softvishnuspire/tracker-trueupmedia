"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { 
    LayoutDashboard, 
    LogOut,
    UserCircle,
    Menu,
    X,
    Video,
    Play
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import NotificationBell from '@/components/NotificationBell';
import '../admin/admin.css';

export default function ProductionHeadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
    </>
  );
}

