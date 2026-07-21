"use client";

import React from 'react';
import ClientManagementView from '@/components/ClientManagementView';

export default function ManagerClientManagement() {
  return (
    <ClientManagementView
      role="manager"
      basePath="/manager"
      title="Manager Client Management & Team Assignments"
      subtitle="Add, edit, and assign clients to Team Leads, Video Editors, Post Designers, and Writers."
    />
  );
}
