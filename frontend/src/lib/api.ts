import axios from 'axios';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://trueupmedia-manager.onrender.com';

const api = axios.create({
    baseURL: API_BASE_URL,
});

api.interceptors.request.use(async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
});

export interface Client {
    id: string;
    company_name: string;
    phone?: string;
    email?: string;
    address?: string;
    is_active?: boolean;
    posts_per_month?: number;
    reels_per_month?: number;
    youtube_per_month?: number;
    batch_type?: '1-1' | '15-15';
    created_at: string;
}

export interface ContentItem {
    id: string;
    title: string;
    description: string;
    content_type: 'Post' | 'Reel' | 'YouTube';
    scheduled_datetime: string;
    status: string;
    client_id: string;
    is_rescheduled?: boolean;
    is_emergency?: boolean;
    emergency_marked_at?: string;
    clients?: { company_name: string };
}

export interface ContentDetails {
    item: ContentItem;
    history: StatusHistoryItem[];
}

export interface StatusHistoryItem {
    id: string;
    changed_at: string;
    new_status: string;
    note?: string;
    changed_by?: string;
    users?: {
        name?: string;
        role_identifier?: string;
    };
    [key: string]: unknown;
}

export interface PocNote {
    id: string;
    team_lead_id: string;
    client_id?: string;
    note_date: string;
    note_text: string;
    created_at: string;
    users?: { name?: string; role_identifier?: string };
    clients?: { company_name?: string };
}

export const gmApi = {
    getClients: () => api.get<Client[]>('/api/gm/clients'),
    getCalendar: (clientId: string, month: string) => api.get(`/api/gm/calendar?client_id=${clientId}&month=${month}`),
    getMasterCalendar: (month: string, clientId?: string, contentType?: string) =>
        api.get<ContentItem[]>(`/api/gm/master-calendar?month=${month}${clientId ? `&client_id=${clientId}` : ''}${contentType ? `&content_type=${contentType}` : ''}`),
    getContentDetails: (id: string) => api.get<ContentDetails>(`/api/gm/content/${id}`),
    addContent: (data: Partial<ContentItem>) => api.post('/api/gm/content', data),
    updateContent: (id: string, data: Partial<ContentItem>) => api.put(`/api/gm/content/${id}`, data),
    deleteContent: (id: string) => api.delete(`/api/gm/content/${id}`),
    updateStatus: (id: string, new_status: string, note?: string, changed_by?: string) =>
        api.patch(`/api/gm/content/${id}/status`, { new_status, note, changed_by }),
    getTeamLeads: () => api.get('/api/gm/team-leads'),
    assignClient: (clientId: string, teamLeadId: string) => api.patch(`/api/gm/clients/${clientId}/assign`, { team_lead_id: teamLeadId }),
    getTeamLeadClients: (teamLeadId: string) => api.get(`/api/gm/team-leads/${teamLeadId}/clients`),
    undoStatus: (contentId: string) => api.post(`/api/gm/content/${contentId}/undo-status`),
    getPocNotes: (month: string, teamLeadId?: string, clientId?: string) =>
        api.get<PocNote[]>(`/api/gm/poc-notes?month=${month}${teamLeadId ? `&team_lead_id=${teamLeadId}` : ''}${clientId ? `&client_id=${clientId}` : ''}`),
};

const adminBase = axios.create({
    baseURL: API_BASE_URL,
});

adminBase.interceptors.request.use(async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
});

export interface TeamMember {
    user_id: string; // The primary key from Supabase 'users' table
    id?: string;     // Legacy/fallback
    name: string;
    email: string;
    role: string;
    role_identifier?: string;
    created_at: string;
}

