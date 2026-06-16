"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { adminApi, gmApi, TeamMember, Client } from '@/lib/api';
import { Plus, Search, Trash2, X, Key, Edit2, Users, Briefcase, RefreshCcw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface TeamLead extends TeamMember {
  clients?: Client[];
}

export default function TeamManagement() {
  const [activeTab, setActiveTab] = useState<'members' | 'assignments'>('members');
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [teamLeads, setTeamLeads] = useState<TeamLead[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  // Assign client states
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignTargetLead, setAssignTargetLead] = useState<TeamLead | null>(null);
  const [assignSearchTerm, setAssignSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'TEAM LEAD',
    role_identifier: '',
  });

  const fetchTeam = async () => {
    try {
      const res = await adminApi.getTeam();
      setTeam(res.data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchTeamLeadsAndClients = useCallback(async () => {
    try {
      const leadsRes = await gmApi.getTeamLeads();
      const clientsRes = await gmApi.getClients();
      setAllClients(clientsRes.data);

      const leadsWithClients = await Promise.all(
        leadsRes.data.map(async (lead: TeamMember) => {
          const clientsData = await gmApi.getTeamLeadClients(lead.user_id);
          return { ...lead, clients: clientsData.data };
        })
      );
      setTeamLeads(leadsWithClients);
    } catch (err: any) {
      console.error(err);
    }
  }, []);

  const initData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchTeam(), fetchTeamLeadsAndClients()]);
    setLoading(false);
  }, [fetchTeamLeadsAndClients]);

  useEffect(() => {
    initData();
  }, [initData]);

  const handleAddClick = () => {
    setEditingMember(null);
    setFormData({ name: '', email: '', password: '', role: 'TEAM LEAD', role_identifier: '' });
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
        fetchTeamLeadsAndClients();
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
        const updatePayload = { ...formData };
        if (!updatePayload.password) delete (updatePayload as any).password;
        await adminApi.updateTeamMember(editingMember.user_id || editingMember.id!, updatePayload);
      } else {
        await adminApi.addTeamMember(formData);
      }
      setShowModal(false);
      await Promise.all([fetchTeam(), fetchTeamLeadsAndClients()]);
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignClick = (lead: TeamLead) => {
    setAssignTargetLead(lead);
    setIsAssignModalOpen(true);
  };

  const handleAssignClient = async (clientId: string, teamLeadId: string) => {
    try {
      await gmApi.assignClient(clientId, teamLeadId);
      await fetchTeamLeadsAndClients();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleUnassignClient = async (clientId: string) => {
    if (confirm("Are you sure you want to unassign this client?")) {
      try {
        // empty string unassigns the client in the backend
        await gmApi.assignClient(clientId, "");
        await fetchTeamLeadsAndClients();
      } catch (err: any) {
        alert(err.response?.data?.error || err.message);
      }
    }
  };

  const filteredTeam = team.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <header className="page-header">
        <div className="header-info">
          <h1 className="page-title">Team Management</h1>
          <p className="page-subtitle">Manage Team Leads, access permissions, and client assignments</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-secondary" onClick={initData} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button className="btn-add" onClick={handleAddClick}>
            <Plus size={18} />
            Add Team Member
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="tabs-container" style={{ display: 'flex', gap: '10px', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
        <button
          className={`tab-btn ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => setActiveTab('members')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            background: activeTab === 'members' ? 'var(--accent)' : 'transparent',
            color: activeTab === 'members' ? 'white' : 'var(--text-secondary)',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Users size={16} />
          Team Members
        </button>
        <button
          className={`tab-btn ${activeTab === 'assignments' ? 'active' : ''}`}
          onClick={() => setActiveTab('assignments')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            background: activeTab === 'assignments' ? 'var(--accent)' : 'transparent',
            color: activeTab === 'assignments' ? 'white' : 'var(--text-secondary)',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Briefcase size={16} />
          Client Assignments
        </button>
      </div>

      {activeTab === 'members' && (
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
            <div className="table-summary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Total Team:</span>
              <span style={{ background: 'var(--accent)', color: 'white', padding: '2px 10px', borderRadius: '12px', fontSize: '14px', fontWeight: 800, boxShadow: '0 4px 12px var(--accent-glow)' }}>{team.length}</span>
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
                            <span className={`type-badge ${member.role.toLowerCase().replace(' ', '-')}`} style={{ minWidth: '100px', textAlign: 'center' }}>
                              {member.role}
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
      )}

      {activeTab === 'assignments' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {loading && teamLeads.length === 0 ? (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="team-card" style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                  <Skeleton className="h-6 w-32 mb-4" />
                  <Skeleton className="h-10 w-full mb-2" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </>
          ) : (
            <>
              {teamLeads.map((lead) => (
                <div key={lead.user_id} className="team-card" style={{ display: 'flex', flexDirection: 'column', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-card)', minHeight: '220px' }}>
                  <div className="team-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{lead.name}</h3>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>{lead.role_identifier || 'Team Lead'}</p>
                    </div>
                    <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', width: 'auto', flexShrink: 0 }} onClick={() => handleAssignClick(lead)}>
                      Assign Client
                    </button>
                  </div>

                  <div style={{ flexGrow: 1 }}>
                    <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Assigned Clients</h4>
                    {lead.clients && lead.clients.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {lead.clients.map((client) => (
                          <div key={client.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-body)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{client.company_name}</span>
                            <button
                              onClick={() => handleUnassignClient(client.id)}
                              style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>No clients assigned.</p>
                    )}
                  </div>
                </div>
              ))}
              {teamLeads.length === 0 && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No Team Leads found.
                </div>
              )}
            </>
          )}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{editingMember ? 'Edit Team Member' : 'Create Team Member'}</h3>
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
                <label className="form-label">System Role *</label>
                <select 
                  className="form-input"
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  style={{ width: '100%' }}
                >
                  <option value="GM">General Manager (GM)</option>
                  <option value="MANAGER">Manager</option>
                  <option value="COO">COO</option>
                  <option value="TEAM LEAD">Team Lead (TL)</option>
                  <option value="POSTING TEAM">Posting Team</option>
                  <option value="PRODUCTION HEAD">Production Head</option>
                  <option value="CONTENT HEAD">Content Head</option>
                  <option value="EMPLOYEE">Employee</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              {(formData.role === 'TEAM LEAD' || formData.role === 'POSTING TEAM') && (
                <div className="form-group">
                  <label className="form-label">{formData.role} Identifier *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-input"
                      required
                      value={formData.role_identifier}
                      onChange={(e) => setFormData({ ...formData, role_identifier: e.target.value.toUpperCase() })}
                      placeholder={formData.role === 'TEAM LEAD' ? "e.g. TL1, TL2" : "e.g. P1, P2"}
                      style={{ width: '100%' }}
                    />
                    <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600 }}>ID</div>
                  </div>
                </div>
              )}

              {formData.role === 'EMPLOYEE' && (
                <div className="form-group">
                  <label className="form-label">Employee Category *</label>
                  <select 
                    className="form-input"
                    required
                    value={formData.role_identifier}
                    onChange={(e) => setFormData({ ...formData, role_identifier: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    <option value="" disabled>Select specialization...</option>
                    <option value="REEL">Reel Editor</option>
                    <option value="POST">Poster Editor</option>
                    <option value="WRITER">Content Writer</option>
                  </select>
                </div>
              )}
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

      {/* Assignment Modal */}
      {isAssignModalOpen && assignTargetLead && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Assign Client to {assignTargetLead.name}</h3>
              <button onClick={() => setIsAssignModalOpen(false)} className="modal-close"><X size={20} /></button>
            </div>
            <div style={{ padding: '16px 0' }}>
              <div className="search-input-box" style={{ marginBottom: '16px' }}>
                <Search size={18} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={assignSearchTerm}
                  onChange={(e) => setAssignSearchTerm(e.target.value)}
                />
              </div>
              <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {allClients
                  .filter(client => client.company_name.toLowerCase().includes(assignSearchTerm.toLowerCase()))
                  .map(client => {
                    const isAlreadyAssignedToThisLead = assignTargetLead.clients?.some(c => c.id === client.id);
                    return (
                      <div key={client.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', padding: '10px 14px', background: 'var(--bg-body)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{client.company_name}</div>
                          {client.team_lead && (
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              Currently assigned to: {client.team_lead.name}
                            </div>
                          )}
                        </div>
                        {isAlreadyAssignedToThisLead ? (
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)', flexShrink: 0 }}>Assigned</span>
                        ) : (
                          <button
                            className="btn-primary"
                            style={{ padding: '6px 12px', fontSize: '12px', width: 'auto', flexShrink: 0 }}
                            onClick={() => {
                              handleAssignClient(client.id, assignTargetLead.user_id);
                              setIsAssignModalOpen(false);
                            }}
                          >
                            Assign
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

