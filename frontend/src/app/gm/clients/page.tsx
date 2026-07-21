"use client";

import React from 'react';
import ClientManagementView from '@/components/ClientManagementView';

export default function GmClientManagement() {
  return (
    <ClientManagementView
      role="gm"
      basePath="/gm"
      title="GM Client Management & Team Assignments"
      subtitle="Add, edit, and assign clients to Team Leads, Video Editors, Post Designers, and Writers."
    />
  );
}
