"use client";

import React, { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { Plus, Search, Trash2, X, Key, Edit2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface TeamMember {
  user_id: string; // This is what Supabase returns
  id?: string;     // Legacy support
  name: string;
  email: string;
  role: string;
  role_identifier?: string;
  created_at?: string;
}

export default function TeamManagement() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'TEAM LEAD',
    role_identifier: 'TL1',
  });

  const fetchTeam = async () => {
    try {
      const res = await adminApi.getTeam();
      setTeam(res.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handleAddClick = () => {
    setEditingMember(null);
    setFormData({ name: '', email: '', password: '', role: 'TEAM LEAD', role_identifier: 'TL1' });
    setShowModal(true);
  };

  const handleEditClick = (member: TeamMember) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      email: member.email,
      password: '', // Leave blank if not changing
      role: member.role,
      role_identifier: member.role_identifier || '',
    });
    setShowModal(true);
  };

  const handleDeleteClick = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove ${name} from the team? They will no longer be able to log in.`)) {
      try {
        await adminApi.deleteTeamMember(id);
        fetchTeam();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingMember) {
        // Password is optional during edit
        const updatePayload = { ...formData };
        if (!updatePayload.password) delete (updatePayload as any).password;
        await adminApi.updateTeamMember(editingMember.user_id || editingMember.id!, updatePayload);
      } else {
        await adminApi.addTeamMember(formData);
      }
      setShowModal(false);
      fetchTeam();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredTeam = team.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <header className="page-header">
        <div>
          <h1 className="page-title">Team Management</h1>
          <p className="page-subtitle">Manage Team Leads and access permissions</p>
        </div>
        <button className="btn-add" onClick={handleAddClick}>
          <Plus size={18} />
          Add Team Lead
        </button>
      </header>

      <div className="table-card">
        <div className="table-header">
          <div className="search-input-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {error ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--danger)' }}>{error}</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && team.length === 0 ? (
                <>
                  {[1, 2, 3, 4].map((i) => (
                    <tr key={i}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      </td>
                      <td><Skeleton className="h-4 w-40" /></td>
                      <td><Skeleton className="h-6 w-24 rounded-full" /></td>
                      <td><Skeleton className="h-4 w-20" /></td>
                      <td style={{ textAlign: 'right' }}><Skeleton className="h-8 w-16 ml-auto" /></td>
                    </tr>
                  ))}
                </>
              ) : (
                <>
                  {filteredTeam.map((member, index) => (
                    <tr key={member.user_id || member.id || index}>
                      <td data-label="Name" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                            {member.name.charAt(0)}
                          </div>
                          <span>{member.name}</span>
                        </div>
                      </td>
                      <td data-label="Email"><span>{member.email}</span></td>
                      <td data-label="Role">
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span className="type-badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)', minWidth: '100px', textAlign: 'center' }}>
                            TEAM LEAD
                          </span>
                          {member.role_identifier && (
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                              {member.role_identifier}
                            </span>
                          )}
                        </div>
                      </td>
                      <td data-label="Joined Date"><span>{member.created_at ? new Date(member.created_at).toLocaleDateString() : 'N/A'}</span></td>
                      <td data-label="Actions" style={{ textAlign: 'right' }}>
                        <div className="action-btns" style={{ justifyContent: 'flex-end' }}>
                          <button className="btn-icon" onClick={() => handleEditClick(member)}>
                            <Edit2 size={14} />
                          </button>
                          <button className="btn-icon delete" onClick={() => handleDeleteClick(member.user_id || member.id!, member.name)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredTeam.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No team members found.
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{editingMember ? 'Edit Team Lead' : 'Create Team Lead'}</h3>
              <button onClick={() => setShowModal(false)} className="modal-close"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter full name"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input
                  type="email"
                  className="form-input"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="tl@trueupmedia.com"
                  style={{ width: '100%' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password {editingMember ? '(Optional)' : '*'}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    className="form-input"
                    required={!editingMember}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingMember ? "Leave blank to keep current" : "Minimum 6 characters"}
                    style={{ width: '100%' }}
                  />
                  <Key size={14} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Team Identifier *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={formData.role_identifier}
                    onChange={(e) => setFormData({ ...formData, role_identifier: e.target.value.toUpperCase() })}
                    placeholder="e.g. TL1, TL2, TL3"
                    style={{ width: '100%' }}
                  />
                  <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600 }}>ID</div>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Role will be set to TEAM LEAD automatically.</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={loading} style={{ width: 'auto', padding: '10px 24px' }}>
                  {loading ? (editingMember ? 'Saving...' : 'Creating...') : (editingMember ? 'Save Changes' : 'Create Account')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
