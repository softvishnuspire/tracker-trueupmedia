import axios from 'axios';
import { supabase } from '../utils/supabase';
import { router } from 'expo-router';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://tracker-trueupmedia.onrender.com';
console.log('--- API_BASE_URL:', API_BASE_URL);

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
    password?: string; // For adding/updating clients
    team_lead?: { name: string; role_identifier?: string };
    employee_id?: string | null;
    writer_employee_id?: string | null;
    reel_employee_id?: string | null;
    post_employee_id?: string | null;
    created_at?: string;
}

export interface ContentItem {
    id: string;
    title: string;
    description: string;
    content_type: 'Post' | 'Reel' | 'YouTube' | 'Special Poster' | 'Special Day Poster';
    scheduled_datetime: string;
    status: string;
    client_id: string;
    is_rescheduled?: boolean;
    original_scheduled_datetime?: string;
    is_cross_month_rescheduled?: boolean;
    reschedule_history?: { from: string; to: string; rescheduled_at: string }[];
    is_emergency?: boolean;
    emergency_marked_at?: string;
    clients?: { company_name: string; batch_type?: '1-1' | '15-15'; team_lead?: { name: string; role_identifier?: string } };
    assigned_to?: string;
    assigned_employee?: { name: string; role_identifier?: string };
    employee_task_status?: 'PENDING' | 'COMPLETED';
    freelancer_name?: string;
    freelancer_phone?: string;
    freelancer_email?: string;
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
    updated_at?: string;
    updated_by?: string;
    history?: { note_text: string; updated_at: string; updated_by: string }[];
    users?: { name?: string; role_identifier?: string };
    clients?: { company_name?: string };
}