export const adminApi = {
    getClients: () => adminBase.get<Client[]>('/api/admin/clients'),
    addClient: (data: Partial<Client>) => adminBase.post('/api/admin/clients', data),
    updateClient: (id: string, data: Partial<Client>) => adminBase.put(`/api/admin/clients/${id}`, data),
    deleteClient: (id: string) => adminBase.delete(`/api/admin/clients/${id}`),
    getStats: () => adminBase.get('/api/admin/stats'),
    getTeam: () => adminBase.get<TeamMember[]>('/api/admin/team'),
    addTeamMember: (data: Partial<TeamMember>) => adminBase.post('/api/admin/team', data),
    updateTeamMember: (id: string, data: Record<string, unknown>) => adminBase.put(`/api/admin/team/${id}`, data),
    deleteTeamMember: (id: string) => adminBase.delete(`/api/admin/team/${id}`),
    getMasterCalendar: (month: string, clientId?: string, contentType?: string) =>
        adminBase.get<ContentItem[]>(`/api/admin/master-calendar?month=${month}${clientId ? `&client_id=${clientId}` : ''}${contentType ? `&content_type=${contentType}` : ''}`),
    getContentDetails: (id: string) => adminBase.get<ContentDetails>(`/api/admin/content/${id}`),
    undoStatus: (contentId: string) => adminBase.post(`/api/admin/content/${contentId}/undo-status`),
    addContent: (data: Partial<ContentItem>) => adminBase.post('/api/admin/content', data),
    updateContent: (id: string, data: Partial<ContentItem>) => adminBase.put(`/api/admin/content/${id}`, data),
    deleteContent: (id: string) => adminBase.delete(`/api/admin/content/${id}`),
};

const cooBase = axios.create({
    baseURL: API_BASE_URL,
});

cooBase.interceptors.request.use(async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
});

export const cooApi = {
    getClients: () => cooBase.get<Client[]>('/api/coo/clients'),
    getStats: () => cooBase.get('/api/coo/stats'),
    getTeam: () => cooBase.get<TeamMember[]>('/api/coo/team'),
    getMasterCalendar: (month: string, clientId?: string, contentType?: string) =>
        cooBase.get<ContentItem[]>(`/api/coo/master-calendar?month=${month}${clientId ? `&client_id=${clientId}` : ''}${contentType ? `&content_type=${contentType}` : ''}`),
    getContentDetails: (id: string) => cooBase.get<ContentDetails>(`/api/coo/content/${id}`),
};

const phBase = axios.create({
    baseURL: API_BASE_URL,
});

phBase.interceptors.request.use(async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
});

export const phApi = {
    getToday: () => phBase.get<ContentItem[]>('/api/ph/today'),
    getClients: () => phBase.get<Client[]>('/api/ph/clients'),
    getCalendar: (clientId: string, month: string, status?: string, all?: boolean) =>
        phBase.get<ContentItem[]>('/api/ph/calendar', { params: { client_id: clientId, month, status, all: all ? 'true' : undefined } }),
    getStats: (month?: string) => phBase.get(`/api/ph/stats${month ? `?month=${month}` : ''}`),
    getMasterCalendar: (month: string, clientId?: string, contentType?: string) =>
        phBase.get<ContentItem[]>(`/api/ph/master-calendar?month=${month}${clientId ? `&client_id=${clientId}` : ''}${contentType ? `&content_type=${contentType}` : ''}`),
    getContentDetails: (id: string) => phBase.get<ContentDetails>(`/api/ph/content/${id}`),
    updateStatus: (id: string, newStatus: string, changedBy?: string) => 
        phBase.patch(`/api/ph/content/${id}/status`, { new_status: newStatus, changed_by: changedBy }),
    undoStatus: (id: string) => phBase.post(`/api/ph/content/${id}/undo`),
};

const tlBase = axios.create({
    baseURL: `${API_BASE_URL}/api/tl/`,
});

tlBase.interceptors.request.use(async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
});

