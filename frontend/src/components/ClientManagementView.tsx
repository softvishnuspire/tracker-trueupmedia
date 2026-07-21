"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi, cooApi, gmApi, managerApi, Client, ContentItem, TeamMember } from '@/lib/api';
import { isCrossMonthRescheduled } from '@/utils/calendarUtils';
import { Plus, Search, Edit2, Trash2, X, Calendar as CalendarIcon, UserCheck, Film, Image as ImageIcon, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface ClientManagementViewProps {
  role: 'admin' | 'coo' | 'gm' | 'manager';
  basePath: string;
  title?: string;
  subtitle?: string;
}

export default function ClientManagementView({ role, basePath, title = "Client Management", subtitle = "Add, edit, and assign clients to team leads, editors, and designers." }: ClientManagementViewProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const [formData, setFormData] = useState({
    company_name: '',
    phone: '',
    email: '',
    address: '',
    posts_per_month: '',
    reels_per_month: '',
    youtube_per_month: '',
    batch_type: '1-1' as '1-1' | '15-15',
    password: '',
    team_lead_id: '',
    reel_employee_id: '',
    post_employee_id: '',
    writer_employee_id: '',
  });

  const getApi = () => {
    switch (role) {
      case 'coo': return cooApi;
      case 'gm': return gmApi;
      case 'manager': return managerApi;
      default: return adminApi;
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const api = getApi();
      const [clientsRes, teamRes] = await Promise.all([
        api.getClients(),
        adminApi.getTeam().catch(() => ({ data: [] })),
      ]);

      setClients(clientsRes.data || []);
      setTeamMembers(teamRes.data || []);

      const monthStr = format(new Date(), 'yyyy-MM');
      const calendarRes = await adminApi.getMasterCalendar(monthStr).catch(() => ({ data: [] }));
      setContentItems(calendarRes.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load client data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [role]);

  const handleAddClick = () => {
    setEditingClient(null);
    setFormData({
      company_name: '',
      phone: '',
      email: '',
      address: '',
      posts_per_month: '0',
      reels_per_month: '0',
      youtube_per_month: '0',
      batch_type: '1-1',
      password: '',
      team_lead_id: '',
      reel_employee_id: '',
      post_employee_id: '',
      writer_employee_id: '',
    });
    setShowModal(true);
  };

  const handleEditClick = (client: Client) => {
    setEditingClient(client);
    setFormData({
      company_name: client.company_name || '',
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
      posts_per_month: client.posts_per_month?.toString() || '0',
      reels_per_month: client.reels_per_month?.toString() || '0',
      youtube_per_month: client.youtube_per_month?.toString() || '0',
      batch_type: client.batch_type || '1-1',
      password: '',
      team_lead_id: client.team_lead_id || '',
      reel_employee_id: client.reel_employee_id || '',
      post_employee_id: client.post_employee_id || '',
      writer_employee_id: client.writer_employee_id || '',
    });
    setShowModal(true);
  };

  const handleDeleteClick = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove ${name}? This will delete all associated calendar data.`)) {
      try {
        const api = getApi();
        await api.deleteClient(id);
        fetchData();
      } catch (err: any) {
        alert(err.message || 'Failed to delete client');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const api = getApi();
      const submissionData = {
        company_name: formData.company_name,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        posts_per_month: parseInt(formData.posts_per_month) || 0,
        reels_per_month: parseInt(formData.reels_per_month) || 0,
        youtube_per_month: parseInt(formData.youtube_per_month) || 0,
        batch_type: formData.batch_type,
        team_lead_id: formData.team_lead_id || null,
        reel_employee_id: formData.reel_employee_id || null,
        post_employee_id: formData.post_employee_id || null,
        writer_employee_id: formData.writer_employee_id || null,
        ...(formData.password ? { password: formData.password } : {}),
      };

      if (editingClient) {
        await api.updateClient(editingClient.id, submissionData);
      } else {
        await api.addClient(submissionData);
      }
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const filteredClients = clients.filter(c =>
    c.company_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalReelsTarget = clients.reduce((sum, c) => sum + (c.reels_per_month || 0), 0);
  const totalPostsTarget = clients.reduce((sum, c) => sum + (c.posts_per_month || 0), 0);

  const actualReelsScheduled = contentItems.filter(item => !isCrossMonthRescheduled(item) && (item.content_type || '').toUpperCase() === 'REEL').length;
  const actualPostsScheduled = contentItems.filter(item => !isCrossMonthRescheduled(item) && (item.content_type || '').toUpperCase() === 'POST').length;

  const getAllocationStyle = (actual: number, target: number) => {
    if (target === 0) return { color: 'var(--text-secondary)' };
    if (actual === target) return { color: '#10b981', fontWeight: 'bold' };
    if (actual < target) return { color: '#f59e0b', fontWeight: 'bold' };
    return { color: '#8b5cf6', fontWeight: 'bold' };
  };

  // Filter team members by role types
  const teamLeads = teamMembers.filter(m => ['TL', 'TEAM LEAD', 'ADMIN', 'GM', 'GENERAL MANAGER', 'COO', 'MANAGER'].includes((m.role || '').toUpperCase()) || ['TL', 'TEAM LEAD'].includes((m.role_identifier || '').toUpperCase()));
  const editors = teamMembers.filter(m => ['EMPLOYEE', 'REEL', 'POST', 'WRITER', 'DESIGNER', 'EDITOR'].includes((m.role || '').toUpperCase()) || ['REEL', 'POST', 'WRITER'].includes((m.role_identifier || '').toUpperCase()));

  return (
    <div>
      <header className="page-header">
        <div className="header-content">
          <div className="header-info">
            <h1 className="page-title">{title}</h1>
            <p className="page-subtitle">{subtitle}</p>
          </div>
          <div className="header-controls">
            <button className="btn-add" onClick={handleAddClick}>
              <Plus size={18} />
              Add New Client
            </button>
          </div>
        </div>
      </header>

      <div className="table-card">
        <div className="table-header">
          <div className="search-input-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search clients by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="table-summary">
            <div className="summary-item">
              <span className="summary-label">Total Clients:</span>
              <span className="summary-value clients">{clients.length}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Reels Assigned:</span>
              <span className="summary-value reels" style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontSize: '24px', fontWeight: 900 }}>{actualReelsScheduled}</span>
                <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>/</span>
                <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: 700 }}>{totalReelsTarget}</span>
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Posts Assigned:</span>
              <span className="summary-value posts" style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontSize: '24px', fontWeight: 900 }}>{actualPostsScheduled}</span>
                <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>/</span>
                <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: 700 }}>{totalPostsTarget}</span>
              </span>
            </div>
          </div>
        </div>

        {error ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--danger)' }}>{error}</div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Company Name</th>
                  <th>Batch</th>
                  <th>Posts / Reels Target</th>
                  <th>Team Lead</th>
                  <th>Video Editor</th>
                  <th>Post Designer</th>
                  <th>Writer</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <tr key={i}>
                        <td><Skeleton className="h-4 w-32" /></td>
                        <td><Skeleton className="h-4 w-12" /></td>
                        <td><Skeleton className="h-4 w-24" /></td>
                        <td><Skeleton className="h-4 w-24" /></td>
                        <td><Skeleton className="h-4 w-24" /></td>
                        <td><Skeleton className="h-4 w-24" /></td>
                        <td><Skeleton className="h-4 w-24" /></td>
                        <td style={{ textAlign: 'right' }}><Skeleton className="h-8 w-24 ml-auto" /></td>
                      </tr>
                    ))}
                  </>
                ) : (
                  <>
                    {filteredClients.map((client, index) => {
                      const clientActualReels = contentItems.filter(item => !isCrossMonthRescheduled(item) && item.client_id === client.id && (item.content_type || '').toUpperCase() === 'REEL').length;
                      const clientActualPosts = contentItems.filter(item => !isCrossMonthRescheduled(item) && item.client_id === client.id && (item.content_type || '').toUpperCase() === 'POST').length;

                      return (
                        <tr key={client.id || index}>
                          <td data-label="Company Name" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span>{client.company_name}</span>
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400 }}>{client.email || client.phone || ''}</span>
                            </div>
                          </td>
                          <td data-label="Batch">
                            <span style={{
                              display: 'inline-block',
                              padding: '3px 10px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 700,
                              background: (client.batch_type === '15-15') ? 'rgba(139, 92, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                              color: (client.batch_type === '15-15') ? '#8b5cf6' : '#10b981',
                              border: `1px solid ${(client.batch_type === '15-15') ? 'rgba(139, 92, 246, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                            }}>{client.batch_type || '1-1'}</span>
                          </td>
                          <td data-label="Targets">
                            <div style={{ display: 'flex', gap: '8px', fontSize: '13px' }}>
                              <span style={getAllocationStyle(clientActualPosts, client.posts_per_month || 0)}>
                                P: {clientActualPosts}/{client.posts_per_month || 0}
                              </span>
                              <span style={getAllocationStyle(clientActualReels, client.reels_per_month || 0)}>
                                R: {clientActualReels}/{client.reels_per_month || 0}
                              </span>
                            </div>
                          </td>
                          <td data-label="Team Lead">
                            <span style={{ fontSize: '13px', fontWeight: 600, color: client.team_lead?.name ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                              {client.team_lead?.name || 'Unassigned'}
                            </span>
                          </td>
                          <td data-label="Video Editor">
                            <span style={{ fontSize: '13px', fontWeight: 600, color: client.reel_employee?.name ? '#3b82f6' : 'var(--text-muted)' }}>
                              {client.reel_employee?.name || 'Unassigned'}
                            </span>
                          </td>
                          <td data-label="Post Designer">
                            <span style={{ fontSize: '13px', fontWeight: 600, color: client.post_employee?.name ? '#ec4899' : 'var(--text-muted)' }}>
                              {client.post_employee?.name || 'Unassigned'}
                            </span>
                          </td>
                          <td data-label="Writer">
                            <span style={{ fontSize: '13px', fontWeight: 600, color: client.writer_employee?.name ? '#10b981' : 'var(--text-muted)' }}>
                              {client.writer_employee?.name || 'Unassigned'}
                            </span>
                          </td>
                          <td data-label="Actions" style={{ textAlign: 'right' }}>
                            <div className="action-btns" style={{ justifyContent: 'flex-end' }}>
                              <Link href={`${basePath}/client-calendar/${client.id}`} className="btn-icon" title="View client calendar">
                                <CalendarIcon size={14} />
                              </Link>
                              <button className="btn-icon" onClick={() => handleEditClick(client)} title="Edit client & team assignments">
                                <Edit2 size={14} />
                              </button>
                              <button className="btn-icon delete" onClick={() => handleDeleteClick(client.id, client.company_name)} title="Delete client">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredClients.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          No clients found matching your search.
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px', width: '90%' }}>
            <div className="modal-header">
              <h3 className="modal-title">{editingClient ? 'Edit Client & Assignments' : 'Add New Client'}</h3>
              <button onClick={() => setShowModal(false)} className="modal-close"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Company Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    placeholder="Legal company name"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    className="form-input"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="client@company.com"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{editingClient ? 'New Password (optional)' : 'Password *'}</label>
                  <input
                    type="password"
                    className="form-input"
                    required={!editingClient}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Min 6 chars"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Batch Cycle *</label>
                  <select
                    className="form-input"
                    value={formData.batch_type}
                    onChange={(e) => setFormData({ ...formData, batch_type: e.target.value as '1-1' | '15-15' })}
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="1-1">1–1 (Full Month)</option>
                    <option value="15-15">15–15 (Bi-Monthly)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Physical Address</label>
                  <input
                    className="form-input"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Office address"
                  />
                </div>
              </div>

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Posts / Month</label>
                  <input
                    type="number"
                    className="form-input"
                    min="0"
                    value={formData.posts_per_month}
                    onChange={(e) => setFormData({ ...formData, posts_per_month: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Reels / Month</label>
                  <input
                    type="number"
                    className="form-input"
                    min="0"
                    value={formData.reels_per_month}
                    onChange={(e) => setFormData({ ...formData, reels_per_month: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">YT Videos / Month</label>
                  <input
                    type="number"
                    className="form-input"
                    min="0"
                    value={formData.youtube_per_month}
                    onChange={(e) => setFormData({ ...formData, youtube_per_month: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ margin: '16px 0 8px 0', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
                  Team Member & Role Assignments
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <UserCheck size={14} color="#8b5cf6" /> Team Lead
                    </label>
                    <select
                      className="form-input"
                      value={formData.team_lead_id}
                      onChange={(e) => setFormData({ ...formData, team_lead_id: e.target.value })}
                    >
                      <option value="">Unassigned</option>
                      {teamLeads.map(m => (
                        <option key={m.user_id || m.id} value={m.user_id || m.id}>
                          {m.name} ({m.role || m.role_identifier || 'TL'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Film size={14} color="#3b82f6" /> Video / Reel Editor
                    </label>
                    <select
                      className="form-input"
                      value={formData.reel_employee_id}
                      onChange={(e) => setFormData({ ...formData, reel_employee_id: e.target.value })}
                    >
                      <option value="">Unassigned</option>
                      {editors.map(m => (
                        <option key={m.user_id || m.id} value={m.user_id || m.id}>
                          {m.name} ({m.role_identifier || m.role || 'Editor'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ImageIcon size={14} color="#ec4899" /> Post / Graphic Designer
                    </label>
                    <select
                      className="form-input"
                      value={formData.post_employee_id}
                      onChange={(e) => setFormData({ ...formData, post_employee_id: e.target.value })}
                    >
                      <option value="">Unassigned</option>
                      {editors.map(m => (
                        <option key={m.user_id || m.id} value={m.user_id || m.id}>
                          {m.name} ({m.role_identifier || m.role || 'Designer'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileText size={14} color="#10b981" /> Content Writer
                    </label>
                    <select
                      className="form-input"
                      value={formData.writer_employee_id}
                      onChange={(e) => setFormData({ ...formData, writer_employee_id: e.target.value })}
                    >
                      <option value="">Unassigned</option>
                      {editors.map(m => (
                        <option key={m.user_id || m.id} value={m.user_id || m.id}>
                          {m.name} ({m.role_identifier || m.role || 'Writer'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '10px 24px' }}>
                  {editingClient ? 'Save Changes' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