export const gmApi = {
    getClients: () => api.get<Client[]>('/api/gm/clients'),
    getCalendar: (clientId: string, month: string) => api.get(`/api/gm/calendar?client_id=${clientId}&month=${month}`),
    getMasterCalendar: (month: string, clientId?: string, contentType?: string, asOfDate?: string) =>
        api.get<ContentItem[]>(`/api/gm/master-calendar?month=${month}${clientId ? `&client_id=${clientId}` : ''}${contentType ? `&content_type=${contentType}` : ''}${asOfDate ? `&asOfDate=${asOfDate}` : ''}`),
    getContentDetails: (id: string, asOfDate?: string) => api.get<ContentDetails>(`/api/gm/content/${id}${asOfDate ? `?asOfDate=${asOfDate}` : ''}`),
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

export interface OnboardingRequest {
    id: string;
    full_name: string;
    email: string;
    phone_number: string;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    created_at: string;
}

export interface TlTrackingStats {
    id: string;
    name: string;
    email: string;
    totalClients: number;
    talkedToday: number;
    progress: number;
    todayContentTotal: number;
    todayContentDone: number;
    assignedClients: {
        id: string;
        name: string;
        talkedToday: boolean;
    }[];
}

export interface EmployeeTrackingStats {
    id: string;
    name: string;
    email: string;
    role: string;
    assignedTasks: number;
    completedTasks: number;
    completionRate: number;
    monthlyTotal: number;
    monthlyCompleted: number;
    monthlyRate: number;
    assignedClients?: {
        id: string;
        name: string;
        role: string;
        dailyCompleted?: number;
        dailyTotal?: number;
        monthlyCompleted?: number;
        monthlyTotal?: number;
    }[];
    tasks?: {
        id: string;
        title: string;
        clientName: string;
        status: string;
        employeeStatus?: string;
        scheduledDate: string;
    }[];
}

export interface TrackingProductivityResponse {
    date: string;
    teamLeads: TlTrackingStats[];
    employees: EmployeeTrackingStats[];
}

export const adminApi = {
    getClients: async () => {
        const { data, error } = await supabase
            .from('clients')
            .select('*, team_lead:team_lead_id (name)')
            .eq('is_deleted', false)
            .order('company_name');
        if (error) throw error;
        return { data: data || [] };
    },
    addClient: async (data: Partial<Client>) => {
        const { data: inserted, error } = await supabase
            .from('clients')
            .insert([data])
            .select()
            .single();
        if (error) throw error;
        return { data: inserted };
    },
    updateClient: async (id: string, data: Partial<Client>) => {
        const { data: updated, error } = await supabase
            .from('clients')
            .update(data)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return { data: updated };
    },
    deleteClient: async (id: string) => {
        const { error } = await supabase
            .from('clients')
            .update({ is_deleted: true, is_active: false })
            .eq('id', id);
        if (error) throw error;
        return { data: { success: true } };
    },
    getStats: () => adminBase.get('/api/admin/stats'), // Keep legacy fallback
    getTeam: () => adminBase.get<TeamMember[]>('/api/admin/team'),
    addTeamMember: (data: Partial<TeamMember>) => adminBase.post('/api/admin/team', data), // Uses service role for auth creation, route through backend
    updateTeamMember: (id: string, data: Record<string, unknown>) => adminBase.put(`/api/admin/team/${id}`, data),
    deleteTeamMember: (id: string) => adminBase.delete(`/api/admin/team/${id}`),
    getMasterCalendar: async (month: string, clientId?: string, contentType?: string) => {
        const [year, mon] = month.split('-');
        const startDate = `${year}-${mon}-01T00:00:00Z`;
        const lastDay = new Date(parseInt(year), parseInt(mon), 0).getDate();
        const endDate = `${year}-${mon}-${String(lastDay).padStart(2, '0')}T23:59:59Z`;

        let q = supabase
            .from('content_items')
            .select(`*, clients(company_name, batch_type, team_lead:team_lead_id(name)), assigned_employee:assigned_to(name, role_identifier)`)
            .gte('scheduled_datetime', startDate)
            .lte('scheduled_datetime', endDate);

        if (clientId && clientId !== 'all') {
            q = q.eq('client_id', clientId);
        }
        if (contentType) {
            q = q.eq('content_type', contentType);
        }

        const { data, error } = await q;
        if (error) throw error;

        // Enrich items with cross-month rescheduling flags
        const enriched = (data || []).map(item => {
            let is_cross_month_rescheduled = false;
            if (item.is_rescheduled && item.original_scheduled_datetime && item.scheduled_datetime) {
                const orig = new Date(item.original_scheduled_datetime);
                const sched = new Date(item.scheduled_datetime);
                if (!isNaN(orig.getTime()) && !isNaN(sched.getTime())) {
                    const batch_type = (item.clients as any)?.batch_type || '1-1';
                    if (batch_type === '15-15') {
                        const get15PeriodStartMonth = (date: Date) => {
                            const day = date.getUTCDate();
                            const month = date.getUTCMonth();
                            const year = date.getUTCFullYear();
                            if (day >= 15) {
                                return { year, month };
                            } else {
                                const prev = new Date(Date.UTC(year, month - 1, 15));
                                return { year: prev.getUTCFullYear(), month: prev.getUTCMonth() };
                            }
                        };
                        const origPeriod = get15PeriodStartMonth(orig);
                        const schedPeriod = get15PeriodStartMonth(sched);
                        is_cross_month_rescheduled = (origPeriod.year !== schedPeriod.year) || (origPeriod.month !== schedPeriod.month);
                    } else {
                        is_cross_month_rescheduled = (orig.getUTCFullYear() !== sched.getUTCFullYear()) || (orig.getUTCMonth() !== sched.getUTCMonth());
                    }
                }
            }
            return {
                ...item,
                is_cross_month_rescheduled
            };
        });

        // Sort items by scheduled date/time ascending
        enriched.sort((a, b) => new Date(a.scheduled_datetime).getTime() - new Date(b.scheduled_datetime).getTime());
        return { data: enriched };
    },
    getContentDetails: (id: string, asOfDate?: string) => adminBase.get<ContentDetails>(`/api/admin/content/${id}${asOfDate ? `?asOfDate=${asOfDate}` : ''}`),
    updateStatus: async (id: string, newStatus: string, note?: string, changedBy?: string) => {
        // Update status of the item
        const { data: updatedItem, error } = await supabase
            .from('content_items')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;

        // Log status change
        try {
            await supabase.from('status_logs').insert([{
                item_id: id,
                new_status: newStatus,
                changed_by: changedBy || null,
                note: note || `Mobile Status Update: ${newStatus}`
            }]);
        } catch (logErr) {
            console.warn('Logging status change warning:', logErr);
        }

        return { data: updatedItem };
    },
    undoStatus: (contentId: string) => adminBase.post(`/api/admin/content/${contentId}/undo-status`),
    addContent: async (data: Partial<ContentItem>) => {
        const { data: inserted, error } = await supabase
            .from('content_items')
            .insert([data])
            .select()
            .single();
        if (error) throw error;
        return { data: inserted };
    },
    updateContent: async (id: string, data: Partial<ContentItem>) => {
        const { data: updated, error } = await supabase
            .from('content_items')
            .update(data)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return { data: updated };
    },
    deleteContent: async (id: string) => {
        const { error } = await supabase
            .from('content_items')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return { data: { success: true } };
    },
    getOnboardingRequests: async () => {
        const { data, error } = await supabase
            .from('onboarding_requests')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return { data: data || [] };
    },
    acceptOnboarding: (id: string, password: string) => adminBase.post(`/api/admin/onboarding-requests/${id}/accept`, { password }),
    rejectOnboarding: (id: string) => adminBase.post(`/api/admin/onboarding-requests/${id}/reject`),
    getTrackingStats: (date?: string) => adminBase.get<TrackingProductivityResponse>(`/api/admin/tracking/productivity${date ? `?date=${date}` : ''}`),
    getStreaks: async (month?: string) => {
        let selectedMonth = month;
        if (!selectedMonth) {
            const now = new Date();
            const formatter = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Asia/Kolkata',
                year: 'numeric',
                month: '2-digit'
            });
            selectedMonth = formatter.format(now).substring(0, 7);
        }

        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('user_id, name, email, role, role_identifier');
        if (usersError) throw usersError;

        const { data: clients, error: clientsError } = await supabase
            .from('clients')
            .select('id, company_name, team_lead_id')
            .eq('is_active', true)
            .eq('is_deleted', false);
        if (clientsError) throw clientsError;

        const { data: streaks, error: streaksError } = await supabase
            .from('user_streaks')
            .select('*')
            .gte('streak_date', `${selectedMonth}-01`)
            .lte('streak_date', `${selectedMonth}-31`);

        const streaksData = streaksError ? [] : (streaks || []);

        const teamLeads = users.filter(u => {
            const r = (u.role || '').toUpperCase().trim();
            const ri = (u.role_identifier || '').toUpperCase().trim();
            return ri.startsWith('TL') || ['TEAM LEAD', 'TL'].includes(r) || ['TEAM LEAD', 'TL'].includes(ri);
        });

        const employees = users.filter(u => {
            const r = (u.role || '').toUpperCase().trim();
            const ri = (u.role_identifier || '').toUpperCase().trim();
            return ['EMPLOYEE'].includes(r) || ['EMPLOYEE'].includes(ri);
        });

        const tlResponse = teamLeads.map(tl => {
            const tlClients = clients.filter(c => c.team_lead_id === tl.user_id);
            const tlStreaks = streaksData.filter(s => s.user_id === tl.user_id && s.streak_type === 'TL_COMMUNICATION');
            return {
                id: tl.user_id,
                name: tl.name,
                email: tl.email,
                role: tl.role_identifier || tl.role,
                streakCount: tlStreaks.length,
                streakDays: tlStreaks.map(s => s.streak_date),
                assignedClients: tlClients.map(c => c.company_name)
            };
        });

        const empResponse = employees.map(emp => {
            const empStreaks = streaksData.filter(s => s.user_id === emp.user_id && s.streak_type === 'EMPLOYEE_TASKS');
            return {
                id: emp.user_id,
                name: emp.name,
                email: emp.email,
                role: emp.role_identifier || emp.role,
                streakCount: empStreaks.length,
                streakDays: empStreaks.map(s => s.streak_date)
            };
        });

        return { data: { teamLeads: tlResponse, employees: empResponse } };
    },
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
    getMasterCalendar: (month: string, clientId?: string, contentType?: string, asOfDate?: string) =>
        cooBase.get<ContentItem[]>(`/api/coo/master-calendar?month=${month}${clientId ? `&client_id=${clientId}` : ''}${contentType ? `&content_type=${contentType}` : ''}${asOfDate ? `&asOfDate=${asOfDate}` : ''}`),
    getContentDetails: (id: string, asOfDate?: string) => cooBase.get<ContentDetails>(`/api/coo/content/${id}${asOfDate ? `?asOfDate=${asOfDate}` : ''}`),
    updateStatus: (id: string, newStatus: string, note?: string, changedBy?: string) =>
        cooBase.patch(`/api/coo/content/${id}/status`, { new_status: newStatus, note, changed_by: changedBy }),
    undoStatus: (id: string) => cooBase.post(`/api/coo/content/${id}/undo`),
    addContent: (data: Partial<ContentItem>) => cooBase.post('/api/coo/content', data),
    updateContent: (id: string, data: Partial<ContentItem>) => cooBase.put(`/api/coo/content/${id}`, data),
    deleteContent: (id: string) => cooBase.delete(`/api/coo/content/${id}`),
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
    getToday: async () => {
        const todayStr = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
            .from('content_items')
            .select('*, clients(company_name)')
            .gte('scheduled_datetime', `${todayStr}T00:00:00`)
            .lte('scheduled_datetime', `${todayStr}T23:59:59`);
        if (error) throw error;
        return { data: data || [] };
    },
    getClients: () => phBase.get<Client[]>('/api/ph/clients'),
    getCalendar: (clientId: string, month: string, status?: string, all?: boolean) =>
        phBase.get<ContentItem[]>('/api/ph/calendar', { params: { client_id: clientId, month, status, all: all ? 'true' : undefined } }),
    getViewAllClientCalendar: (clientId: string, month: string) =>
        phBase.get<ContentItem[]>('/api/ph/calendar', { params: { client_id: clientId, month, view_all: 'true' } }),
    getStats: (month?: string) => phBase.get(`/api/ph/stats${month ? `?month=${month}` : ''}`),
    getMasterCalendar: (month: string, clientId?: string, contentType?: string, asOfDate?: string) =>
        phBase.get<ContentItem[]>(`/api/ph/master-calendar?month=${month}${clientId ? `&client_id=${clientId}` : ''}${contentType ? `&content_type=${contentType}` : ''}${asOfDate ? `&asOfDate=${asOfDate}` : ''}`),
    getContentDetails: (id: string, asOfDate?: string, viewOnly?: boolean) => {
        const params = new URLSearchParams();
        if (asOfDate) params.set('asOfDate', asOfDate);
        if (viewOnly) params.set('view_only', 'true');
        const qs = params.toString();
        return phBase.get<ContentDetails>(`/api/ph/content/${id}${qs ? `?${qs}` : ''}`);
    },
    updateStatus: (id: string, newStatus: string, note?: string, changedBy?: string) =>
        phBase.patch(`/api/ph/content/${id}/status`, { new_status: newStatus, note, changed_by: changedBy }),
    undoStatus: (id: string) => phBase.post(`/api/ph/content/${id}/undo`),
    getEmployees: () => phBase.get<TeamMember[]>('/api/ph/employees'),
    assignEmployee: (id: string, employeeId: string | null) =>
        phBase.patch(`/api/ph/content/${id}/assign`, { assigned_to: employeeId }),
    assignEmployeeToClient: (clientId: string, employeeId: string | null, unassignId?: string | null) =>
        phBase.patch(`/api/ph/clients/${clientId}/assign-employee`, { employee_id: employeeId, unassign_id: unassignId }),
    addFreelancerContent: (data: any) => phBase.post('/api/ph/freelancer-content', data),
};