export const tlApi = {
    getClients: (tlId: string) => tlBase.get<Client[]>(`clients?tlId=${tlId}`),
    getCalendar: (clientId: string, month: string, tlId: string) => tlBase.get(`calendar?client_id=${clientId}&month=${month}&tlId=${tlId}`),
    getMasterCalendar: (month: string, tlId: string, contentType?: string) =>
        tlBase.get<ContentItem[]>(`master-calendar?month=${month}&tlId=${tlId}${contentType ? `&content_type=${contentType}` : ''}`),
    getPocNotes: (month: string, tlId: string, clientId?: string) =>
        tlBase.get<PocNote[]>(`poc-notes?month=${month}&tlId=${tlId}${clientId ? `&client_id=${clientId}` : ''}`),
    addPocNote: (data: { tlId: string; client_id: string; note_date: string; note_text: string }) =>
        tlBase.post<PocNote>('poc-notes', data),
};

// ─── Posting Team API ───
const postingBase = axios.create({
    baseURL: `${API_BASE_URL}/api/posting/`,
});

postingBase.interceptors.request.use(async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
});

export const postingApi = {
    getToday: () => postingBase.get<ContentItem[]>('today'),
    getClients: () => postingBase.get<Client[]>('clients'),
    getCalendar: (clientId: string, month: string, status?: string, all?: boolean) =>
        postingBase.get<ContentItem[]>('calendar', { params: { client_id: clientId, month, status, all: all ? 'true' : undefined } }),
    getMasterCalendar: (month: string, client_id?: string, status?: string, all?: boolean) =>
        postingBase.get<ContentItem[]>('master-calendar', { params: { month, client_id, status, all: all ? 'true' : undefined } }),
    getContentDetails: (id: string) =>
        postingBase.get<ContentDetails>(`content/${id}`),
    markAsPosted: (id: string, changedBy?: string) =>
        postingBase.patch(`content/${id}/post`, { changed_by: changedBy }),
    undoStatus: (id: string) =>
        postingBase.post(`content/${id}/undo`),
};

const notificationBase = axios.create({
    baseURL: API_BASE_URL,
});

notificationBase.interceptors.request.use(async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
});

export interface NotificationItem {
    id: string;
    is_read: boolean;
    read_at: string | null;
    notification_id: string;
    notifications: {
        title: string;
        message: string;
        type: 'INFO' | 'WARNING' | 'URGENT';
        created_at: string;
        sender_id: string;
    };
}

export interface NotificationTarget {
    type: 'ALL' | 'ROLE' | 'ROLE_IDENTIFIER' | 'USER';
    value?: string;
}

export const notificationApi = {
    getNotifications: () => notificationBase.get<NotificationItem[]>('/api/notifications'),
    getUnreadCount: () => notificationBase.get<{ count: number }>('/api/notifications/unread-count'),
    markAsRead: (notificationId: string) => notificationBase.patch(`/api/notifications/${notificationId}/read`),
    sendNotification: (payload: {
        title: string;
        message: string;
        type: 'INFO' | 'WARNING' | 'URGENT';
        target: NotificationTarget;
    }) => notificationBase.post('/api/notifications/send', payload),
};

// ─── Emergency Tasks API ───
const emergencyBase = axios.create({
    baseURL: `${API_BASE_URL}/api/emergency`,
});

emergencyBase.interceptors.request.use(async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
});

export const emergencyApi = {
    getToday: () => emergencyBase.get<ContentItem[]>('/today'),
    getAll: () => emergencyBase.get<ContentItem[]>('/all'),
    getMonth: (month: string) => emergencyBase.get<ContentItem[]>(`/month?month=${month}`),
    toggle: (id: string) => emergencyBase.post(`/${id}/toggle`),
};

const handleAuthError = (error: any) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        if (typeof window !== 'undefined' && window.location.pathname !== '/') {
            window.location.href = '/';
        }
    }
    return Promise.reject(error);
};

api.interceptors.response.use((r) => r, handleAuthError);
adminBase.interceptors.response.use((r) => r, handleAuthError);
cooBase.interceptors.response.use((r) => r, handleAuthError);
phBase.interceptors.response.use((r) => r, handleAuthError);
tlBase.interceptors.response.use((r) => r, handleAuthError);
postingBase.interceptors.response.use((r) => r, handleAuthError);
notificationBase.interceptors.response.use((r) => r, handleAuthError);
emergencyBase.interceptors.response.use((r) => r, handleAuthError);

export default api;
