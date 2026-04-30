"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi, Client } from '@/lib/api';
import { Plus, Search, Edit2, Trash2, X, Calendar as CalendarIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ClientManagement() {
  const [clients, setClients] = useState<Client[]>([]);
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
  });

  const fetchClients = async () => {
    try {
      const res = await adminApi.getClients();
      setClients(res.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleAddClick = () => {
    setEditingClient(null);
    setFormData({ company_name: '', phone: '', email: '', address: '', posts_per_month: '', reels_per_month: '', youtube_per_month: '', batch_type: '1-1' });
    setShowModal(true);
  };

  const handleEditClick = (client: Client) => {
    setEditingClient(client);
    setFormData({
      company_name: client.company_name,
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
      posts_per_month: client.posts_per_month?.toString() || '0',
      reels_per_month: client.reels_per_month?.toString() || '0',
      youtube_per_month: client.youtube_per_month?.toString() || '0',
      batch_type: client.batch_type || '1-1',
    });
    setShowModal(true);
  };

  const handleDeleteClick = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove ${name}? This will delete all associated calendar data.`)) {
      try {
        await adminApi.deleteClient(id);
        fetchClients();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submissionData = {
        ...formData,
        posts_per_month: parseInt(formData.posts_per_month) || 0,
        reels_per_month: parseInt(formData.reels_per_month) || 0,
        youtube_per_month: parseInt(formData.youtube_per_month) || 0,
        batch_type: formData.batch_type,
      };
      console.log('Submitting Client Data:', submissionData);

      if (editingClient) {
        await adminApi.updateClient(editingClient.id, submissionData);
      } else {
        await adminApi.addClient(submissionData);
      }
      setShowModal(false);
      fetchClients();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const filteredClients = clients.filter(c =>
    c.company_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <header className="page-header">
        <div className="header-info">
          <h1 className="page-title">Client Management</h1>
          <p className="page-subtitle">Onboard and manage TrueUp Media client companies • <strong>{clients.length} Total</strong></p>
        </div>
        <button className="btn-add" onClick={handleAddClick}>
          <Plus size={18} />
          Add New Client
        </button>
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
          <div className="table-summary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Total Clients:</span>
            <span style={{ background: 'var(--accent)', color: 'white', padding: '2px 10px', borderRadius: '12px', fontSize: '14px', fontWeight: 800, boxShadow: '0 4px 12px var(--accent-glow)' }}>{clients.length}</span>
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
                  <th>Contact</th>
                  <th>Email</th>
                  <th>Address</th>
                  <th>Batch</th>
                  <th>Posts/mo</th>
                  <th>Reels/mo</th>
                  <th>YTvid/mo</th>
                  <th>Date Added</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <tr key={i}>
                        <td><Skeleton className="h-4 w-32" /></td>
                        <td><Skeleton className="h-4 w-24" /></td>
                        <td><Skeleton className="h-4 w-40" /></td>
                        <td><Skeleton className="h-4 w-48" /></td>
                        <td><Skeleton className="h-4 w-12" /></td>
                        <td><Skeleton className="h-4 w-12" /></td>
                        <td><Skeleton className="h-4 w-12" /></td>
                        <td><Skeleton className="h-4 w-20" /></td>
                        <td style={{ textAlign: 'right' }}><Skeleton className="h-8 w-24 ml-auto" /></td>
                      </tr>
                    ))}
                  </>
                ) : (
                  <>
                    {filteredClients.map((client, index) => (
                      <tr key={client.id || index}>
                        <td data-label="Company Name" style={{ fontWeight: 700, color: 'var(--text-primary)' }}><span>{client.company_name}</span></td>
                        <td data-label="Contact"><span>{client.phone || '-'}</span></td>
                        <td data-label="Email"><span>{client.email || '-'}</span></td>
                        <td data-label="Address" style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><span>{client.address || '-'}</span></td>
                        <td data-label="Batch">
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 700,
                            letterSpacing: '0.3px',
                            background: (client.batch_type === '15-15') ? 'rgba(139, 92, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: (client.batch_type === '15-15') ? '#8b5cf6' : '#10b981',
                            border: `1px solid ${(client.batch_type === '15-15') ? 'rgba(139, 92, 246, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                          }}>{client.batch_type || '1-1'}</span>
                        </td>
                        <td data-label="Posts/mo"><span>{client.posts_per_month || '0'}</span></td>
                        <td data-label="Reels/mo"><span>{client.reels_per_month || '0'}</span></td>
                        <td data-label="YTvid/mo"><span>{client.youtube_per_month || '0'}</span></td>
                        <td data-label="Date Added"><span>{new Date(client.created_at).toLocaleDateString()}</span></td>
                        <td data-label="Actions" style={{ textAlign: 'right' }}>
                          <div className="action-btns" style={{ justifyContent: 'flex-end' }}>
                            <Link href={`/admin/client-calendar/${client.id}`} className="btn-icon">
                              <CalendarIcon size={14} />
                            </Link>
                            <button className="btn-icon" onClick={() => handleEditClick(client)}>
                              <Edit2 size={14} />
                            </button>
                            <button className="btn-icon delete" onClick={() => handleDeleteClick(client.id, client.company_name)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredClients.length === 0 && (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
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
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{editingClient ? 'Edit Client' : 'Add New Client'}</h3>
              <button onClick={() => setShowModal(false)} className="modal-close"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Company Name *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="Enter legal company name"
                />
              </div>
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
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="client@company.com"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Physical Address</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Office address, city, country"
                  style={{ resize: 'none' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Batch Type *</label>
                <select
                  className="form-input"
                  value={formData.batch_type}
                  onChange={(e) => setFormData({ ...formData, batch_type: e.target.value as '1-1' | '15-15' })}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="1-1">1–1 (Full Month)</option>
                  <option value="15-15">15–15 (Bi-Monthly Cycle)</option>
                </select>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
                  {formData.batch_type === '1-1'
                    ? 'Standard monthly calendar — content spans the entire month (1st to last day).'
                    : 'Split into Cycle 1 (1st–15th) and Cycle 2 (16th–end of month). Calendar will show a cycle toggle.'}
                </p>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Posts Per Month *</label>
                  <input
                    type="number"
                    className="form-input"
                    required
                    min="0"
                    value={formData.posts_per_month}
                    onChange={(e) => setFormData({ ...formData, posts_per_month: e.target.value })}
                    placeholder="e.g. 12"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Reels Per Month *</label>
                  <input
                    type="number"
                    className="form-input"
                    required
                    min="0"
                    value={formData.reels_per_month}
                    onChange={(e) => setFormData({ ...formData, reels_per_month: e.target.value })}
                    placeholder="e.g. 8"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">YouTube videos Per Month *</label>
                  <input
                    type="number"
                    className="form-input"
                    required
                    min="0"
                    value={formData.youtube_per_month}
                    onChange={(e) => setFormData({ ...formData, youtube_per_month: e.target.value })}
                    placeholder="e.g. 4"
                  />
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