const employeeBase = axios.create({
    baseURL: API_BASE_URL,
});

employeeBase.interceptors.request.use(async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
});

export const employeeApi = {
    getTasks: async (month?: string) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return { data: [] };
        
        let query = supabase
            .from('content_items')
            .select('*, clients(company_name)')
            .eq('assigned_to', session.user.id);
        
        if (month) {
            query = query
                .gte('scheduled_datetime', `${month}-01T00:00:00`)
                .lte('scheduled_datetime', `${month}-31T23:59:59`);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        return { data: data || [] };
    },
    updateTaskStatus: (id: string, status: 'PENDING' | 'COMPLETED') =>
        employeeBase.patch(`/api/employee/tasks/${id}/status`, { status }),
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
    getClients: async (tlId: string) => {
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('team_lead_id', tlId)
            .eq('is_deleted', false);
        if (error) throw error;
        return { data: data || [] };
    },
    getCalendar: (clientId: string, month: string, tlId: string) => tlBase.get(`calendar?client_id=${clientId}&month=${month}&tlId=${tlId}`),
    getMasterCalendar: async (month: string, tlId: string, clientId?: string, contentType?: string) => {
        const { data: clients } = await supabase
            .from('clients')
            .select('id')
            .eq('team_lead_id', tlId)
            .eq('is_deleted', false);
        const clientIds = (clients || []).map(c => c.id);
        if (clientIds.length === 0) return { data: [] };

        let query = supabase
            .from('content_items')
            .select('*, clients(company_name)')
            .in('client_id', clientIds)
            .gte('scheduled_datetime', `${month}-01T00:00:00`)
            .lte('scheduled_datetime', `${month}-31T23:59:59`);
        
        if (clientId) {
            query = query.eq('client_id', clientId);
        }
        if (contentType) {
            query = query.eq('content_type', contentType);
        }

        const { data, error } = await query;
        if (error) throw error;
        return { data: data || [] };
    },
    getPocNotes: async (month: string, tlId: string, clientId?: string) => {
        let query = supabase
            .from('poc_communications')
            .select('*, users:team_lead_id (name)')
            .eq('team_lead_id', tlId)
            .gte('note_date', `${month}-01`)
            .lte('note_date', `${month}-31`);
        
        if (clientId) {
            query = query.eq('client_id', clientId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return { data: data || [] };
    },
    addPocNote: (data: { tlId: string; client_id: string; note_date: string; note_text: string }) =>
        tlBase.post<PocNote>('poc-notes', data),
    updatePocNote: (id: string, data: { note_text: string; actor_id?: string }) =>
        tlBase.put<PocNote>(`poc-notes/${id}`, data),
    deletePocNote: (id: string) =>
        tlBase.delete<{ message: string }>(`poc-notes/${id}`),
    undoStatus: (id: string) => tlBase.post(`content/${id}/undo-status`),
};

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
    getToday: async () => {
        const todayStr = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
            .from('content_items')
            .select('*, clients(company_name)')
            .gte('scheduled_datetime', `${todayStr}T00:00:00`)
            .lte('scheduled_datetime', `${todayStr}T23:59:59`);
        if (error) throw error;
        return { data: data || [] };
    },
    getClients: () => postingBase.get<Client[]>('clients'),
    getCalendar: (clientId: string, month: string, status?: string, all?: boolean) =>
        postingBase.get<ContentItem[]>('calendar', { params: { client_id: clientId, month, status, all: all ? 'true' : undefined } }),
    getMasterCalendar: (month: string, client_id?: string, status?: string, all?: boolean, asOfDate?: string) =>
        postingBase.get<ContentItem[]>('master-calendar', { params: { month, client_id, status, all: all ? 'true' : undefined, asOfDate } }),
    getContentDetails: (id: string, asOfDate?: string) =>
        postingBase.get<ContentDetails>(`content/${id}${asOfDate ? `?asOfDate=${asOfDate}` : ''}`),
    updateStatus: (id: string, newStatus: string, note?: string, changedBy?: string) =>
        postingBase.patch(`content/${id}/status`, { new_status: newStatus, note, changed_by: changedBy }),
    markAsPosted: (id: string, changedBy?: string) =>
        postingBase.patch(`content/${id}/post`, { changed_by: changedBy }),
    undoStatus: (id: string) =>
        postingBase.post(`content/${id}/undo`),
};

const contentHeadBase = axios.create({
    baseURL: API_BASE_URL,
});

contentHeadBase.interceptors.request.use(async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
});

