-- Performance Optimization Indexes
-- Resolves slow database queries, full table scans, and N+1 search slowdowns

-- 1. Content Items Indexes for Calendar & Limit Check queries
CREATE INDEX IF NOT EXISTS idx_content_items_client_sched 
  ON public.content_items (client_id, scheduled_datetime);

CREATE INDEX IF NOT EXISTS idx_content_items_assigned_status 
  ON public.content_items (assigned_to, employee_task_status);

CREATE INDEX IF NOT EXISTS idx_content_items_sched_status 
  ON public.content_items (scheduled_datetime, status);

-- 2. Status Logs Index for Historical Status calculations
CREATE INDEX IF NOT EXISTS idx_status_logs_item_changed 
  ON public.status_logs (item_id, changed_at DESC);

-- 3. Clients Indexes for Role and Team Lead lookups
CREATE INDEX IF NOT EXISTS idx_clients_lead_active 
  ON public.clients (team_lead_id, is_active, is_deleted);

CREATE INDEX IF NOT EXISTS idx_clients_employee 
  ON public.clients (employee_id, is_active, is_deleted);

CREATE INDEX IF NOT EXISTS idx_clients_post_employee 
  ON public.clients (post_employee_id, is_active, is_deleted);

CREATE INDEX IF NOT EXISTS idx_clients_reel_employee 
  ON public.clients (reel_employee_id, is_active, is_deleted);

-- 4. Notification Recipients Index for unread bell counts
CREATE INDEX IF NOT EXISTS idx_notification_recipients_user_read 
  ON public.notification_recipients (user_id, is_read);

-- 5. POC Communications Index
CREATE INDEX IF NOT EXISTS idx_poc_comms_client_date 
  ON public.poc_communications (client_id, note_date DESC);

-- 6. Users Role Identifier Index
CREATE INDEX IF NOT EXISTS idx_users_role_identifier 
  ON public.users (role_identifier);
