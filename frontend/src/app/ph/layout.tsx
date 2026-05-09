"use client";

import React from 'react';
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
