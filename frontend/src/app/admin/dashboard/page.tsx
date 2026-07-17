"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { 
  Calendar, ShieldAlert, FileText, Video, ArrowRight, 
  X, Undo2, Edit2, Trash2, ChevronDown, Filter, ChevronLeft, ChevronRight, Clock, Check,
  Layers, Film, MessageSquare, Activity, Users, Globe, Loader2
} from 'lucide-react';
import { adminApi, emergencyApi, gmApi, dashboardApi, ContentItem, StatusHistoryItem, PocNote } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { endOfWeek, format, isSameDay, isSameMonth, parseISO, startOfWeek, startOfMonth, endOfMonth, subMonths, addMonths, startOfDay, endOfDay } from 'date-fns';
import { createClient } from '@/utils/supabase/client';
import { formatIST, formatISTForm, convertISTToUTC, getISTDate } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';
import { usePageLoading } from '@/components/ui/TopProgressBar';
import { useOptimisticAction } from '@/hooks/useOptimisticAction';
import { isCrossMonthRescheduled, get15BiMonthlyPeriod } from '@/utils/calendarUtils';
import '../../gm/dashboard/gm.css';

interface ContentDetails {
  item: ContentItem;
  history: StatusHistoryItem[];
}

export default function AdminDashboard() {
  const { startLoading, stopLoading } = usePageLoading();
  const { success: toastSuccess, error: toastError } = useToast();
  const performOptimisticAction = useOptimisticAction();

  const [calendarData, setCalendarData] = useState<ContentItem[]>([]);
  const [globalCalendarData, setGlobalCalendarData] = useState<ContentItem[]>([]);
  const [pocNotes, setPocNotes] = useState<PocNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emergencyTasks, setEmergencyTasks] = useState<ContentItem[]>([]);
  const [pendingTasks, setPendingTasks] = useState<ContentItem[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [activeItem, setActiveItem] = useState<ContentDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [dayTasks, setDayTasks] = useState<ContentItem[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    time: '12:00',
    content_type: 'Post' as ContentItem['content_type']
  });
  
  const supabase = createClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const shootDoneStatuses = [
    'SHOOT DONE',
    'EDITING IN PROGRESS',
    'EDITED',
    'WAITING FOR FINAL APPROVAL',
    'APPROVED',
    'WAITING FOR POSTING',
    'POSTED'
  ];

  const contentApprovedStatuses = [
    'CONTENT READY',
    'WAITING FOR APPROVAL',
    'CONTENT APPROVED',
    'SHOOT DONE',
    'EDITING IN PROGRESS',
    'EDITED',
    'WAITING FOR FINAL APPROVAL',
    'APPROVED',
    'WAITING FOR POSTING',
    'POSTED',
    'DESIGNING IN PROGRESS',
    'DESIGNING COMPLETED'
  ];

  const getPeriodLabel = () => {
    if (isBiMonthlyView) {
      return `${format(periodStart, 'MMM d')} – ${format(periodEnd, 'MMM d, yyyy')}`;
    }
    return `Current Month (${format(startOfMonth(currentMonth), 'MMM d')} - ${format(endOfMonth(currentMonth), 'MMM d')})`;
  };

  const selectedClientData = clients.find(c => c.id === selectedClient);
  const isBiMonthlyView = !!selectedClient && selectedClientData?.batch_type === '15-15';

  const { periodStart, periodEnd } = isBiMonthlyView
    ? get15BiMonthlyPeriod(currentMonth)
    : { periodStart: startOfMonth(currentMonth), periodEnd: endOfMonth(currentMonth) };

  const isDayInPeriod = useCallback((date: Date) => {
    if (!isBiMonthlyView) return isSameMonth(date, currentMonth);
    return date >= startOfDay(periodStart) && date <= endOfDay(periodEnd);
  }, [currentMonth, isBiMonthlyView, periodStart, periodEnd]);

  const getCalendarItemDate = (item: ContentItem) => getISTDate(item.scheduled_datetime);

  useEffect(() => {
    if (clients.length > 0 && !selectedClient) {
      setSelectedClient(clients[0].id);
    }
  }, [clients, selectedClient]);

  const fetchDashboardLists = useCallback(async () => {
    try {
      const [emergencyRes, pendingRes] = await Promise.all([
        emergencyApi.getAll(),
        dashboardApi.getPendingImportant()
      ]);
      setEmergencyTasks(emergencyRes.data || []);
      setPendingTasks(pendingRes.data || []);
    } catch (err) {
      console.error('Failed to load dashboard lists:', err);
    }
  }, []);

  const fetchClientCalendarData = useCallback(async (clientId: string) => {
    if (!clientId) return [];
    try {
      const client = clients.find(c => c.id === clientId);
      const is1515 = client?.batch_type === '15-15';

      if (is1515) {
        const isSecondHalf = currentMonth.getDate() >= 15;
        const startMonth = isSecondHalf ? currentMonth : subMonths(currentMonth, 1);
        const endMonth = isSecondHalf ? addMonths(currentMonth, 1) : currentMonth;
        const [resStart, resEnd] = await Promise.all([
          gmApi.getCalendar(clientId, format(startMonth, 'yyyy-MM')),
          gmApi.getCalendar(clientId, format(endMonth, 'yyyy-MM')),
        ]);
        return [...(resStart.data || []), ...(resEnd.data || [])];
      }

      const res = await gmApi.getCalendar(clientId, format(currentMonth, 'yyyy-MM'));
      return res.data || [];
    } catch (error) {
      console.error('Error fetching client calendar:', error);
      return [];
    }
  }, [currentMonth, clients]);

  const fetchDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      startLoading();
      if (calendarData.length === 0) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
    } else {
      setIsRefreshing(true);
    }
    try {
      let currentClients = clients;
      if (currentClients.length === 0) {
        const clientsRes = await gmApi.getClients();
        currentClients = clientsRes.data;
        setClients(currentClients);
      }

      const currentMonthStr = format(currentMonth, 'yyyy-MM');
      const globalRes = await gmApi.getMasterCalendar(currentMonthStr);
      setGlobalCalendarData(globalRes.data || []);

      const activeClientId = selectedClient || currentClients[0]?.id;
      if (activeClientId) {
        const clientData = await fetchClientCalendarData(activeClientId);
        setCalendarData(clientData);

        try {
          const pocRes = await gmApi.getPocNotes(currentMonthStr, undefined, activeClientId);
          setPocNotes(pocRes.data || []);
        } catch (pocErr) {
          console.error('Failed to load POC notes:', pocErr);
          setPocNotes([]);
        }
      }

      await fetchDashboardLists();
    } catch (err: unknown) {
      console.error('Failed to load dashboard data:', err instanceof Error ? err.message : String(err));
      setError(err instanceof Error ? err.message : String(err));
      toastError('Failed to refresh dashboard data.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      if (!isSilent) stopLoading();
    }
  }, [selectedClient, currentMonth, clients, calendarData.length, fetchClientCalendarData, fetchDashboardLists, startLoading, stopLoading, toastError]);

  useEffect(() => {
    const isSilent = calendarData.length > 0;
    fetchDashboardData(isSilent);
  }, [fetchDashboardData]);

  useEffect(() => {
    if (!isModalOpen) {
      const params = new URLSearchParams(window.location.search);
      if (params.has('taskId')) {
        params.delete('taskId');
        const newSearch = params.toString();
        window.history.replaceState(null, '', newSearch ? `?${newSearch}` : window.location.pathname);
      }
    }
  }, [isModalOpen]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const taskId = params.get('taskId');
    if (taskId && !loading) {
      const currentActiveId = activeItem?.item?.id;
      if (currentActiveId !== taskId) {
        handleTaskClick(taskId);
      }
    }
  }, [loading, calendarData]);

  const handleTaskClick = async (taskId: string) => {
    try {
      window.history.replaceState(null, '', `?taskId=${taskId}`);
      const res = await adminApi.getContentDetails(taskId);
      const item = res.data.item;

      // Find all tasks on the same day as the clicked item
      const day = getISTDate(item.scheduled_datetime);
      
      // Collect tasks from available sources
      const tasksOnDay = calendarData.filter(i => isSameDay(getISTDate(i.scheduled_datetime), day));
      
      // If the item itself isn't in the list (e.g. from emergency tasks and calendar not loaded), add it
      if (!tasksOnDay.some(t => t.id === item.id)) {
          tasksOnDay.push(item);
      }

      // Sort them by time
      tasksOnDay.sort((a, b) => new Date(a.scheduled_datetime).getTime() - new Date(b.scheduled_datetime).getTime());
      
      setDayTasks(tasksOnDay);
      setActiveItem(res.data);
      setIsModalOpen(true);
    } catch (err) {
      console.error('Error fetching details:', err);
    }
  };

  const handleItemClick = (task: ContentItem) => {
      handleTaskClick(task.id);
  }

  const navigateToTask = async (direction: 'next' | 'prev') => {
    if (!activeItem || dayTasks.length <= 1) return;
    
    const currentIndex = dayTasks.findIndex(t => t.id === activeItem.item.id);
    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    
    if (nextIndex < 0) nextIndex = dayTasks.length - 1;
    if (nextIndex >= dayTasks.length) nextIndex = 0;
    
    const nextTask = dayTasks[nextIndex];
    try {
        const res = await adminApi.getContentDetails(nextTask.id);
        setActiveItem(res.data);
        setStatusNote('');
    } catch (err) { console.error(err); }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!activeItem) return;
    const targetId = activeItem.item.id;
    setActionId(`status-${targetId}`);
    const currentNote = statusNote;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await performOptimisticAction({
        backup: () => ({
          calendar: [...calendarData],
          globalCalendar: [...globalCalendarData],
          active: { ...activeItem },
          emergency: [...emergencyTasks],
          pending: [...pendingTasks]
        }),
        update: () => {
          const updatedItem = { ...activeItem.item, status: newStatus };
          setCalendarData(prev => prev.map(item => item.id === targetId ? updatedItem : item));
          setGlobalCalendarData(prev => prev.map(item => item.id === targetId ? updatedItem : item));
          setEmergencyTasks(prev => prev.map(item => item.id === targetId ? updatedItem : item));
          setPendingTasks(prev => prev.map(item => item.id === targetId ? updatedItem : item));
          setActiveItem({
            ...activeItem,
            item: updatedItem
          });
          setStatusNote('');
        },
        action: () => gmApi.updateStatus(targetId, newStatus, currentNote.trim() || undefined, user?.id),
        rollback: (backup) => {
          setCalendarData(backup.calendar);
          setGlobalCalendarData(backup.globalCalendar);
          setActiveItem(backup.active);
          setEmergencyTasks(backup.emergency);
          setPendingTasks(backup.pending);
          setStatusNote(currentNote);
        },
        successMessage: `Advanced to ${newStatus}.`,
        errorMessage: 'Failed to update status.',
        refresh: () => {
          fetchDashboardData(true);
          adminApi.getContentDetails(targetId).then(res => setActiveItem(res.data)).catch(console.error);
        }
      });
    } catch (err) {
      console.error(err);
    } finally {
      setActionId(null);
    }
  };

  const handleUndoStatus = async () => {
    if (!activeItem) return;
    if (!window.confirm('Are you sure you want to undo the last status change?')) return;
    const targetId = activeItem.item.id;
    setActionId(`undo-${targetId}`);
    try {
      await performOptimisticAction({
        backup: () => ({
          calendar: [...calendarData],
          globalCalendar: [...globalCalendarData],
          active: { ...activeItem },
          emergency: [...emergencyTasks],
          pending: [...pendingTasks]
        }),
        update: () => {
          let revertedStatus = 'WAITING FOR APPROVAL';
          if (activeItem.history && activeItem.history.length > 1) {
            revertedStatus = activeItem.history[1].new_status || (activeItem.history[1].status as string) || 'WAITING FOR APPROVAL';
          }
          const updatedItem = { ...activeItem.item, status: revertedStatus };
          setCalendarData(prev => prev.map(item => item.id === targetId ? updatedItem : item));
          setGlobalCalendarData(prev => prev.map(item => item.id === targetId ? updatedItem : item));
          setEmergencyTasks(prev => prev.map(item => item.id === targetId ? updatedItem : item));
          setPendingTasks(prev => prev.map(item => item.id === targetId ? updatedItem : item));
          setActiveItem({
            ...activeItem,
            item: updatedItem
          });
        },
        action: () => adminApi.undoStatus(targetId),
        rollback: (backup) => {
          setCalendarData(backup.calendar);
          setGlobalCalendarData(backup.globalCalendar);
          setActiveItem(backup.active);
          setEmergencyTasks(backup.emergency);
          setPendingTasks(backup.pending);
        },
        successMessage: 'Status change undone.',
        errorMessage: 'Failed to undo status change.',
        refresh: () => {
          fetchDashboardData(true);
          adminApi.getContentDetails(targetId).then(res => setActiveItem(res.data)).catch(console.error);
        }
      });
    } catch (err) {
      console.error(err);
    } finally {
      setActionId(null);
    }
  };

  const handleToggleEmergency = async () => {
    if (!activeItem) return;
    const targetId = activeItem.item.id;
    setActionId(`emergency-${targetId}`);
    try {
      await performOptimisticAction({
        backup: () => ({
          calendar: [...calendarData],
          globalCalendar: [...globalCalendarData],
          active: { ...activeItem },
          emergency: [...emergencyTasks],
          pending: [...pendingTasks]
        }),
        update: () => {
          const updatedItem = { ...activeItem.item, is_emergency: !activeItem.item.is_emergency };
          setCalendarData(prev => prev.map(item => item.id === targetId ? updatedItem : item));
          setGlobalCalendarData(prev => prev.map(item => item.id === targetId ? updatedItem : item));
          setActiveItem({
            ...activeItem,
            item: updatedItem
          });
          if (updatedItem.is_emergency) {
            setEmergencyTasks(prev => {
              if (prev.some(x => x.id === targetId)) return prev;
              return [updatedItem, ...prev];
            });
          } else {
            setEmergencyTasks(prev => prev.filter(x => x.id !== targetId));
          }
        },
        action: () => emergencyApi.toggle(targetId),
        rollback: (backup) => {
          setCalendarData(backup.calendar);
          setGlobalCalendarData(backup.globalCalendar);
          setActiveItem(backup.active);
          setEmergencyTasks(backup.emergency);
          setPendingTasks(backup.pending);
        },
        successMessage: `Emergency status toggled.`,
        errorMessage: 'Failed to toggle emergency status.',
        refresh: () => {
          fetchDashboardData(true);
          adminApi.getContentDetails(targetId).then(res => setActiveItem(res.data)).catch(console.error);
        }
      });
    } catch (err) {
      console.error(err);
    } finally {
      setActionId(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!activeItem) return;
    const targetId = activeItem.item.id;
    setActionId(`edit-${targetId}`);
    const currentForm = { ...formData };
    try {
      const datePart = formatISTForm(activeItem.item.scheduled_datetime, 'yyyy-MM-dd');
      const scheduled_datetime = convertISTToUTC(datePart, formData.time);
      await performOptimisticAction({
        backup: () => ({
          calendar: [...calendarData],
          globalCalendar: [...globalCalendarData],
          active: { ...activeItem },
          emergency: [...emergencyTasks],
          pending: [...pendingTasks]
        }),
        update: () => {
          const updatedItem = {
            ...activeItem.item,
            title: formData.title,
            description: formData.description,
            content_type: formData.content_type,
            scheduled_datetime
          };
          setCalendarData(prev => prev.map(item => item.id === targetId ? updatedItem : item));
          setGlobalCalendarData(prev => prev.map(item => item.id === targetId ? updatedItem : item));
          setEmergencyTasks(prev => prev.map(item => item.id === targetId ? updatedItem : item));
          setPendingTasks(prev => prev.map(item => item.id === targetId ? updatedItem : item));
          setActiveItem({
            ...activeItem,
            item: updatedItem
          });
          setIsRescheduling(false);
        },
        action: () => adminApi.updateContent(targetId, {
          title: currentForm.title,
          description: currentForm.description,
          content_type: currentForm.content_type,
          scheduled_datetime
        }),
        rollback: (backup) => {
          setCalendarData(backup.calendar);
          setGlobalCalendarData(backup.globalCalendar);
          setActiveItem(backup.active);
          setEmergencyTasks(backup.emergency);
          setPendingTasks(backup.pending);
        },
        successMessage: 'Content updated successfully.',
        errorMessage: 'Failed to update content.',
        refresh: () => {
          fetchDashboardData(true);
          adminApi.getContentDetails(targetId).then(res => setActiveItem(res.data)).catch(console.error);
        }
      });
    } catch (err) {
      console.error(err);
    } finally {
      setActionId(null);
    }
  };

  const globalMonthCounts = globalCalendarData.filter(item => {
    const itemDate = parseISO(item.scheduled_datetime);
    return isSameMonth(itemDate, currentMonth) && !isCrossMonthRescheduled(item);
  }).reduce(
    (acc, item) => {
      const status = (item.status || '').toUpperCase();
      const type = (item.content_type || '').toUpperCase();
      const isShot = shootDoneStatuses.includes(status);
      const isDone = status === 'POSTED' || status === 'WAITING FOR POSTING' || status === 'COMPLETED' || status === 'SCHEDULED';

      acc.totalItems += 1;
      if (status === 'POSTED') acc.posted += 1;
      if (contentApprovedStatuses.includes(status)) acc.contentApproved += 1;
      if (status === 'DESIGNING IN PROGRESS') acc.designingInProgress += 1;

      if (type === 'REEL' || type === 'YOUTUBE') {
        acc.totalReels += 1;
        if (isShot) acc.shotReels += 1;
        if (isDone) acc.doneReels += 1;
      } else if (type === 'POST') {
        acc.totalPosts += 1;
        if (isShot) acc.shotPosts += 1;
        if (isDone) acc.donePosts += 1;
      }
      return acc;
    },
    {
      totalReels: 0, totalPosts: 0, shotReels: 0, shotPosts: 0, doneReels: 0, donePosts: 0,
      totalItems: 0, posted: 0, contentApproved: 0, designingInProgress: 0
    }
  );

  const activeStats = {
    totalItems: globalMonthCounts.totalItems,
    totalReels: globalMonthCounts.totalReels,
    totalPosts: globalMonthCounts.totalPosts,
    shotReels: globalMonthCounts.shotReels,
    shotPosts: globalMonthCounts.shotPosts,
    doneReels: globalMonthCounts.doneReels,
    donePosts: globalMonthCounts.donePosts,
    posted: globalMonthCounts.posted,
    contentApproved: globalMonthCounts.contentApproved,
    designingInProgress: globalMonthCounts.designingInProgress
  };

  const monthStatusCounts = calendarData.filter(item => isDayInPeriod(getCalendarItemDate(item)) && !isCrossMonthRescheduled(item)).reduce(
    (acc, item) => {
      const status = (item.status || '').toUpperCase();
      const type = (item.content_type || '').toUpperCase();
      const isShot = shootDoneStatuses.includes(status);
      const isDone = status === 'POSTED' || status === 'WAITING FOR POSTING' || status === 'COMPLETED' || status === 'SCHEDULED';

      acc.total += 1;
      if (isDone) acc.completed += 1;
      if (status === 'POSTED') acc.posted += 1;
      if (contentApprovedStatuses.includes(status)) acc.contentApproved += 1;
      if (status === 'DESIGNING IN PROGRESS') acc.designingInProgress += 1;

      if (type === 'REEL' || type === 'YOUTUBE') {
        acc.reels += 1;
        if (isDone) acc.completedReels += 1;
        if (isShot) acc.shootDone += 1;
      } else if (type === 'POST') {
        acc.posts += 1;
        if (isDone) acc.completedPosts += 1;
        if (isShot) acc.shotPosts += 1;
      }

      return acc;
    },
    {
      total: 0, completed: 0, reels: 0, posts: 0,
      completedReels: 0, completedPosts: 0,
      shootDone: 0, contentApproved: 0,
      posted: 0, designingInProgress: 0, shotPosts: 0,
    }
  );

  const activeClientPocNotes = pocNotes
    .sort((a, b) => new Date(b.note_date).getTime() - new Date(a.note_date).getTime())
    .slice(0, 5);

  const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 100) : 0);

  return (
    <div className="dashboard-view">
      <header className="page-header" style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Dashboard Overview</h1>
          <p className="page-subtitle">Monitor operational health and pipeline metrics</p>
        </div>
        <div className="month-nav" style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-surface)', padding: '8px 16px', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="month-btn" style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '4px' }}><ChevronLeft size={20} /></button>
            <span className="month-label" style={{ fontWeight: 700, fontSize: '14px', minWidth: '140px', textAlign: 'center' }}>{getPeriodLabel()}</span>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="month-btn" style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '4px' }}><ChevronRight size={20} /></button>
            {isRefreshing && (
              <div className="refreshing-banner" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
                <Loader2 size={12} className="spinner-btn-icon" />
                <span>Refreshing...</span>
              </div>
            )}
        </div>
      </header>

      {error && (
        <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '12px', marginBottom: '24px', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontWeight: 600, fontSize: '14px' }}>Error: {error}</p>
          <button onClick={() => setError(null)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
        </div>
      )}

      {loading && calendarData.length === 0 ? (
        <div className="premium-stats-grid" style={{ marginTop: '12px' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="premium-stat-card">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-12 w-24 mt-4" />
              <Skeleton className="h-2 w-full mt-4" />
            </div>
          ))}
        </div>
      ) : (
        <div className="premium-stats-grid" style={{ marginTop: '12px' }}>
          <div className="premium-stat-card pipeline">
            <div className="card-accent-line"></div>
            <div className="card-top">
              <div className="label-group"><span className="stat-label">MONTHLY PIPELINE</span></div>
              <Layers size={20} className="stat-icon" />
            </div>
            <div className="card-main">
              <div className="value-group">
                <span className="main-value">{activeStats.shotReels + activeStats.shotPosts}</span>
                <span className="separator">/</span>
                <span className="total-value">{activeStats.totalReels + activeStats.totalPosts}</span>
                <span className="unit">ITEMS</span>
              </div>
            </div>
            <div className="card-footer">
              <div className="percentage-info">
                <span className="pct-value">{pct(activeStats.shotReels + activeStats.shotPosts, activeStats.totalReels + activeStats.totalPosts)}%</span>
                <span className="pct-label">Shot</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${pct(activeStats.shotReels + activeStats.shotPosts, activeStats.totalReels + activeStats.totalPosts)}%` }}></div>
              </div>
            </div>
          </div>

          <div className="premium-stat-card reels">
            <div className="card-accent-line"></div>
            <div className="card-top">
              <div className="label-group"><span className="stat-label">REELS PROGRESS</span></div>
              <Video size={20} className="stat-icon" />
            </div>
            <div className="card-main">
              <div className="value-group">
                <span className="main-value">{activeStats.doneReels}</span>
                <span className="separator">/</span>
                <span className="total-value">{activeStats.totalReels}</span>
                <span className="unit">REELS</span>
              </div>
            </div>
            <div className="card-footer">
              <div className="percentage-info">
                <span className="pct-value">{pct(activeStats.doneReels, activeStats.totalReels)}%</span>
                <span className="pct-label">Done</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${pct(activeStats.doneReels, activeStats.totalReels)}%` }}></div>
              </div>
            </div>
          </div>

          <div className="premium-stat-card posts">
            <div className="card-accent-line"></div>
            <div className="card-top">
              <div className="label-group"><span className="stat-label">POSTS PROGRESS</span></div>
              <FileText size={20} className="stat-icon" />
            </div>
            <div className="card-main">
              <div className="value-group">
                <span className="main-value">{activeStats.donePosts}</span>
                <span className="separator">/</span>
                <span className="total-value">{activeStats.totalPosts}</span>
                <span className="unit">POSTS</span>
              </div>
            </div>
            <div className="card-footer">
              <div className="percentage-info">
                <span className="pct-value">{pct(activeStats.donePosts, activeStats.totalPosts)}%</span>
                <span className="pct-label">Done</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${pct(activeStats.donePosts, activeStats.totalPosts)}%` }}></div>
              </div>
            </div>
          </div>

          <div className="premium-stat-card shoots">
            <div className="card-accent-line"></div>
            <div className="card-top">
              <div className="label-group"><span className="stat-label">SHOOTS DONE</span></div>
              <Film size={20} className="stat-icon" />
            </div>
            <div className="card-main">
              <div className="value-group">
                <span className="main-value">{activeStats.shotReels}</span>
                <span className="separator">/</span>
                <span className="total-value">{activeStats.totalReels}</span>
                <span className="unit">SHOOTS</span>
              </div>
            </div>
            <div className="card-footer">
              <div className="percentage-info">
                <span className="pct-value">{pct(activeStats.shotReels, activeStats.totalReels)}%</span>
                <span className="pct-label">Shot</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${pct(activeStats.shotReels, activeStats.totalReels)}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="unified-dashboard">
        <div className="dashboard-card unified-main-card">
          <div className="unified-card-header">
            <div className="header-text">
              <h2 className="card-title">Operational Command Center</h2>
              <p className="card-subtitle">Real-time health and production flow monitoring</p>
            </div>
            <div className="header-actions">
              <div className="client-filter-box">
                <Filter size={16} className="filter-icon" />
                <select
                  className="client-select-dropdown"
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.company_name}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="select-chevron" />
              </div>
            </div>
          </div>

          <div className="unified-body-grid">
            <div className="unified-progress-panel">
              <div className="panel-section">
                <div className="section-header">
                  <div className="icon-badge"><MessageSquare size={12} /></div>
                  <h4 className="section-label">POC COMMUNICATION</h4>
                </div>
                <div className="poc-feed-compact">
                  {activeClientPocNotes.length > 0 ? (
                    activeClientPocNotes.map((note, idx) => (
                      <div key={note.id || idx} className="poc-feed-item">
                        <div className="note-meta">
                          <span className="note-author">{note.users?.name?.split(' ')[0] || 'TL'}</span>
                          <span className="note-date">{format(parseISO(note.note_date), 'MMM d')}</span>
                        </div>
                        <p className="note-text">{note.note_text}</p>
                      </div>
                    ))
                  ) : (
                    <div className="poc-empty-state"><p>No recent notes</p></div>
                  )}
                </div>
              </div>

              <div className="panel-divider"></div>

              <div className="panel-section">
                <div className="section-header">
                  <div className="icon-badge"><Activity size={12} /></div>
                  <h4 className="section-label">TASK LIFECYCLE</h4>
                </div>
                <div className="lifecycle-list">
                  {(() => {
                    const periodItems = calendarData.filter(item => isDayInPeriod(getCalendarItemDate(item)));
                    const flows: Record<string, string[]> = {
                      REEL: ['PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'SHOOT DONE', 'EDITING IN PROGRESS', 'EDITED', 'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'],
                      YOUTUBE: ['PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'SHOOT DONE', 'EDITING IN PROGRESS', 'EDITED', 'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'],
                      POST: ['PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'DESIGNING IN PROGRESS', 'DESIGNING COMPLETED', 'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'],
                    };
                    const milestones = ['CONTENT APPROVED', 'WAITING FOR FINAL APPROVAL', 'POSTED'];

                    return milestones.map(milestone => {
                      let numerator = 0;
                      let denominator = 0;
                      periodItems.forEach(item => {
                        const type = (item.content_type || '').toUpperCase();
                        const status = (item.status || '').toUpperCase();
                        const flow = flows[type] || flows.REEL;
                        const milestoneIdx = flow.indexOf(milestone);
                        if (milestoneIdx !== -1) {
                          denominator += 1;
                          const statusIdx = flow.indexOf(status);
                          if (statusIdx >= milestoneIdx) numerator += 1;
                        }
                      });
                      return (
                        <div key={milestone} className="lifecycle-item">
                          <div className="lifecycle-info">
                            <span className="lifecycle-name">{milestone}</span>
                            <span className="lifecycle-count">{numerator} / {denominator}</span>
                          </div>
                          <div className="lifecycle-bar-bg">
                            <div className="lifecycle-bar-fill" style={{ width: `${pct(numerator, denominator)}%` }}></div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              <div className="panel-actions-vertical">
                <Link href="/admin/team" className="action-btn-hub">
                  <Users size={14} />
                  <span>Manage Teams</span>
                </Link>
                <Link href="/admin/master-calendar" className="action-btn-hub">
                  <Globe size={14} />
                  <span>Master Calendar</span>
                </Link>
              </div>
            </div>

            <div className="unified-pipeline-panel">
              <div className="pipeline-header">
                <h4 className="panel-title">Production Progress</h4>
                <span className="live-tag">LIVE</span>
              </div>
              <div className="unified-status-list">
                <div className="unified-pipeline-item">
                  <div className="item-meta">
                    <span className="status-label">SHOOT DONE</span>
                    <span className="status-count">{monthStatusCounts.shootDone} / {monthStatusCounts.reels}</span>
                  </div>
                  <div className="status-bar-bg">
                    <div className="status-bar-fill" style={{ width: `${pct(monthStatusCounts.shootDone, monthStatusCounts.reels)}%`, background: '#06b6d4' }}></div>
                  </div>
                </div>
                <div className="unified-pipeline-item">
                  <div className="item-meta">
                    <span className="status-label">MONTHLY PIPELINE</span>
                    <span className="status-count">{monthStatusCounts.completedReels + monthStatusCounts.completedPosts} / {monthStatusCounts.reels + monthStatusCounts.posts}</span>
                  </div>
                  <div className="status-bar-bg">
                    <div className="status-bar-fill" style={{ width: `${pct(monthStatusCounts.completedReels + monthStatusCounts.completedPosts, monthStatusCounts.reels + monthStatusCounts.posts)}%` }}></div>
                  </div>
                </div>
                <div className="unified-pipeline-item">
                  <div className="item-meta">
                    <span className="status-label">TOTAL REELS</span>
                    <span className="status-count">{monthStatusCounts.completedReels} / {monthStatusCounts.reels}</span>
                  </div>
                  <div className="status-bar-bg">
                    <div className="status-bar-fill" style={{ width: `${pct(monthStatusCounts.completedReels, monthStatusCounts.reels)}%`, background: '#a855f7' }}></div>
                  </div>
                </div>
                <div className="unified-pipeline-item">
                  <div className="item-meta">
                    <span className="status-label">TOTAL POSTS</span>
                    <span className="status-count">{monthStatusCounts.completedPosts} / {monthStatusCounts.posts}</span>
                  </div>
                  <div className="status-bar-bg">
                    <div className="status-bar-fill" style={{ width: `${pct(monthStatusCounts.completedPosts, monthStatusCounts.posts)}%`, background: '#3b82f6' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="emergency-panel">
        <div className="emergency-panel-header">
          <ShieldAlert size={24} color="#ef4444" />
          <h2 className="emergency-panel-title">Emergency Tasks</h2>
        </div>
        <div className="emergency-list">
          {emergencyTasks.length > 0 ? (
            emergencyTasks.map(task => (
              <div 
                key={task.id} 
                className="emergency-card"
                onClick={() => handleItemClick(task)}
              >
                <div className="emergency-card-icon">
                  {task.content_type === 'Post' ? <FileText size={20} /> : <Video size={20} />}
                </div>
                <div className="emergency-card-info">
                  <p className="emergency-card-client">{task.clients?.company_name}</p>
                  <p className="emergency-card-type">{task.content_type} • {format(getISTDate(task.scheduled_datetime), 'h:mm a')}</p>
                </div>
                <div className="emergency-card-arrow">
                  <ArrowRight size={18} />
                </div>
              </div>
            ))
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic', padding: '10px' }}>No emergency tasks active.</p>
          )}
        </div>
      </div>

      <div className="emergency-panel" style={{ marginTop: '24px', borderColor: 'var(--accent)' }}>
        <div className="emergency-panel-header">
          <Clock size={24} color="var(--accent)" />
          <h2 className="emergency-panel-title">Pending Important Tasks</h2>
        </div>
        <div className="emergency-list">
          {pendingTasks.length > 0 ? (
            pendingTasks.map(task => (
              <div 
                key={task.id} 
                className="emergency-card"
                onClick={() => handleItemClick(task)}
                style={{ borderLeftColor: 'var(--accent)' }}
              >
                <div className="emergency-card-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent)' }}>
                  {task.content_type === 'Post' ? <FileText size={20} /> : <Video size={20} />}
                </div>
                <div className="emergency-card-info">
                  <p className="emergency-card-client">{task.clients?.company_name}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <p className="emergency-card-type">{task.content_type} • {format(getISTDate(task.scheduled_datetime), 'MMM d, h:mm a')}</p>
                    <span style={{ fontSize: '10px', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>{task.status}</span>
                  </div>
                </div>
                <div className="emergency-card-arrow">
                  <ArrowRight size={18} />
                </div>
              </div>
            ))
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic', padding: '10px' }}>No pending tasks for today.</p>
          )}
        </div>
      </div>

      {/* Task Details Modal */}
      {isModalOpen && activeItem && (
        <div className="modal-overlay" style={{ zIndex: 3000 }}>
          <div className="modal-content detail-modal" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <div className="detail-header-info">
                <span className={`type-badge ${activeItem.item.content_type.toLowerCase().replace(/\s+/g, '-')}`}>
                  {activeItem.item.content_type}
                </span>
                <span className="dot">•</span>
                <span className="client-name">
                  <Link href={`/admin/client-calendar/${activeItem.item.client_id}`} className="client-link-hover">
                    {activeItem.item.clients?.company_name}
                  </Link>
                </span>
                {dayTasks.length > 1 && (
                  <>
                    <span className="dot">•</span>
                    <span className="task-counter" style={{ color: 'var(--accent)', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase' }}>
                      Task {dayTasks.findIndex(t => t.id === activeItem.item.id) + 1} of {dayTasks.length}
                    </span>
                  </>
                )}
              </div>
              <div className="modal-actions">
                {dayTasks.length > 1 && (
                    <div className="task-nav-buttons" style={{ display: 'flex', gap: '4px', marginRight: '8px', paddingRight: '12px', borderRight: '1px solid var(--border)' }}>
                        <button 
                            onClick={() => navigateToTask('prev')}
                            className="nav-btn"
                            style={{ 
                                width: '32px', height: '32px', borderRadius: '8px', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                                color: 'var(--text-primary)', cursor: 'pointer'
                            }}
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button 
                            onClick={() => navigateToTask('next')}
                            className="nav-btn"
                            style={{ 
                                width: '32px', height: '32px', borderRadius: '8px', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                                color: 'var(--text-primary)', cursor: 'pointer'
                            }}
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                )}
                <button className="action-icon-btn edit" onClick={() => {
                  setFormData({
                    title: activeItem.item.title,
                    description: activeItem.item.description || '',
                    time: formatISTForm(activeItem.item.scheduled_datetime, 'HH:mm'),
                    content_type: activeItem.item.content_type
                  });
                  setIsRescheduling(true);
                }}>
                  <Edit2 size={18} />
                </button>
                <button className="action-icon-btn delete" onClick={() => {
                  if(confirm('Delete this task permanently?')) {
                    adminApi.deleteContent(activeItem.item.id).then(() => {
                      setIsModalOpen(false);
                      fetchDashboardData();
                    });
                  }
                }}>
                  <Trash2 size={18} />
                </button>
                <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="detail-body">
              <h2 className="detail-title">{activeItem.item.title}</h2>
              <p style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent)', marginTop: '-8px', marginBottom: '4px' }}>
                Team Lead: {activeItem.item.clients?.team_lead?.name || 'Not Assigned'}
              </p>
              <p style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent)', marginTop: '4px' }}>
                  Assigned To: {activeItem.item.assigned_employee ? `${activeItem.item.assigned_employee.name} ${activeItem.item.assigned_employee.role_identifier ? `(${activeItem.item.assigned_employee.role_identifier})` : ''}` : 'Not Assigned'}
              </p>
              {activeItem.item.description && (
                <p className="detail-description">{activeItem.item.description}</p>
              )}

              <div className="detail-grid">
                <div className="detail-section">
                  <label className="detail-label">Schedule Info</label>
                  <div className="info-card">
                    {activeItem.item.is_rescheduled && activeItem.item.original_scheduled_datetime ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                        <div className="info-item">
                          <Calendar size={16} />
                          <span>
                            Actual Date: {formatIST(activeItem.item.original_scheduled_datetime, 'dd/MM/yyyy')} rescheduled to {formatIST(activeItem.item.scheduled_datetime, 'dd/MM/yy')}
                          </span>
                        </div>
                        {activeItem.item.reschedule_history && activeItem.item.reschedule_history.length > 0 && (
                          <div style={{ padding: '8px 12px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border)', width: '100%', marginBottom: '8px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Reschedule History</span>
                            {activeItem.item.reschedule_history.map((h: any, idx: number) => (
                              <div key={idx} style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '6px' }}>
                                <span>{idx + 1}.</span>
                                <span>{formatIST(h.from, 'dd/MM/yyyy')}</span>
                                <span>➔</span>
                                <span>{formatIST(h.to, 'dd/MM/yy')}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="info-item">
                        <Calendar size={16} />
                        <span>{format(parseISO(activeItem.item.scheduled_datetime), 'MMMM do, yyyy')}</span>
                      </div>
                    )}
                    <div className="info-item">
                      <Clock size={16} />
                      <span>{formatIST(activeItem.item.scheduled_datetime, 'h:mm a')}</span>
                    </div>
                    <div className="emergency-toggle-row" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ShieldAlert size={16} color={activeItem.item.is_emergency ? '#ef4444' : 'var(--text-muted)'} />
                            <span style={{ fontSize: '13px', fontWeight: 600, color: activeItem.item.is_emergency ? '#ef4444' : 'var(--text-muted)' }}>Emergency Priority</span>
                        </div>
                        <button 
                            onClick={handleToggleEmergency}
                            disabled={actionId !== null}
                            style={{
                                width: '42px',
                                height: '22px',
                                borderRadius: '11px',
                                background: activeItem.item.is_emergency ? '#ef4444' : 'rgba(255,255,255,0.05)',
                                border: `1px solid ${activeItem.item.is_emergency ? '#ef4444' : 'var(--border)'}`,
                                position: 'relative',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                opacity: actionId === `emergency-${activeItem.item.id}` ? 0.5 : 1
                            }}
                        >
                            <div style={{
                                width: '18px',
                                height: '18px',
                                borderRadius: '50%',
                                background: activeItem.item.is_emergency ? 'white' : 'var(--text-muted)',
                                position: 'absolute',
                                top: '1px',
                                left: activeItem.item.is_emergency ? '21px' : '1px',
                                transition: 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
                            }}></div>
                        </button>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <label className="detail-label">Workflow Status</label>
                  <div className="info-card" style={{ background: 'var(--bg-elevated)' }}>
                    <div className="status-current">
                      <p className="status-label">CURRENT</p>
                      <p className="status-value" style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>{activeItem.item.status}</p>
                    </div>

                    {(() => {
                      const flows: Record<string, string[]> = {
                        'Reel': ['PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'SHOOT DONE', 'EDITING IN PROGRESS', 'EDITED', 'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'],
                        'YouTube': ['PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'SHOOT DONE', 'EDITING IN PROGRESS', 'EDITED', 'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'],
                        'Post': ['PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'DESIGNING IN PROGRESS', 'DESIGNING COMPLETED', 'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'],
                        'Special Poster': ['PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'DESIGNING IN PROGRESS', 'DESIGNING COMPLETED', 'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'],
                        'Special Day Poster': ['PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'DESIGNING IN PROGRESS', 'DESIGNING COMPLETED', 'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED']
                      };
                      const flow = flows[activeItem.item.content_type] || [];
                      const currentIndex = flow.indexOf(activeItem.item.status);
                      const nextStatus = flow[currentIndex + 1];

                      if (nextStatus) {
                        return (
                          <div className="advance-section" style={{ marginTop: '16px' }}>
                            <textarea
                              placeholder="Add a note..."
                              value={statusNote}
                              onChange={(e) => setStatusNote(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '10px',
                                background: 'var(--bg-elevated)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                color: 'var(--text-primary)',
                                fontSize: '13px',
                                marginBottom: '10px',
                                resize: 'none'
                              }}
                              rows={2}
                            />
                             <button
                              onClick={() => handleStatusUpdate(nextStatus)}
                              disabled={actionId !== null}
                              className="btn-primary"
                              style={{ padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                              {actionId === `status-${activeItem.item.id}` ? (
                                <>
                                  Advancing...
                                  <Loader2 size={16} className="spinner-btn-icon" />
                                </>
                              ) : (
                                <>
                                  Advance to {nextStatus}
                                  <ArrowRight size={16} />
                                </>
                              )}
                            </button>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    
                    {activeItem.item.status === 'WAITING FOR POSTING' && (
                        <div className="workflow-waiting-posting" style={{ 
                            marginTop: '16px', 
                            padding: '16px', 
                            background: 'rgba(59, 130, 246, 0.05)', 
                            border: '1px solid rgba(59, 130, 246, 0.2)',
                            color: '#3b82f6', 
                            borderRadius: '12px', 
                            fontSize: '13px', 
                            display: 'flex', 
                            flexDirection: 'column',
                            alignItems: 'center', 
                            textAlign: 'center',
                            gap: '8px' 
                        }}>
                            <Clock size={20} />
                            <div style={{ fontWeight: 700 }}>Waiting for Posting Team</div>
                            <div style={{ opacity: 0.8, fontSize: '12px' }}>This item has been sent to the posting team queue. They will mark it as posted once published.</div>
                        </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="activity-log" style={{ marginTop: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label className="detail-label" style={{ marginBottom: 0 }}>Activity Log</label>
                  {activeItem.history.length > 0 && (
                    <button 
                      onClick={handleUndoStatus}
                      disabled={actionId !== null}
                      className="undo-btn"
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', 
                        background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', 
                        border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', 
                        fontSize: '11px', fontWeight: 700, cursor: 'pointer' 
                      }}
                    >
                      {actionId === `undo-${activeItem.item.id}` ? (
                        <Loader2 size={14} className="spinner-btn-icon" />
                      ) : (
                        <Undo2 size={14} />
                      )}
                      Undo Last Step
                    </button>
                  )}
                </div>
                <div className="timeline-container">
                  <div className="timeline-line"></div>
                  {(() => {
                    const flows: Record<string, string[]> = {
                      'Reel': [
                        'PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'SHOOT DONE', 'EDITING IN PROGRESS', 'EDITED',
                        'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'
                      ],
                      'YouTube': [
                        'PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'SHOOT DONE', 'EDITING IN PROGRESS', 'EDITED',
                        'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'
                      ],
                      'Post': [
                        'PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'DESIGNING IN PROGRESS', 'DESIGNING COMPLETED',
                        'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'
                      ],
                      'Special Poster': [
                        'PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'DESIGNING IN PROGRESS', 'DESIGNING COMPLETED',
                        'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'
                      ],
                      'Special Day Poster': [
                        'PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'DESIGNING IN PROGRESS', 'DESIGNING COMPLETED',
                        'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'
                      ]
                    };
                    const flow = flows[activeItem.item.content_type] || [];
                    const currentIdx = flow.indexOf(activeItem.item.status);

                    return flow.map((status: string, idx: number) => {
                      const isCompleted = idx < currentIdx || activeItem.item.status === 'POSTED';
                      const isCurrent = idx === currentIdx && activeItem.item.status !== 'POSTED';
                      const historyEntry = activeItem.history.find((h: StatusHistoryItem) => h.new_status === status);

                      return (
                        <div key={status} className={`timeline-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}>
                          <div className="step-indicator">
                            {isCompleted ? <Check size={14} /> : isCurrent ? <div className="current-dot" /> : null}
                          </div>
                          <div className="step-content">
                            <span className="step-title">{status}</span>
                            {historyEntry && (
                              <div className="step-meta">
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span className="step-user">{historyEntry.users?.role_identifier || historyEntry.users?.name || 'System'}</span>
                                  <span className="step-time">{format(parseISO(historyEntry.changed_at), 'MMM d, HH:mm')}</span>
                                </div>
                                {historyEntry.note && <p className="step-note">&quot;{historyEntry.note}&quot;</p>}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isRescheduling && (
        <div className="modal-overlay" style={{ zIndex: 4000 }}>
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Edit Content</h3>
              <button onClick={() => setIsRescheduling(false)} className="modal-close"><X size={20} /></button>
            </div>
            <div className="modal-form">
              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  className="form-input"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select
                    className="form-input"
                    value={formData.content_type}
                    onChange={(e) => setFormData({ ...formData, content_type: e.target.value as any })}
                  >
                    <option value="Post">Post</option>
                    <option value="Reel">Reel</option>
                    <option value="YouTube">YouTube</option>
                    <option value="Special Poster">Special Poster</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Time</label>
                  <input
                    type="time"
                    className="form-input"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setIsRescheduling(false)}>Cancel</button>
                 <button 
                  className="btn-primary" 
                  onClick={handleSaveEdit}
                  disabled={actionId !== null}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  {actionId === `edit-${activeItem?.item?.id}` ? (
                    <>
                      Saving...
                      <Loader2 size={16} className="spinner-btn-icon" />
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
