"use client";

import React from 'react';
import ClientManagementView from '@/components/ClientManagementView';

export default function CooClientManagement() {
  return (
    <ClientManagementView
      role="coo"
      basePath="/coo"
      title="Client Management & Team Assignments"
      subtitle="Add, edit, and assign clients to Team Leads, Video Editors, Post Designers, and Writers."
    />
  );
}