export const contentHeadApi = {
    getWriters: () => contentHeadBase.get<TeamMember[]>('/api/content-head/writers'),
    createWriter: (data: any) => contentHeadBase.post('/api/content-head/writers', data),
    deleteWriter: (id: string) => contentHeadBase.delete(`/api/content-head/writers/${id}`),
    assignWriterToClient: (clientId: string, employeeId: string | null, unassignId?: string | null) =>
        contentHeadBase.patch(`/api/content-head/clients/${clientId}/assign-writer`, { employee_id: employeeId, unassign_id: unassignId }),
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

export interface SystemSetting {
    key: string;
    value: any;
    updated_at: string;
}

export const settingsApi = {
    getSettings: async () => {
        const { data, error } = await supabase
            .from('system_settings')
            .select('*');
        if (error) throw error;
        return { data: data || [] };
    },
    updateSetting: async (key: string, value: any) => {
        const { data, error } = await supabase
            .from('system_settings')
            .upsert({ key, value, updated_at: new Date().toISOString() })
            .select();
        if (error) throw error;
        return { data: data ? data[0] : null };
    },
};

export const emergencyApi = {
    getToday: () => api.get<ContentItem[]>('/api/emergency/today'),
    getAll: () => api.get<ContentItem[]>('/api/emergency/all'),
    getMonth: (month: string) => api.get<ContentItem[]>(`/api/emergency/month?month=${month}`),
    toggle: (id: string) => api.post(`/api/emergency/${id}/toggle`),
};

const handleAuthError = (error: any) => {
    const status = error.response?.status;

    if (status === 401) {
        router.replace('/');
    } else if (status === 403) {
        console.warn('[API] 403 on role-restricted endpoint. Redirecting to login.');
        supabase.auth.signOut().finally(() => {
            router.replace('/');
        });
    }
    return Promise.reject(error);
};

api.interceptors.response.use((r) => r, handleAuthError);
adminBase.interceptors.response.use((r) => r, handleAuthError);
cooBase.interceptors.response.use((r) => r, handleAuthError);
phBase.interceptors.response.use((r) => r, handleAuthError);
employeeBase.interceptors.response.use((r) => r, handleAuthError);
tlBase.interceptors.response.use((r) => r, handleAuthError);
postingBase.interceptors.response.use((r) => r, handleAuthError);
contentHeadBase.interceptors.response.use((r) => r, handleAuthError);
notificationBase.interceptors.response.use((r) => r, handleAuthError);

export const dashboardApi = {
    getPendingImportant: () => api.get<ContentItem[]>('/api/dashboard/pending-important'),
};

export const publicApi = {
    submitOnboarding: (data: { full_name: string; email: string; phone_number?: string }) =>
        axios.post(`${API_BASE_URL}/api/onboarding/submit`, data),
};

export default api;
