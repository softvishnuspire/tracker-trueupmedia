const express = require('express');
const cors = require('cors');
const compression = require('compression');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();

app.use(compression());

app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Public health check
app.get('/api/ping', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Global error handler is at the end of the file (after all routes)

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ CRITICAL ERROR: Missing Supabase Environment Variables!');
    console.error('Please ensure SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY are set.');
    console.error('Current URL:', supabaseUrl ? 'Set' : 'MISSING');
    console.error('Current Key:', supabaseKey ? 'Set' : 'MISSING');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// One-time migration: Rename CONTENT READY to CONTENT APPROVED
(async () => {
    try {
        const { data, error, count } = await supabase
            .from('content_items')
            .update({ status: 'CONTENT APPROVED' })
            .eq('status', 'CONTENT READY')
            .select('*', { count: 'exact' });

        if (error) {
            console.error('❌ Migration Error (CONTENT READY -> CONTENT APPROVED):', error.message);
        } else if (count > 0) {
            console.log(`✅ Migration Success: Renamed ${count} items from "CONTENT READY" to "CONTENT APPROVED"`);
        }
    } catch (err) {
        console.error('❌ Migration Exception:', err);
    }
})();


const NodeCache = require("node-cache");
const myCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// System Settings Helper
async function getSystemSetting(key, defaultValue = null) {
    try {
        const { data, error } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', key)
            .single();

        if (error) {
            if (error.code === '42P01') {
                console.warn(`⚠️ Table system_settings does not exist. Using default for ${key}.`);
                return defaultValue;
            }
            console.error(`Error fetching setting ${key}:`, error.message);
            return defaultValue;
        }
        return data.value;
    } catch (err) {
        console.error(`Exception fetching setting ${key}:`, err);
        return defaultValue;
    }
}

const authenticateUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.warn(`⚠️  No token provided for ${req.method} ${req.url}`);
            return res.status(401).json({ error: 'Unauthorized: No token provided' });
        }

        const token = authHeader.split(' ')[1];

        // Fast path: Check cache first
        const cachedUser = myCache.get(`auth_${token}`);
        if (cachedUser) {
            req.user = cachedUser;
            return next();
        }

        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            console.error('❌ Auth Error:', error?.message || 'User not found');
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }

        // Cache the user object for 60 seconds to avoid repeating network calls on subsequent requests
        myCache.set(`auth_${token}`, user, 60);

        console.log(`✅ Auth Success: ${user.email} (${req.method} ${req.url})`);
        req.user = user;
        next();
    } catch (err) {
        console.error('❌ Authentication Crash:', err.message);
        res.status(500).json({ error: 'Internal Authentication Error' });
    }
};

/**
 * Transformation layer for historical status
 * @param {Array} items - List of content items
 * @param {String} asOfDate - ISO date string
 */
async function applyHistoricalStatus(items, asOfDate) {
    if (!items || !items.length || !asOfDate) return items;
    try {
        const itemIds = Array.isArray(items) ? items.map(item => item.id) : [items.id];
        const { data: logs, error } = await supabase
            .from('status_logs')
            .select('item_id, new_status, changed_at')
            .in('item_id', itemIds)
            .lte('changed_at', asOfDate)
            .order('changed_at', { ascending: false });

        if (error) {
            console.error('[History] Error:', error.message);
            return items;
        }

        const statusMap = {};
        if (logs) {
            logs.forEach(log => {
                if (!statusMap[log.item_id]) statusMap[log.item_id] = log.new_status;
            });
        }

        if (Array.isArray(items)) {
            return items.map(item => {
                if (statusMap[item.id]) return { ...item, status: statusMap[item.id] };
                return item;
            });
        } else {
            if (statusMap[items.id]) return { ...items, status: statusMap[items.id] };
            return items;
        }
    } catch (err) {
        console.error('[History] Exception:', err);
        return items;
    }
}

app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api', authenticateUser);

const normalizeRole = (role) => (role || '').toString().trim().toUpperCase().replace(/[_\s]+/g, ' ');

const getRequesterRole = async (user) => {
    const userId = user?.id;
    if (!userId) return null;

    // Fast path: Check cache
    const cachedRole = myCache.get(`role_${userId}`);
    if (cachedRole) return cachedRole;

    let profile = null;
    let profileErr = null;

    const byUserId = await supabase
        .from('users')
        .select('role, role_identifier')
        .eq('user_id', userId)
        .single();
    profile = byUserId.data;
    profileErr = byUserId.error;

    if ((!profile || profileErr) && user?.email) {
        const byEmail = await supabase
            .from('users')
            .select('role, role_identifier')
            .eq('email', user.email)
            .single();
        profile = byEmail.data;
        profileErr = byEmail.error;
    }

    const metadataRole = user?.user_metadata?.role || user?.app_metadata?.role;
    let resolvedRole = normalizeRole(profile?.role || metadataRole);
    const resolvedIdentifier = normalizeRole(profile?.role_identifier);

    console.log(`[RoleResolver] User: ${userId}, RawRole: ${profile?.role}, RawID: ${profile?.role_identifier}, MetaRole: ${metadataRole}`);

    // If role is generic but identifier is specific, use identifier
    const upperId = resolvedIdentifier.toUpperCase();
    if (upperId === 'ADMIN') resolvedRole = 'ADMIN';
    else if (upperId === 'GM' || upperId === 'GENERAL MANAGER') resolvedRole = 'GM';
    else if (upperId === 'PRODUCTION HEAD' || upperId === 'PH' || resolvedRole === 'PH') resolvedRole = 'PRODUCTION HEAD';
    else if (upperId === 'POSTING TEAM' || upperId === 'POSTING') resolvedRole = 'POSTING TEAM';
    else if (upperId === 'CLIENT') resolvedRole = 'CLIENT';
    else if (upperId === 'EMPLOYEE') resolvedRole = 'EMPLOYEE';

    console.log(`[RoleResolver] Final resolved role for ${userId}: "${resolvedRole}"`);

    // Cache the resolved role for 60 seconds
    if (resolvedRole) {
        myCache.set(`role_${userId}`, resolvedRole, 60);
    }

    return resolvedRole;
};

const ADMIN_ROLES = ['ADMIN'];
const GM_ROLES = ['GM', 'GENERAL MANAGER', 'ADMIN'];
const COO_ROLES = ['COO', 'ADMIN'];
const PH_ROLES = ['PRODUCTION HEAD', 'PH', 'ADMIN', 'GM', 'GENERAL MANAGER'];
const TL_ROLES = ['TEAM LEAD', 'ADMIN', 'GM', 'GENERAL MANAGER'];
const POSTING_ROLES = ['POSTING TEAM', 'ADMIN', 'GM', 'GENERAL MANAGER'];
const CLIENT_ROLES = ['CLIENT', 'ADMIN'];
const EMPLOYEE_ROLES = ['EMPLOYEE', 'ADMIN'];

const requireRoles = (allowedRoles) => {
    const normalizedAllowed = allowedRoles.map((role) => normalizeRole(role));

    return async (req, res, next) => {
        try {
            const resolvedRole = await getRequesterRole(req.user);
            console.log(`[Auth] User: ${req.user?.id}, Resolved Role: ${resolvedRole}, Allowed: ${normalizedAllowed.join(', ')}`);

            if (!resolvedRole) {
                console.warn(`[Auth] No profile/role found for user ${req.user?.id}`);
                return res.status(403).json({ error: 'User profile not found' });
            }
            if (!normalizedAllowed.includes(resolvedRole)) {
                console.warn(`[Auth] Forbidden: User ${req.user?.id} with role ${resolvedRole} tried to access restricted route. Allowed: ${normalizedAllowed.join(', ')}`);
                return res.status(403).json({ error: 'Forbidden' });
            }
            req.resolvedRole = resolvedRole;
            next();
        } catch (error) {
            console.error(`[Auth] Middleware Error: ${error.message}`);
            return res.status(500).json({ error: error.message });
        }
    };
};

const STATUS_FLOWS = {
    'Reel': [
        'PENDING',
        'CONTENT NOT STARTED',
        'CONTENT APPROVED',
        'SHOOT DONE',
        'EDITING IN PROGRESS',
        'EDITED',
        'WAITING FOR APPROVAL',
        'APPROVED',
        'WAITING FOR POSTING',
        'POSTED'
    ],
    'YouTube': [
        'PENDING',
        'CONTENT NOT STARTED',
        'CONTENT APPROVED',
        'SHOOT DONE',
        'EDITING IN PROGRESS',
        'EDITED',
        'WAITING FOR APPROVAL',
        'APPROVED',
        'WAITING FOR POSTING',
        'POSTED'
    ],
    'Post': [
        'PENDING',
        'CONTENT NOT STARTED',
        'CONTENT APPROVED',
        'DESIGNING IN PROGRESS',
        'DESIGNING COMPLETED',
        'WAITING FOR APPROVAL',
        'APPROVED',
        'WAITING FOR POSTING',
        'POSTED'
    ]
};

/**
 * Utility to check if a client has reached their monthly content limit
 * for a specific content type (Post, Reel, YouTube) within their batch period.
 */
async function checkContentLimit(client_id, content_type, scheduled_datetime) {
    // 1. Fetch client's limits and batch type
    const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('batch_type, posts_per_month, reels_per_month, youtube_per_month')
        .eq('id', client_id)
        .single();

    if (clientError || !client) {
        console.error('Error fetching client limits:', clientError);
        throw new Error('Could not verify client limits');
    }

    // 2. Determine the limit for the given content type
    let limit = 0;
    if (content_type === 'Post') limit = client.posts_per_month || 0;
    else if (content_type === 'Reel') limit = client.reels_per_month || 0;
    else if (content_type === 'YouTube') limit = client.youtube_per_month || 0;

    // 3. Calculate period boundaries based on batch_type
    const date = new Date(scheduled_datetime);
    let startDate, endDate;

    if (client.batch_type === '15-15') {
        const day = date.getUTCDate();
        const month = date.getUTCMonth();
        const year = date.getUTCFullYear();

        if (day >= 15) {
            // Current cycle: 15th of this month to 14th of next month
            startDate = new Date(Date.UTC(year, month, 15, 0, 0, 0));
            endDate = new Date(Date.UTC(year, month + 1, 14, 23, 59, 59));
        } else {
            // Current cycle: 15th of last month to 14th of this month
            startDate = new Date(Date.UTC(year, month - 1, 15, 0, 0, 0));
            endDate = new Date(Date.UTC(year, month, 14, 23, 59, 59));
        }
    } else {
        // Standard 1-1 cycle: 1st of the month to last day of the month
        const month = date.getUTCMonth();
        const year = date.getUTCFullYear();
        startDate = new Date(Date.UTC(year, month, 1, 0, 0, 0));
        endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));
    }

    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();

    // 4. Count existing items in this period
    const { count, error: countError } = await supabase
        .from('content_items')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', client_id)
        .eq('content_type', content_type)
        .gte('scheduled_datetime', startISO)
        .lte('scheduled_datetime', endISO);

    if (countError) {
        console.error('Error counting items for limit check:', countError);
        throw new Error('Failed to validate content limit');
    }

    const periodStr = `${startDate.getUTCDate()}/${startDate.getUTCMonth() + 1} to ${endDate.getUTCDate()}/${endDate.getUTCMonth() + 1}`;

    return {
        allowed: count < limit,
        limit,
        count,
        period: periodStr
    };
}


// ─── GM: Clients ───
app.get('/api/gm/clients', requireRoles(GM_ROLES), async (req, res) => {
    const cached = myCache.get("gm_clients");
    if (cached) return res.json(cached);

    const { data, error } = await supabase
        .from('clients')
        .select('id, company_name, batch_type, posts_per_month, reels_per_month')
        .eq('is_active', true)
        .eq('is_deleted', false);

    if (error) return res.status(500).json({ error: error.message });
    myCache.set("gm_clients", data);
    res.json(data);
});

// ─── GM: Calendar ───
app.get('/api/gm/calendar', requireRoles(GM_ROLES), async (req, res) => {
    const { client_id, month } = req.query;
    if (!client_id || !month) return res.status(400).json({ error: 'Missing client_id or month' });

    const [year, mon] = String(month).split('-');
    const startDate = `${year}-${mon}-01T00:00:00`;
    const lastDay = new Date(parseInt(year), parseInt(mon), 0).getDate();
    const endDate = `${year}-${mon}-${String(lastDay).padStart(2, '0')}T23:59:59`;

    const { data, error } = await supabase
        .from('content_items')
        .select('*')
        .eq('client_id', client_id)
        .gte('scheduled_datetime', startDate)
        .lte('scheduled_datetime', endDate)
        .order('scheduled_datetime');

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// ─── GM: Master Calendar ───
app.get('/api/gm/master-calendar', requireRoles(GM_ROLES), async (req, res) => {
    const { month, client_id, content_type, asOfDate } = req.query;
    if (!month) return res.status(400).json({ error: 'Missing month' });

    const [year, mon] = String(month).split('-');
    const startDate = `${year}-${mon}-01T00:00:00`;
    const lastDay = new Date(parseInt(year), parseInt(mon), 0).getDate();
    const endDate = `${year}-${mon}-${String(lastDay).padStart(2, '0')}T23:59:59`;

    let query = supabase
        .from('content_items')
        .select(`*, clients (company_name)`)
        .gte('scheduled_datetime', startDate)
        .lte('scheduled_datetime', endDate);

    if (client_id) query = query.eq('client_id', client_id);
    if (content_type) query = query.eq('content_type', content_type);

    const { data, error } = await query.order('scheduled_datetime');

    if (error) return res.status(500).json({ error: error.message });

    const transformedData = await applyHistoricalStatus(data, asOfDate);
    res.json(transformedData);
});

// ─── GM: Content CRUD ───
app.post('/api/gm/content', requireRoles(GM_ROLES), async (req, res) => {
    const { client_id, title, description, content_type, scheduled_datetime } = req.body;
    const initial_status = 'PENDING';

    try {
        // Check monthly limit
        const limitCheck = await checkContentLimit(client_id, content_type, scheduled_datetime);
        if (!limitCheck.allowed) {
            return res.status(400).json({
                error: `Monthly ${content_type} limit reached (${limitCheck.limit}). Already have ${limitCheck.count} items for the period ${limitCheck.period}.`
            });
        }

        const { data, error } = await supabase
            .from('content_items')
            .insert([{ client_id, title, description, content_type, scheduled_datetime, status: initial_status }])
            .select();

        if (error) return res.status(500).json({ error: error.message });
        res.json(data[0]);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

app.put('/api/gm/content/:id', requireRoles(GM_ROLES), async (req, res) => {
    const { id } = req.params;
    const { title, description, scheduled_datetime, is_rescheduled } = req.body;
    const { data, error } = await supabase
        .from('content_items')
        .update({ title, description, scheduled_datetime, is_rescheduled })
        .eq('id', id)
        .select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

app.delete('/api/gm/content/:id', requireRoles(GM_ROLES), async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('content_items').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Deleted successfully' });
});

app.get('/api/gm/content/:id', async (req, res) => {
    const { id } = req.params;
    const { asOfDate } = req.query;
    try {
        const [itemRes, logsRes] = await Promise.all([
            supabase.from('content_items').select(`*, clients (company_name)`).eq('id', id).single(),
            supabase.from('status_logs').select(`*, users:changed_by (name, role_identifier)`).eq('item_id', id).order('changed_at', { ascending: false })
        ]);

        if (itemRes.error) return res.status(500).json({ error: itemRes.error.message });

        const transformedItem = await applyHistoricalStatus(itemRes.data, asOfDate);
        res.json({ item: transformedItem, history: logsRes.data || [] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/gm/content/:id/status', requireRoles(TL_ROLES), async (req, res) => {
    const { id } = req.params;
    const { new_status, note, changed_by } = req.body;

    console.log(`[StatusUpdate] ID: ${id}, New: ${new_status}, Note: ${note}, User: ${changed_by}`);

    const { data: item, error: fetchError } = await supabase
        .from('content_items')
        .select('status, content_type')
        .eq('id', id)
        .single();

    if (fetchError || !item) {
        console.error('[StatusUpdate] Fetch error:', fetchError);
        return res.status(404).json({ error: 'Item not found' });
    }

    const flow = STATUS_FLOWS[item.content_type];
    const currentIndex = flow.indexOf(item.status);
    const newIndex = flow.indexOf(new_status);

    if (newIndex !== currentIndex + 1) {
        return res.status(400).json({
            error: `Invalid status transition. Next status should be: ${flow[currentIndex + 1] || 'None'}`
        });
    }

    // Update status
    const { error: updateError } = await supabase
        .from('content_items')
        .update({ status: new_status, updated_at: new Date().toISOString() })
        .eq('id', id);

    if (updateError) {
        console.error('[StatusUpdate] Update error:', updateError);
        return res.status(500).json({ error: 'Failed to update status' });
    }

    // Log the change
    const logData = {
        item_id: id,
        old_status: item.status,
        new_status: new_status,
        note: note || null,
        changed_by: changed_by || null
    };

    const { error: logError } = await supabase.from('status_logs').insert([logData]);

    if (logError) {
        console.error('[StatusUpdate] Log error:', logError);
    } else {
        console.log('[StatusUpdate] Success logging change');
    }

    res.json({ message: 'Status updated successfully' });
});

app.post('/api/gm/content/:id/undo-status', requireRoles(TL_ROLES), async (req, res) => {
    const { id } = req.params;
    try {
        // Fetch the latest log
        const { data: latestLog, error: logFetchError } = await supabase
            .from('status_logs')
            .select('*')
            .eq('item_id', id)
            .order('changed_at', { ascending: false })
            .limit(1)
            .single();

        if (logFetchError || !latestLog) {
            return res.status(404).json({ error: 'No status history found to undo' });
        }

        // Revert status in content_items
        const { error: revertError } = await supabase
            .from('content_items')
            .update({ status: latestLog.old_status, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (revertError) {
            return res.status(500).json({ error: 'Failed to revert status' });
        }

        // Delete the log entry
        await supabase.from('status_logs').delete().eq('log_id', latestLog.log_id);

        res.json({ message: 'Status reverted successfully', previous_status: latestLog.old_status });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── Admin: Client Management ───
app.get('/api/admin/clients', async (req, res) => {
    const cached = myCache.get("admin_clients");
    if (cached) return res.json(cached);

    const { data, error } = await supabase.from('clients').select('*').eq('is_deleted', false).order('company_name');
    if (error) return res.status(500).json({ error: error.message });
    myCache.set("admin_clients", data);
    res.json(data);
});

app.post('/api/admin/clients', requireRoles(ADMIN_ROLES), async (req, res) => {
    console.log('POST /api/admin/clients - Body:', req.body);
    const { company_name, phone, email, address, posts_per_month, reels_per_month, youtube_per_month, batch_type, password } = req.body;

    if (!company_name) return res.status(400).json({ error: 'Company Name is mandatory' });
    if (!email) return res.status(400).json({ error: 'Email is mandatory' });
    if (!password) return res.status(400).json({ error: 'Password is mandatory' });

    const validBatchTypes = ['1-1', '15-15'];
    const resolvedBatch = validBatchTypes.includes(batch_type) ? batch_type : '1-1';

    try {
        // 1. Create Auth User
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { role: 'CLIENT', name: company_name }
        });

        if (authError) {
            console.error(`[Admin] Auth creation error for client ${email}:`, authError.message);
            return res.status(500).json({ error: authError.message });
        }

        // 2. Insert into users table
        const { error: userError } = await supabase.from('users').insert([{
            user_id: authUser.user.id,
            name: company_name,
            email,
            password_hash: password,
            role: 'CLIENT',
            role_identifier: 'CLIENT'
        }]);

        if (userError) {
            console.error(`[Admin] DB insertion error for user ${email}:`, userError.message);
            await supabase.auth.admin.deleteUser(authUser.user.id);
            return res.status(500).json({ error: userError.message });
        }

        // 3. Insert into clients table
        const { data, error: clientError } = await supabase.from('clients').insert([{
            company_name,
            phone,
            email,
            address,
            posts_per_month: parseInt(posts_per_month) || 0,
            reels_per_month: parseInt(reels_per_month) || 0,
            youtube_per_month: parseInt(youtube_per_month) || 0,
            batch_type: resolvedBatch,
            is_active: true,
            is_deleted: false,
            password_hash: password
        }]).select();

        if (clientError) {
            console.error(`[Admin] DB insertion error for client ${email}:`, clientError.message);
            return res.status(500).json({ error: clientError.message });
        }

        myCache.del(["gm_clients", "admin_clients"]);
        res.json(data[0]);
    } catch (error) {
        console.error(`[Admin] Crash during client creation of ${email}:`, error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/admin/clients/:id', requireRoles(ADMIN_ROLES), async (req, res) => {
    const { id } = req.params;
    console.log(`PUT /api/admin/clients/${id} - Body:`, req.body);
    const { company_name, phone, email, address, is_active, posts_per_month, reels_per_month, youtube_per_month, batch_type, password } = req.body;

    const updateObj = {
        company_name,
        phone,
        email,
        address,
        posts_per_month: parseInt(posts_per_month),
        reels_per_month: parseInt(reels_per_month),
        youtube_per_month: parseInt(youtube_per_month),
        batch_type,
        is_active,
        updated_at: new Date().toISOString()
    };

    if (password) {
        updateObj.password_hash = password;

        try {
            const { data: dbUser } = await supabase.from('users').select('user_id').eq('email', email).single();
            if (dbUser) {
                await supabase.auth.admin.updateUserById(dbUser.user_id, { password });
                await supabase.from('users').update({ password_hash: password }).eq('user_id', dbUser.user_id);
            }
        } catch (err) {
            console.error('[Admin] Error updating client password in auth/users:', err);
        }
    }

    const { data, error } = await supabase.from('clients').update(updateObj).eq('id', id).select();

    if (error) {
        console.error(`[Admin] Error updating client ${id}:`, error.message);
        return res.status(500).json({ error: error.message });
    }

    myCache.del(["gm_clients", "admin_clients"]);
    res.json(data[0]);
});

app.delete('/api/admin/clients/:id', requireRoles(ADMIN_ROLES), async (req, res) => {
    const { id } = req.params;
    console.log(`[Admin] Hard delete request for client: ${id}`);

    try {
        // 1. Fetch client details to get email for user cleanup
        const { data: client, error: fetchError } = await supabase
            .from('clients')
            .select('email, company_name')
            .eq('id', id)
            .single();

        if (fetchError || !client) {
            console.error(`[Admin] Delete failed: Client ${id} not found`);
            return res.status(404).json({ error: 'Client not found' });
        }

        console.log(`[Admin] Starting comprehensive cleanup for ${client.company_name} (${client.email})`);

        // 2. Fetch all content items for this client to clean up their logs
        const { data: items, error: itemsFetchError } = await supabase
            .from('content_items')
            .select('id')
            .eq('client_id', id);
        
        if (itemsFetchError) {
            console.warn('[Admin] Items fetch warning:', itemsFetchError.message);
        }

        const itemIds = items?.map(i => i.id) || [];

        // 3. Delete status logs for those items (Constraints: status_logs -> content_items)
        if (itemIds.length > 0) {
            console.log(`[Admin] Deleting status logs for ${itemIds.length} items`);
            const { error: logDelError } = await supabase
                .from('status_logs')
                .delete()
                .in('item_id', itemIds);
            if (logDelError) console.warn('[Admin] Status logs deletion warning:', logDelError.message);
        }

        // 4. Delete content items (Constraints: content_items -> clients)
        console.log('[Admin] Deleting content items');
        const { error: itemDelError } = await supabase
            .from('content_items')
            .delete()
            .eq('client_id', id);
        if (itemDelError) console.warn('[Admin] Content items deletion warning:', itemDelError.message);

        // 5. Delete POC communications (Constraints: poc_communications -> clients)
        console.log('[Admin] Deleting POC communications');
        const { error: pocDelError } = await supabase
            .from('poc_communications')
            .delete()
            .eq('client_id', id);
        if (pocDelError) console.warn('[Admin] POC communications deletion warning:', pocDelError.message);

        // 6. Cleanup User Accounts (Auth + DB Users)
        const { data: dbUser } = await supabase
            .from('users')
            .select('user_id')
            .eq('email', client.email)
            .single();

        if (dbUser) {
            const userId = dbUser.user_id;
            console.log(`[Admin] Deleting associated user account: ${userId}`);
            
            // Delete user notifications
            await supabase.from('notification_recipients').delete().eq('user_id', userId);
            
            // Delete from Auth (Supabase service role required)
            const { error: authError } = await supabase.auth.admin.deleteUser(userId);
            if (authError) console.warn('[Admin] Auth deletion warning:', authError.message);

            // Delete from users table
            const { error: userTableError } = await supabase.from('users').delete().eq('user_id', userId);
            if (userTableError) console.warn('[Admin] Users table deletion warning:', userTableError.message);
        }

        // 7. Finally delete the client record
        console.log(`[Admin] Executing final client deletion for ID: ${id}`);
        const { error: clientDelError } = await supabase
            .from('clients')
            .delete()
            .eq('id', id);

        if (clientDelError) {
            console.error(`[Admin] Final client deletion error for ${id}:`, clientDelError.message);
            return res.status(500).json({ error: `Final deletion failed: ${clientDelError.message}` });
        }

        console.log(`[Admin] Successfully hard-deleted client ${id} and all associated records.`);
        myCache.del(["gm_clients", "admin_clients", "admin_team"]);
        res.json({ message: 'Client and all associated data removed successfully' });

    } catch (error) {
        console.error(`[Admin] Crash during client deletion of ${id}:`, error);
        res.status(500).json({ error: `Unexpected server error: ${error.message}` });
    }
});

// ─── Admin: Team Management ───
app.get('/api/admin/team', async (req, res) => {
    // const cached = myCache.get("admin_team");
    // if (cached) return res.json(cached);

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    console.log(`[Admin Team] Total users in DB: ${data?.length || 0}`);
    data.forEach(u => console.log(`  - ${u.email} | Role: "${u.role}"`));

    const teamMembers = (data || []).filter(u => {
        const normalizedRole = (u.role || '').toUpperCase().trim().replace(/_/g, ' ');
        const isMatch = ['TL1', 'TL2', 'TEAM LEAD', 'PRODUCTION HEAD', 'POSTING TEAM', 'EMPLOYEE', 'GM', 'GENERAL MANAGER', 'COO', 'ADMIN'].includes(normalizedRole);
        if (isMatch) console.log(`    MATCH: ${u.email} | Role: ${normalizedRole}`);
        return isMatch;
    });

    res.json(teamMembers);
});

app.post('/api/admin/team', requireRoles(ADMIN_ROLES), async (req, res) => {
    const { name, email, password, role, role_identifier } = req.body;
    if (!name || !email || !password || !role) return res.status(400).json({ error: 'Missing fields' });

    console.log(`[Admin] Creating new user: ${email} (${role})`);

    try {
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email, password, email_confirm: true, user_metadata: { role, name, role_identifier }
        });
        if (authError) {
            console.error(`[Admin] Auth creation error for ${email}:`, authError.message);
            return res.status(500).json({ error: authError.message });
        }

        const { data, error } = await supabase.from('users').insert([{
            user_id: authUser.user.id,
            name,
            email,
            password_hash: password,
            role,
            role_identifier: role_identifier || role
        }]).select();

        if (error) {
            console.error(`[Admin] DB insertion error for ${email}:`, error.message);
            await supabase.auth.admin.deleteUser(authUser.user.id);
            return res.status(500).json({ error: error.message });
        }

        myCache.del("admin_team");
        res.json(data[0]);
    } catch (error) {
        console.error(`[Admin] Crash during creation of ${email}:`, error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/admin/team/:id', requireRoles(ADMIN_ROLES), async (req, res) => {
    const { id } = req.params;
    const { name, email, password, role_identifier } = req.body;

    console.log(`[Admin] Update request for ID: ${id}, Email: ${email}`);

    try {
        const updateData = {
            email,
            user_metadata: { name, role_identifier }
        };
        if (password) updateData.password = password;

        const { error: authError } = await supabase.auth.admin.updateUserById(id, updateData);

        if (authError) {
            console.warn(`[Admin] Auth update warning for ${id}:`, authError.message);
            // If user doesn't exist in Auth, create them!
            if (authError.message.includes('not found')) {
                console.log(`[Admin] Creating missing auth user for ${email}`);
                const { error: createError } = await supabase.auth.admin.createUser({
                    email,
                    password: password || 'Trueup@123',
                    email_confirm: true,
                    user_metadata: { name, role_identifier }
                });
                if (createError) return res.status(500).json({ error: createError.message });
            } else {
                return res.status(500).json({ error: authError.message });
            }
        }

        const updatePayload = { name, email, role_identifier };
        if (password) updatePayload.password_hash = password;

        const { data, error } = await supabase
            .from('users')
            .update(updatePayload)
            .eq('user_id', id)
            .select();

        if (error) {
            console.error(`[Admin] DB update error for ${id}:`, error.message);
            return res.status(500).json({ error: error.message });
        }

        myCache.del("admin_team");
        res.json(data[0]);
    } catch (error) {
        console.error(`[Admin] Crash during update for ${id}:`, error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/admin/team/:id', requireRoles(ADMIN_ROLES), async (req, res) => {
    const { id } = req.params;
    console.log(`[Admin] Delete request for user: ${id}`);

    try {
        console.log(`[Admin] Starting deletion sequence for ${id}`);

        // 1. Unassign from clients
        const { error: unassignError } = await supabase
            .from('clients')
            .update({ team_lead_id: null })
            .eq('team_lead_id', id);
        if (unassignError) console.warn('[Admin] Client unassign warning:', unassignError.message);

        // 2. Clear references in status_logs (set to null so history is preserved)
        const { error: logError } = await supabase
            .from('status_logs')
            .update({ changed_by: null })
            .eq('changed_by', id);
        if (logError) console.warn('[Admin] Status logs cleanup warning:', logError.message);

        // 3. Clear references in notifications
        const { error: notifError } = await supabase
            .from('notifications')
            .update({ sender_id: null })
            .eq('sender_id', id);
        if (notifError) console.warn('[Admin] Notifications cleanup warning:', notifError.message);

        // 4. Delete user notifications (recipient entries)
        const { error: userNotifError } = await supabase
            .from('user_notifications')
            .delete()
            .eq('user_id', id);
        if (userNotifError) console.warn('[Admin] User notifications deletion warning:', userNotifError.message);

        // 5. Clear references in emergency logs
        const { error: emergencyError } = await supabase
            .from('emergency_logs')
            .delete()
            .eq('user_id', id);
        if (emergencyError) console.warn('[Admin] Emergency logs cleanup warning:', emergencyError.message);

        // 6. Delete from Auth (prevents future logins)
        // Note: Using service role key, this should work.
        const { error: authError } = await supabase.auth.admin.deleteUser(id);
        if (authError && authError.message !== 'User not found') {
            console.error(`[Admin] Auth deletion error for ${id}:`, authError.message);
        }

        // 7. Finally delete from users table
        const { error: dbError } = await supabase.from('users').delete().eq('user_id', id);
        if (dbError) {
            console.error(`[Admin] DB deletion error for ${id}:`, dbError.message);
            return res.status(500).json({ error: `Database error: ${dbError.message}` });
        }

        console.log(`[Admin] Successfully deleted user ${id}`);
        myCache.del("admin_team");
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error(`[Admin] Crash during deletion of ${id}:`, error);
        res.status(500).json({ error: error.message });
    }
});

// ─── Admin: Dashboard Stats ───
app.get('/api/admin/stats', async (req, res) => {
    const now = new Date();
    const year = now.getFullYear();
    const mon = String(now.getMonth() + 1).padStart(2, '0');
    const startDate = `${year}-${mon}-01T00:00:00`;
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    const endDate = `${year}-${mon}-${String(lastDay).padStart(2, '0')}T23:59:59`;

    try {
        const [clientRes, itemRes, statusRes] = await Promise.all([
            supabase.from('clients').select('*', { count: 'exact', head: true }).eq('is_active', true).eq('is_deleted', false),
            supabase.from('content_items').select('*', { count: 'exact', head: true }).gte('scheduled_datetime', startDate).lte('scheduled_datetime', endDate),
            supabase.from('content_items').select('status')
        ]);

        const statusSummary = {};
        if (statusRes.data) {
            statusRes.data.forEach(item => { statusSummary[item.status] = (statusSummary[item.status] || 0) + 1; });
        }

        res.json({
            totalClients: clientRes.count,
            totalItemsThisMonth: itemRes.count,
            statusSummary
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── Admin: Master Calendar ───
app.get('/api/admin/master-calendar', async (req, res) => {
    const { month, client_id, content_type, asOfDate } = req.query;
    if (!month) return res.status(400).json({ error: 'Missing month' });

    const [year, mon] = String(month).split('-');
    const startDate = `${year}-${mon}-01T00:00:00`;
    const lastDay = new Date(parseInt(year), parseInt(mon), 0).getDate();
    const endDate = `${year}-${mon}-${String(lastDay).padStart(2, '0')}T23:59:59`;

    let query = supabase
        .from('content_items')
        .select(`*, clients (company_name)`)
        .gte('scheduled_datetime', startDate)
        .lte('scheduled_datetime', endDate);

    if (client_id) query = query.eq('client_id', client_id);
    if (content_type) query = query.eq('content_type', content_type);

    const { data, error } = await query.order('scheduled_datetime');

    if (error) return res.status(500).json({ error: error.message });

    const transformedData = await applyHistoricalStatus(data, asOfDate);
    res.json(transformedData);
});

app.get('/api/admin/content/:id', async (req, res) => {
    const { id } = req.params;
    const { asOfDate } = req.query;
    try {
        const [itemRes, logsRes] = await Promise.all([
            supabase.from('content_items').select(`*, clients (company_name)`).eq('id', id).single(),
            supabase.from('status_logs').select(`*, users:changed_by (name, role_identifier)`).eq('item_id', id).order('changed_at', { ascending: false })
        ]);

        if (itemRes.error) return res.status(500).json({ error: itemRes.error.message });

        const transformedItem = await applyHistoricalStatus(itemRes.data, asOfDate);
        res.json({ item: transformedItem, history: logsRes.data || [] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── COO: Read-only Monitoring ───
app.get('/api/coo/clients', requireRoles(COO_ROLES), async (req, res) => {
    const { data, error } = await supabase.from('clients').select('*').eq('is_deleted', false).order('company_name');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.get('/api/coo/team', requireRoles(COO_ROLES), async (req, res) => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    const teamLeads = (data || []).filter(u => ['TL1', 'TL2', 'TEAM LEAD'].includes(u.role));
    res.json(teamLeads);
});

app.get('/api/coo/stats', requireRoles(COO_ROLES), async (req, res) => {
    const now = new Date();
    const year = now.getFullYear();
    const mon = String(now.getMonth() + 1).padStart(2, '0');
    const startDate = `${year}-${mon}-01T00:00:00`;
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    const endDate = `${year}-${mon}-${String(lastDay).padStart(2, '0')}T23:59:59`;

    try {
        const [clientRes, itemRes, statusRes] = await Promise.all([
            supabase.from('clients').select('*', { count: 'exact', head: true }).eq('is_active', true).eq('is_deleted', false),
            supabase.from('content_items').select('*', { count: 'exact', head: true }).gte('scheduled_datetime', startDate).lte('scheduled_datetime', endDate),
            supabase.from('content_items').select('status')
        ]);

        const statusSummary = {};
        if (statusRes.data) {
            statusRes.data.forEach(item => { statusSummary[item.status] = (statusSummary[item.status] || 0) + 1; });
        }

        res.json({
            totalClients: clientRes.count,
            totalItemsThisMonth: itemRes.count,
            statusSummary
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/coo/master-calendar', requireRoles(COO_ROLES), async (req, res) => {
    const { month, client_id, content_type, asOfDate } = req.query;
    if (!month) return res.status(400).json({ error: 'Missing month' });

    const [year, mon] = String(month).split('-');
    const startDate = `${year}-${mon}-01T00:00:00`;
    const lastDay = new Date(parseInt(year), parseInt(mon), 0).getDate();
    const endDate = `${year}-${mon}-${String(lastDay).padStart(2, '0')}T23:59:59`;

    let query = supabase
        .from('content_items')
        .select(`*, clients (company_name)`)
        .gte('scheduled_datetime', startDate)
        .lte('scheduled_datetime', endDate);

    if (client_id) query = query.eq('client_id', client_id);
    if (content_type) query = query.eq('content_type', content_type);

    const { data, error } = await query.order('scheduled_datetime');
    if (error) return res.status(500).json({ error: error.message });

    const transformedData = await applyHistoricalStatus(data, asOfDate);
    res.json(transformedData);
});

app.get('/api/admin/content/:id', requireRoles(ADMIN_ROLES), async (req, res) => {
    const { id } = req.params;
    const { asOfDate } = req.query;
    try {
        const [itemRes, logsRes] = await Promise.all([
            supabase.from('content_items').select(`*, clients (company_name)`).eq('id', id).single(),
            supabase.from('status_logs').select(`*, users:changed_by (name, role_identifier)`).eq('item_id', id).order('changed_at', { ascending: false })
        ]);

        if (itemRes.error) return res.status(500).json({ error: itemRes.error.message });

        const transformedItem = await applyHistoricalStatus(itemRes.data, asOfDate);
        res.json({ item: transformedItem, currentItem: itemRes.data, history: logsRes.data || [] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/admin/content/:id/status', requireRoles(ADMIN_ROLES), async (req, res) => {
    const { id } = req.params;
    const { new_status, note, changed_by } = req.body;
    try {
        const { data: item, error: fetchError } = await supabase.from('content_items').select('status, content_type').eq('id', id).single();
        if (fetchError || !item) return res.status(404).json({ error: 'Item not found' });

        const { error: updateError } = await supabase.from('content_items').update({ status: new_status, updated_at: new Date().toISOString() }).eq('id', id);
        if (updateError) return res.status(500).json({ error: 'Failed to update status' });

        await supabase.from('status_logs').insert([{ item_id: id, old_status: item.status, new_status: new_status, note: note || null, changed_by: changed_by || req.user.id }]);
        res.json({ message: 'Status updated successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/content/:id/undo-status', requireRoles(ADMIN_ROLES), async (req, res) => {
    const { id } = req.params;
    try {
        const { data: latestLog, error: logFetchError } = await supabase.from('status_logs').select('*').eq('item_id', id).order('changed_at', { ascending: false }).limit(1).single();
        if (logFetchError || !latestLog) return res.status(404).json({ error: 'No history found' });

        const { error: revertError } = await supabase.from('content_items').update({ status: latestLog.old_status, updated_at: new Date().toISOString() }).eq('id', id);
        if (revertError) return res.status(500).json({ error: 'Failed to revert' });

        await supabase.from('status_logs').delete().eq('log_id', latestLog.log_id);
        res.json({ message: 'Success', status: latestLog.old_status });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/coo/content/:id', requireRoles(COO_ROLES), async (req, res) => {
    const { id } = req.params;
    const { asOfDate } = req.query;
    try {
        const [itemRes, logsRes] = await Promise.all([
            supabase.from('content_items').select(`*, clients (company_name)`).eq('id', id).single(),
            supabase.from('status_logs').select(`*, users:changed_by (name, role_identifier)`).eq('item_id', id).order('changed_at', { ascending: false })
        ]);

        if (itemRes.error) return res.status(500).json({ error: itemRes.error.message });

        const transformedItem = await applyHistoricalStatus(itemRes.data, asOfDate);
        res.json({ item: transformedItem, currentItem: itemRes.data, history: logsRes.data || [] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/coo/content/:id/status', requireRoles(COO_ROLES), async (req, res) => {
    const { id } = req.params;
    const { new_status, note, changed_by } = req.body;
    try {
        const { data: item, error: fetchError } = await supabase.from('content_items').select('status, content_type').eq('id', id).single();
        if (fetchError || !item) return res.status(404).json({ error: 'Item not found' });

        const { error: updateError } = await supabase.from('content_items').update({ status: new_status, updated_at: new Date().toISOString() }).eq('id', id);
        if (updateError) return res.status(500).json({ error: 'Failed to update status' });

        await supabase.from('status_logs').insert([{ item_id: id, old_status: item.status, new_status: new_status, note: note || null, changed_by: changed_by || req.user.id }]);
        res.json({ message: 'Status updated successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/coo/content/:id/undo', requireRoles(COO_ROLES), async (req, res) => {
    const { id } = req.params;
    try {
        const { data: latestLog, error: logFetchError } = await supabase.from('status_logs').select('*').eq('item_id', id).order('changed_at', { ascending: false }).limit(1).single();
        if (logFetchError || !latestLog) return res.status(404).json({ error: 'No history found' });

        const { error: revertError } = await supabase.from('content_items').update({ status: latestLog.old_status, updated_at: new Date().toISOString() }).eq('id', id);
        if (revertError) return res.status(500).json({ error: 'Failed to revert' });

        await supabase.from('status_logs').delete().eq('log_id', latestLog.log_id);
        res.json({ message: 'Success', status: latestLog.old_status });
    } catch (error) { res.status(500).json({ error: error.message }); }
});


app.post('/api/admin/content', requireRoles(ADMIN_ROLES), async (req, res) => {
    const { client_id, title, description, content_type, scheduled_datetime } = req.body;
    const initial_status = 'PENDING';

    try {
        // Check monthly limit
        const limitCheck = await checkContentLimit(client_id, content_type, scheduled_datetime);
        if (!limitCheck.allowed) {
            return res.status(400).json({
                error: `Monthly ${content_type} limit reached (${limitCheck.limit}). Already have ${limitCheck.count} items for the period ${limitCheck.period}.`
            });
        }

        const { data, error } = await supabase
            .from('content_items')
            .insert([{ client_id, title, description, content_type, scheduled_datetime, status: initial_status }])
            .select();

        if (error) return res.status(500).json({ error: error.message });
        res.json(data[0]);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

app.put('/api/admin/content/:id', requireRoles(ADMIN_ROLES), async (req, res) => {
    const { id } = req.params;
    const { title, description, scheduled_datetime, is_rescheduled, content_type } = req.body;
    const { data, error } = await supabase
        .from('content_items')
        .update({ title, description, scheduled_datetime, is_rescheduled, content_type })
        .eq('id', id)
        .select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

app.delete('/api/admin/content/:id', requireRoles(ADMIN_ROLES), async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('content_items').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Deleted successfully' });
});


// ─── Team Leads ───
app.get('/api/gm/team-leads', async (req, res) => {
    const { data, error } = await supabase
        .from('users')
        .select('user_id, name, email, role, role_identifier');

    if (error) return res.status(500).json({ error: error.message });

    // Filter in JS to avoid enum-space matching issues
    const teamLeads = (data || []).filter(u => ['TL1', 'TL2', 'TEAM LEAD'].includes(u.role));
    res.json(teamLeads);
});

// ─── Assign Client to Team Lead ───
app.patch('/api/gm/clients/:id/assign', async (req, res) => {
    const { id } = req.params;
    let { team_lead_id } = req.body;

    // Convert empty string to null for unassignment
    if (team_lead_id === '') team_lead_id = null;

    try {
        // Fetch current assignment to clear old lead's cache
        const { data: currentClient } = await supabase
            .from('clients')
            .select('team_lead_id')
            .eq('id', id)
            .single();

        const { data, error } = await supabase
            .from('clients')
            .update({ team_lead_id })
            .eq('id', id)
            .select();

        if (error) return res.status(500).json({ error: error.message });

        // Clear caches
        if (currentClient?.team_lead_id) {
            myCache.del(`tl_clients_${currentClient.team_lead_id}`);
        }
        if (team_lead_id) {
            myCache.del(`tl_clients_${team_lead_id}`);
        }
        myCache.del(["gm_clients", "admin_clients"]);

        res.json(data[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── Get Clients for a Team Lead ───
app.get('/api/gm/team-leads/:id/clients', async (req, res) => {
    const { id } = req.params;
    const cacheKey = `tl_clients_${id}`;
    const cached = myCache.get(cacheKey);
    if (cached) return res.json(cached);

    const { data, error } = await supabase
        .from('clients')
        .select('id, company_name')
        .eq('team_lead_id', id)
        .eq('is_active', true)
        .eq('is_deleted', false);

    if (error) return res.status(500).json({ error: error.message });
    myCache.set(cacheKey, data);
    res.json(data);
});

// ─── Production Head: Endpoints ───
// PH: Monthly Stats
app.get('/api/ph/stats', requireRoles(PH_ROLES), async (req, res) => {
    const { month } = req.query;
    try {
        const now = new Date();
        const year = month ? parseInt(String(month).split('-')[0]) : now.getFullYear();
        const mon = month ? parseInt(String(month).split('-')[1]) : now.getMonth() + 1;

        const startDate = `${year}-${String(mon).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(mon).padStart(2, '0')}-${String(new Date(year, mon, 0).getDate()).padStart(2, '0')} 23:59:59`;

        const { data, error } = await supabase
            .from('content_items')
            .select('content_type')
            .gte('scheduled_datetime', startDate)
            .lte('scheduled_datetime', endDate);

        if (error) return res.status(500).json({ error: error.message });

        const stats = {
            reelsCount: data.filter(i => i.content_type === 'Reel').length,
            postsCount: data.filter(i => i.content_type === 'Post').length,
            youtubeCount: data.filter(i => i.content_type === 'YouTube').length
        };
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PH: Master Calendar
app.get('/api/ph/master-calendar', requireRoles(PH_ROLES), async (req, res) => {
    const { month, client_id, content_type, asOfDate } = req.query;
    if (!month) return res.status(400).json({ error: 'Missing month' });

    try {
        const [year, mon] = String(month).split('-');
        const lastDay = new Date(parseInt(year), parseInt(mon), 0).getDate();
        const startDate = `${year}-${mon}-01T00:00:00`;
        const endDate = `${year}-${mon}-${String(lastDay).padStart(2, '0')}T23:59:59`;

        let query = supabase
            .from('content_items')
            .select('*, clients(company_name)')
            .gte('scheduled_datetime', startDate)
            .lte('scheduled_datetime', endDate);

        if (client_id) query = query.eq('client_id', client_id);
        if (content_type) query = query.eq('content_type', content_type);

        const { data, error } = await query.order('scheduled_datetime');
        if (error) return res.status(500).json({ error: error.message });

        const transformedData = await applyHistoricalStatus(data, asOfDate);
        res.json(transformedData);
    } catch (err) {
        console.error(`[PH Master Calendar] ERROR:`, err.stack || err.message);
        res.status(500).json({ error: err.message });
    }
});

// PH: Today's Queue
app.get('/api/ph/today', requireRoles(PH_ROLES), async (req, res) => {
    try {
        const now = new Date();
        const year = now.getFullYear();
        const mon = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const startDate = `${year}-${mon}-${day}T00:00:00`;
        const endDate = `${year}-${mon}-${day}T23:59:59`;

        const { data, error } = await supabase
            .from('content_items')
            .select(`*, clients (company_name)`)
            .in('status', ['CONTENT APPROVED', 'SHOOT DONE', 'EDITING IN PROGRESS', 'EDITED', 'DESIGNING IN PROGRESS', 'DESIGNING COMPLETED'])
            .lte('scheduled_datetime', endDate)
            .order('scheduled_datetime');

        if (error) return res.status(500).json({ error: error.message });
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PH: Client Calendar
app.get('/api/ph/calendar', requireRoles(PH_ROLES), async (req, res) => {
    const { client_id, month, status, all } = req.query;
    if (!client_id || !month) return res.status(400).json({ error: 'Missing client_id or month' });

    try {
        const [year, mon] = String(month).split('-');
        const startDate = `${year}-${mon}-01T00:00:00`;
        const lastDay = new Date(parseInt(year), parseInt(mon), 0).getDate();
        const endDate = `${year}-${mon}-${String(lastDay).padStart(2, '0')}T23:59:59`;

        let query = supabase
            .from('content_items')
            .select(`*, clients (company_name)`)
            .eq('client_id', client_id)
            .gte('scheduled_datetime', startDate)
            .lte('scheduled_datetime', endDate);

        if (all === 'true') {
            // No status filter
        } else if (status) {
            query = query.eq('status', status);
        } else {
            query = query.eq('status', 'CONTENT APPROVED');
        }

        const { data, error } = await query.order('scheduled_datetime');
        if (error) return res.status(500).json({ error: error.message });
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PH: Clients list
app.get('/api/ph/clients', requireRoles(PH_ROLES), async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('clients')
            .select('id, company_name')
            .eq('is_active', true)
            .eq('is_deleted', false)
            .order('company_name');

        if (error) return res.status(500).json({ error: error.message });
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PH: Content Details
app.get('/api/ph/content/:id', requireRoles(PH_ROLES), async (req, res) => {
    const { id } = req.params;
    const { asOfDate } = req.query;
    try {
        const [itemRes, logsRes] = await Promise.all([
            supabase.from('content_items').select(`*, clients (company_name)`).eq('id', id).single(),
            supabase.from('status_logs').select(`*, users:changed_by (name, role_identifier)`).eq('item_id', id).order('changed_at', { ascending: false })
        ]);

        if (itemRes.error) return res.status(500).json({ error: itemRes.error.message });

        const transformedItem = await applyHistoricalStatus(itemRes.data, asOfDate);
        res.json({ item: transformedItem, currentItem: itemRes.data, history: logsRes.data || [] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PH: Update Content Status (Now with expanded powers up to WAITING FOR APPROVAL)
app.patch('/api/ph/content/:id/status', requireRoles(PH_ROLES), async (req, res) => {
    const { id } = req.params;
    const { status, new_status, note, changed_by } = req.body;
    const finalStatus = new_status || status;

    if (!finalStatus) {
        return res.status(400).json({ error: 'Missing new status' });
    }

    try {
        const { data: item, error: fetchError } = await supabase
            .from('content_items')
            .select('status, content_type')
            .eq('id', id)
            .single();

        if (fetchError || !item) return res.status(404).json({ error: 'Item not found' });

        // Validate if the new status is within PH's authority
        const flow = STATUS_FLOWS[item.content_type] || [];
        const targetIdx = flow.indexOf(finalStatus);
        const limitIdx = flow.indexOf('WAITING FOR APPROVAL');

        if (targetIdx === -1) {
            return res.status(400).json({ error: `Invalid status "${finalStatus}" for content type ${item.content_type}` });
        }

        if (targetIdx > limitIdx && limitIdx !== -1) {
            return res.status(403).json({ error: 'Production Head authority capped at WAITING FOR APPROVAL' });
        }

        const { error: updateError } = await supabase
            .from('content_items')
            .update({ status: finalStatus, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (updateError) return res.status(500).json({ error: updateError.message });

        await supabase.from('status_logs').insert([{
            item_id: id,
            old_status: item.status,
            new_status: finalStatus,
            note: note || `Updated to ${finalStatus} by Production Head`,
            changed_by: changed_by || req.user.id
        }]);

        res.json({ message: 'Success', status: finalStatus });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PH: Undo Status Change (Generalized)
app.post('/api/ph/content/:id/undo', requireRoles(PH_ROLES), async (req, res) => {
    const { id } = req.params;
    try {
        const { data: latestLog, error: logFetchError } = await supabase
            .from('status_logs')
            .select('*')
            .eq('item_id', id)
            .order('changed_at', { ascending: false })
            .limit(1)
            .single();

        if (logFetchError || !latestLog) return res.status(404).json({ error: 'No recent history found' });

        // Ensure PH was the one who made the change (optional but safer)
        const { error: revertError } = await supabase
            .from('content_items')
            .update({ status: latestLog.old_status, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (revertError) return res.status(500).json({ error: 'Failed to revert status' });

        await supabase.from('status_logs').delete().eq('log_id', latestLog.log_id);
        res.json({ message: 'Success', status: latestLog.old_status });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PH: Get Employees for Assignment
app.get('/api/ph/employees', requireRoles(PH_ROLES), async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('user_id, name, email')
            .eq('role', 'EMPLOYEE')
            .order('name');

        if (error) return res.status(500).json({ error: error.message });
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PH: Assign Employee to Content Item
app.patch('/api/ph/content/:id/assign', requireRoles(PH_ROLES), async (req, res) => {
    const { id } = req.params;
    const { assigned_to } = req.body;

    console.log(`[PH Assign] Request for content ${id}, assign to ${assigned_to}`);

    try {
        const { data, error } = await supabase
            .from('content_items')
            .update({
                assigned_to: assigned_to || null,
                assigned_at: assigned_to ? new Date().toISOString() : null,
                employee_task_status: assigned_to ? 'PENDING' : null
            })
            .eq('id', id)
            .select();

        if (error) {
            console.error('[PH Assign] Supabase Error:', error);
            return res.status(500).json({ error: error.message });
        }

        if (!data || data.length === 0) {
            console.warn(`[PH Assign] No rows updated for ID ${id}`);
            return res.status(404).json({ error: 'Content item not found' });
        }

        console.log(`[PH Assign] Successfully assigned ${id} to ${assigned_to}`);
        res.json(data[0]);
    } catch (err) {
        console.error('[PH Assign] Exception:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── Employee Endpoints ───
app.get('/api/employee/tasks', requireRoles(EMPLOYEE_ROLES), async (req, res) => {
    const userId = req.user.id;
    const { month } = req.query;

    try {
        if (month) {
            // History view: fetch all assignments made in a specific month
            const [year, mon] = String(month).split('-');
            const startDate = `${year}-${mon}-01T00:00:00`;
            const lastDay = new Date(parseInt(year), parseInt(mon), 0).getDate();
            const endDate = `${year}-${mon}-${String(lastDay).padStart(2, '0')}T23:59:59`;

            const { data, error } = await supabase
                .from('content_items')
                .select(`*, clients (company_name)`)
                .eq('assigned_to', userId)
                .gte('assigned_at', startDate)
                .lte('assigned_at', endDate)
                .order('assigned_at', { ascending: false });

            if (error) return res.status(500).json({ error: error.message });
            return res.json(data);
        }

        // Default Dashboard view: Assignments made this month + any overdue pending tasks
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        
        // Start of current month
        const startOfMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01T00:00:00`;
        
        const { data, error } = await supabase
            .from('content_items')
            .select(`*, clients (company_name)`)
            .eq('assigned_to', userId)
            .or(`assigned_at.gte.${startOfMonth},employee_task_status.eq.PENDING`)
            .order('assigned_at', { ascending: true });

        if (error) {
            console.error('[EmployeeTasks] Dashboard Query Error:', error.message);
            return res.status(500).json({ error: error.message });
        }
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/employee/tasks/:id/status', requireRoles(EMPLOYEE_ROLES), async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    try {
        const { data: item, error: fetchError } = await supabase
            .from('content_items')
            .select('assigned_to')
            .eq('id', id)
            .single();

        if (fetchError || !item) return res.status(404).json({ error: 'Task not found' });
        if (item.assigned_to !== userId && req.resolvedRole !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { data, error } = await supabase
            .from('content_items')
            .update({ employee_task_status: status })
            .eq('id', id)
            .select();

        if (error) return res.status(500).json({ error: error.message });
        res.json(data[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ─── Team Lead Endpoints ───
app.get('/api/tl/clients', requireRoles(TL_ROLES), async (req, res) => {
    const { tlId } = req.query;
    console.log('Fetching TL clients for ID:', tlId);

    if (!tlId) return res.status(400).json({ error: 'Missing tlId' });

    const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('team_lead_id', tlId)
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('company_name');

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.get('/api/tl/calendar', requireRoles(TL_ROLES), async (req, res) => {
    const { client_id, month, tlId } = req.query;
    console.log(`Fetching calendar for client ${client_id}, month ${month}, TL ${tlId}`);

    if (!client_id || !month || !tlId) return res.status(400).json({ error: 'Missing client_id, month, or tlId' });

    // Verify TL manages this client
    const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('id', client_id)
        .eq('team_lead_id', tlId)
        .single();

    if (clientError || !client) return res.status(403).json({ error: 'Access denied' });

    const [year, mon] = String(month).split('-');
    const startDate = `${year}-${mon}-01T00:00:00`;
    const lastDay = new Date(parseInt(year), parseInt(mon), 0).getDate();
    const endDate = `${year}-${mon}-${String(lastDay).padStart(2, '0')}T23:59:59`;

    const { data, error } = await supabase
        .from('content_items')
        .select('*')
        .eq('client_id', client_id)
        .gte('scheduled_datetime', startDate)
        .lte('scheduled_datetime', endDate)
        .order('scheduled_datetime');

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// ─── Team Lead: Content Management ───
app.get('/api/tl/clients-duplicate', requireRoles(TL_ROLES), async (req, res) => {
    const { tlId } = req.query;
    if (!tlId) return res.status(400).json({ error: 'tlId is required' });

    const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('team_lead_id', tlId)
        .eq('is_deleted', false);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.get('/api/tl/calendar-duplicate', requireRoles(TL_ROLES), async (req, res) => {
    const { client_id, month, tlId } = req.query;
    if (!client_id || !month || !tlId) return res.status(400).json({ error: 'Missing parameters' });

    // Verify client belongs to this TL
    const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('id', client_id)
        .eq('team_lead_id', tlId)
        .single();

    if (clientError || !client) return res.status(403).json({ error: 'Unauthorized or client not found' });

    const [year, mon] = String(month).split('-');
    const startDate = `${year}-${mon}-01T00:00:00`;
    const lastDay = new Date(parseInt(year), parseInt(mon), 0).getDate();
    const endDate = `${year}-${mon}-${String(lastDay).padStart(2, '0')}T23:59:59`;

    const { data, error } = await supabase
        .from('content_items')
        .select('*')
        .eq('client_id', client_id)
        .gte('scheduled_datetime', startDate)
        .lte('scheduled_datetime', endDate)
        .order('scheduled_datetime');

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.get('/api/tl/master-calendar', requireRoles(TL_ROLES), async (req, res) => {
    const { month, tlId, content_type, asOfDate } = req.query;
    console.log(`Fetching master calendar for month ${month}, TL ${tlId}`);

    if (!month || !tlId) return res.status(400).json({ error: 'Missing month or tlId' });

    // Get all clients for this TL
    const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id')
        .eq('team_lead_id', tlId);

    if (clientsError) return res.status(500).json({ error: clientsError.message });
    if (!clients || clients.length === 0) return res.json([]);

    const clientIds = clients.map(c => c.id);

    const [year, mon] = String(month).split('-');
    const startDate = `${year}-${mon}-01T00:00:00`;
    const lastDay = new Date(parseInt(year), parseInt(mon), 0).getDate();
    const endDate = `${year}-${mon}-${String(lastDay).padStart(2, '0')}T23:59:59`;

    let query = supabase
        .from('content_items')
        .select(`*, clients (company_name)`)
        .in('client_id', clientIds)
        .gte('scheduled_datetime', startDate)
        .lte('scheduled_datetime', endDate);

    if (content_type) query = query.eq('content_type', content_type);

    const { data, error } = await query.order('scheduled_datetime');

    if (error) return res.status(500).json({ error: error.message });

    const transformedData = await applyHistoricalStatus(data, asOfDate);
    res.json(transformedData);
});

// ─── POC Communication (Team Lead + GM) ───
const POC_SELECT_BASE = 'id, team_lead_id, note_date, note_text, created_at, users:team_lead_id (name, role_identifier)';
const POC_SELECT_WITH_CLIENT = `${POC_SELECT_BASE}, client_id, clients:client_id (company_name)`;
const isMissingPocClientColumn = (error) => {
    const message = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
    return message.includes('client_id') && (
        message.includes('does not exist') ||
        message.includes('could not find') ||
        message.includes('relationship')
    );
};

app.get('/api/tl/poc-notes', requireRoles(TL_ROLES), async (req, res) => {
    const { month, tlId, client_id } = req.query;
    if (!month || !tlId) return res.status(400).json({ error: 'Missing month or tlId' });

    const [year, mon] = String(month).split('-');
    const startDate = `${year}-${mon}-01`;
    const lastDay = new Date(parseInt(year), parseInt(mon), 0).getDate();
    const endDate = `${year}-${mon}-${String(lastDay).padStart(2, '0')}`;

    let query = supabase
        .from('poc_communications')
        .select(POC_SELECT_WITH_CLIENT)
        .eq('team_lead_id', tlId)
        .gte('note_date', startDate)
        .lte('note_date', endDate)
        .order('note_date', { ascending: true })
        .order('created_at', { ascending: false });

    if (client_id) {
        query = query.eq('client_id', client_id);
    }

    const { data, error } = await query;
    if (error) {
        if (isMissingPocClientColumn(error)) {
            if (client_id) return res.json([]);

            const { data: fallbackData, error: fallbackError } = await supabase
                .from('poc_communications')
                .select(POC_SELECT_BASE)
                .eq('team_lead_id', tlId)
                .gte('note_date', startDate)
                .lte('note_date', endDate)
                .order('note_date', { ascending: true })
                .order('created_at', { ascending: false });

            if (fallbackError) return res.status(500).json({ error: fallbackError.message });
            return res.json(fallbackData || []);
        }

        return res.status(500).json({ error: error.message });
    }
    res.json(data || []);
});

app.post('/api/tl/poc-notes', requireRoles(TL_ROLES), async (req, res) => {
    const { tlId, client_id, note_date, note_text } = req.body;
    if (!tlId || !client_id || !note_date || !note_text?.trim()) {
        return res.status(400).json({ error: 'tlId, client_id, note_date and note_text are required' });
    }

    const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('id', client_id)
        .eq('team_lead_id', tlId)
        .eq('is_deleted', false)
        .single();

    if (clientError || !client) {
        return res.status(403).json({ error: 'Client is not assigned to this team lead' });
    }

    const insertPayload = {
        team_lead_id: tlId,
        client_id,
        note_date,
        note_text: note_text.trim()
    };

    const { data, error } = await supabase
        .from('poc_communications')
        .insert([insertPayload])
        .select(POC_SELECT_WITH_CLIENT)
        .single();

    if (error) {
        if (isMissingPocClientColumn(error)) {
            const { client_id: _clientId, ...legacyPayload } = insertPayload;
            const { data: fallbackData, error: fallbackError } = await supabase
                .from('poc_communications')
                .insert([legacyPayload])
                .select(POC_SELECT_BASE)
                .single();

            if (fallbackError) return res.status(500).json({ error: fallbackError.message });
            return res.json(fallbackData);
        }

        return res.status(500).json({ error: error.message });
    }
    res.json(data);
});

app.post('/api/tl/content/:id/undo-status', requireRoles(TL_ROLES), async (req, res) => {
    const { id } = req.params;
    try {
        const { data: latestLog, error: logFetchError } = await supabase
            .from('status_logs')
            .select('*')
            .eq('item_id', id)
            .order('changed_at', { ascending: false })
            .limit(1)
            .single();

        if (logFetchError || !latestLog) {
            return res.status(404).json({ error: 'No status history found to undo' });
        }

        const { error: revertError } = await supabase
            .from('content_items')
            .update({ status: latestLog.old_status, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (revertError) {
            return res.status(500).json({ error: 'Failed to revert status' });
        }

        await supabase.from('status_logs').delete().eq('log_id', latestLog.log_id);

        res.json({ message: 'Status reverted successfully', previous_status: latestLog.old_status });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/gm/poc-notes', requireRoles(GM_ROLES), async (req, res) => {
    const { month, team_lead_id, client_id } = req.query;
    if (!month) return res.status(400).json({ error: 'Missing month' });

    const [year, mon] = String(month).split('-');
    const startDate = `${year}-${mon}-01`;
    const lastDay = new Date(parseInt(year), parseInt(mon), 0).getDate();
    const endDate = `${year}-${mon}-${String(lastDay).padStart(2, '0')}`;

    let query = supabase
        .from('poc_communications')
        .select(POC_SELECT_WITH_CLIENT)
        .gte('note_date', startDate)
        .lte('note_date', endDate)
        .order('note_date', { ascending: true })
        .order('created_at', { ascending: false });

    if (team_lead_id) {
        query = query.eq('team_lead_id', team_lead_id);
    }

    if (client_id) {
        query = query.eq('client_id', client_id);
    }

    const { data, error } = await query;
    if (error) {
        if (isMissingPocClientColumn(error)) {
            if (client_id) return res.json([]);

            let fallbackQuery = supabase
                .from('poc_communications')
                .select(POC_SELECT_BASE)
                .gte('note_date', startDate)
                .lte('note_date', endDate)
                .order('note_date', { ascending: true })
                .order('created_at', { ascending: false });

            if (team_lead_id) {
                fallbackQuery = fallbackQuery.eq('team_lead_id', team_lead_id);
            }

            const { data: fallbackData, error: fallbackError } = await fallbackQuery;
            if (fallbackError) return res.status(500).json({ error: fallbackError.message });
            return res.json(fallbackData || []);
        }

        return res.status(500).json({ error: error.message });
    }
    res.json(data || []);
});

// ─── Posting Team Endpoints ───

app.get('/api/posting/today', requireRoles(POSTING_ROLES), async (req, res) => {
    try {
        const now = new Date();
        const year = now.getFullYear();
        const mon = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const startDate = `${year}-${mon}-${day}T00:00:00`;
        const endDate = `${year}-${mon}-${day}T23:59:59`;

        const { data, error } = await supabase
            .from('content_items')
            .select(`*, clients (company_name)`)
            .in('status', ['WAITING FOR POSTING', 'POSTED'])
            .gte('scheduled_datetime', startDate)
            .lte('scheduled_datetime', endDate)
            .order('scheduled_datetime');

        if (error) return res.status(500).json({ error: error.message });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Posting Team: Client Calendar (filtered to WAITING FOR POSTING only)
app.get('/api/posting/calendar', requireRoles(POSTING_ROLES), async (req, res) => {
    const { client_id, month, status, all } = req.query;
    if (!client_id || !month) return res.status(400).json({ error: 'Missing client_id or month' });

    const [year, mon] = String(month).split('-');
    const startDate = `${year}-${mon}-01T00:00:00`;
    const lastDay = new Date(parseInt(year), parseInt(mon), 0).getDate();
    const endDate = `${year}-${mon}-${String(lastDay).padStart(2, '0')}T23:59:59`;

    let query = supabase
        .from('content_items')
        .select(`*, clients (company_name)`)
        .eq('client_id', client_id)
        .gte('scheduled_datetime', startDate)
        .lte('scheduled_datetime', endDate);

    // Strictly filter by status unless 'all' is explicitly requested
    if (all === 'true') {
        // No status filter
    } else if (status) {
        query = query.eq('status', status);
    } else {
        query = query.eq('status', 'WAITING FOR POSTING');
    }

    const { data, error } = await query.order('scheduled_datetime');

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Posting Team: Master Calendar (filtered to WAITING FOR POSTING only)
app.get('/api/posting/master-calendar', requireRoles(POSTING_ROLES), async (req, res) => {
    const { month, client_id, status, all, asOfDate } = req.query;
    if (!month) return res.status(400).json({ error: 'Missing month' });

    const [year, mon] = String(month).split('-');
    const startDate = `${year}-${mon}-01T00:00:00`;
    const lastDay = new Date(parseInt(year), parseInt(mon), 0).getDate();
    const endDate = `${year}-${mon}-${String(lastDay).padStart(2, '0')}T23:59:59`;

    let query = supabase
        .from('content_items')
        .select(`*, clients (company_name)`)
        .gte('scheduled_datetime', startDate)
        .lte('scheduled_datetime', endDate);

    if (client_id) query = query.eq('client_id', client_id);

    // Strictly filter by status unless 'all' is explicitly requested (for stats)
    if (all === 'true') {
        // No status filter
    } else if (status) {
        query = query.eq('status', status);
    } else {
        query = query.eq('status', 'WAITING FOR POSTING');
    }

    const { data, error } = await query.order('scheduled_datetime');

    if (error) return res.status(500).json({ error: error.message });

    const transformedData = await applyHistoricalStatus(data, asOfDate);
    res.json(transformedData);
});

// Posting Team: Clients list (for calendar dropdown)
app.get('/api/posting/clients', requireRoles(POSTING_ROLES), async (req, res) => {
    const { data, error } = await supabase
        .from('clients')
        .select('id, company_name, posts_per_month, reels_per_month')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('company_name');

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Posting Team: Content Details (for status history)
app.get('/api/posting/content/:id', requireRoles(POSTING_ROLES), async (req, res) => {
    const { id } = req.params;
    const { asOfDate } = req.query;
    try {
        const [itemRes, logsRes] = await Promise.all([
            supabase.from('content_items').select(`*, clients (company_name)`).eq('id', id).single(),
            supabase.from('status_logs').select(`*, users:changed_by (name, role_identifier)`).eq('item_id', id).order('changed_at', { ascending: false })
        ]);

        if (itemRes.error) return res.status(500).json({ error: itemRes.error.message });

        const transformedItem = await applyHistoricalStatus(itemRes.data, asOfDate);
        res.json({ item: transformedItem, currentItem: itemRes.data, history: logsRes.data || [] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/posting/content/:id/status', requireRoles(POSTING_ROLES), async (req, res) => {
    const { id } = req.params;
    const { new_status, note, changed_by } = req.body;
    try {
        const { data: item, error: fetchError } = await supabase.from('content_items').select('status, content_type').eq('id', id).single();
        if (fetchError || !item) return res.status(404).json({ error: 'Item not found' });

        const { error: updateError } = await supabase.from('content_items').update({ status: new_status, updated_at: new Date().toISOString() }).eq('id', id);
        if (updateError) return res.status(500).json({ error: 'Failed to update status' });

        await supabase.from('status_logs').insert([{ item_id: id, old_status: item.status, new_status: new_status, note: note || null, changed_by: changed_by || req.user.id }]);
        res.json({ message: 'Status updated successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Posting Team: Mark as Posted (ONLY allowed transition)
app.patch('/api/posting/content/:id/post', requireRoles(POSTING_ROLES), async (req, res) => {
    const { id } = req.params;
    const { changed_by } = req.body;

    try {
        // Fetch current item
        const { data: item, error: fetchError } = await supabase
            .from('content_items')
            .select('status, content_type')
            .eq('id', id)
            .single();

        if (fetchError || !item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        // CRITICAL: Only allow WAITING FOR POSTING → POSTED
        if (item.status !== 'WAITING FOR POSTING') {
            return res.status(400).json({
                error: `Invalid transition. Current status is "${item.status}". Only items with "WAITING FOR POSTING" can be marked as posted.`
            });
        }

        // Update status to POSTED with timestamp
        const { error: updateError } = await supabase
            .from('content_items')
            .update({
                status: 'POSTED',
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (updateError) {
            return res.status(500).json({ error: 'Failed to update status' });
        }

        // Log the status change
        const { error: logError } = await supabase.from('status_logs').insert([{
            item_id: id,
            old_status: 'WAITING FOR POSTING',
            new_status: 'POSTED',
            changed_by: changed_by || null,
            note: 'Marked as posted by Posting Team'
        }]);

        if (logError) {
            console.error('[PostingTeam] Log error:', logError);
        }

        res.json({ message: 'Content marked as POSTED successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Posting Team: Undo Posted (Rollback)
app.post('/api/posting/content/:id/undo', requireRoles(POSTING_ROLES), async (req, res) => {
    const { id } = req.params;
    try {
        const { data: latestLog, error: logFetchError } = await supabase
            .from('status_logs')
            .select('*')
            .eq('item_id', id)
            .eq('new_status', 'POSTED')
            .order('changed_at', { ascending: false })
            .limit(1)
            .single();

        if (logFetchError || !latestLog) return res.status(404).json({ error: 'No recent posting history found' });

        const { error: revertError } = await supabase
            .from('content_items')
            .update({ status: 'WAITING FOR POSTING', updated_at: new Date().toISOString() })
            .eq('id', id);

        if (revertError) return res.status(500).json({ error: 'Failed to revert status' });

        await supabase.from('status_logs').delete().eq('log_id', latestLog.log_id);
        res.json({ message: 'Success', status: 'WAITING FOR POSTING' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── Notifications ───

// Send Notification (Admin or GM only)
app.post('/api/notifications/send', async (req, res) => {
    try {
        const { title, message, type, target } = req.body;
        const sender = req.user; // from authenticateUser
        const normalizedType = (type || 'INFO').toString().toUpperCase();

        if (!title || !message || !target?.type) {
            return res.status(400).json({ error: 'title, message and target are required' });
        }
        if (!['INFO', 'WARNING', 'URGENT'].includes(normalizedType)) {
            return res.status(400).json({ error: 'Invalid notification type' });
        }

        // Check sender role
        const { data: senderData, error: senderError } = await supabase
            .from('users')
            .select('role, role_identifier')
            .eq('user_id', sender.id)
            .single();

        if (senderError || !senderData) {
            return res.status(401).json({ error: 'Sender role not found' });
        }

        const senderRole = normalizeRole(senderData.role);
        const senderRoleIdentifier = normalizeRole(senderData.role_identifier);
        const isAdmin = senderRole === 'ADMIN';
        const isGM = senderRole === 'GENERAL MANAGER' || senderRole === 'GM' || senderRoleIdentifier === 'GM' || senderRoleIdentifier === 'GENERAL MANAGER';

        if (!isAdmin && !isGM) {
            return res.status(403).json({ error: 'Unauthorized to send notifications' });
        }

        const targetType = target.type.toString().toUpperCase();
        const targetValue = target.value;

        if (isGM) {
            if (targetType === 'ROLE') {
                const normalizedTargetRole = normalizeRole(targetValue);
                const allowedRoles = ['TEAM LEAD', 'POSTING TEAM'];
                if (!allowedRoles.includes(normalizedTargetRole)) {
                    return res.status(403).json({ error: 'GM can only notify Team Leads and Posting Team' });
                }
            } else if (targetType === 'ROLE_IDENTIFIER') {
                const normalizedIdentifier = normalizeRole(targetValue);
                if (!['TL1', 'TL2'].includes(normalizedIdentifier)) {
                    return res.status(403).json({ error: 'GM can only target TL1 or TL2 role identifiers' });
                }
            } else if (targetType === 'USER') {
                const { data: receiver } = await supabase
                    .from('users')
                    .select('role, role_identifier')
                    .eq('user_id', targetValue)
                    .single();
                const receiverRole = normalizeRole(receiver?.role);
                const receiverIdentifier = normalizeRole(receiver?.role_identifier);
                const allowedDirectTargets = receiverRole === 'TEAM LEAD'
                    || receiverRole === 'POSTING TEAM'
                    || ['TL1', 'TL2'].includes(receiverIdentifier);

                if (!allowedDirectTargets) {
                    return res.status(403).json({ error: 'GM can only message TL1/TL2/Posting Team users' });
                }
            } else if (targetType === 'ALL') {
                // Allowed for GM
            } else {
                return res.status(400).json({ error: 'Invalid target type' });
            }
        }

        // Insert Notification
        const { data: notification, error: notifError } = await supabase
            .from('notifications')
            .insert([{
                title,
                message,
                type: normalizedType,
                sender_id: sender.id
            }])
            .select()
            .single();

        if (notifError) {
            return res.status(500).json({ error: 'Failed to create notification', details: notifError.message });
        }

        // Determine Recipients
        let recipientQuery = supabase.from('users').select('user_id');
        if (targetType === 'ROLE') {
            const normalizedTargetRole = normalizeRole(targetValue);
            if (normalizedTargetRole === 'POSTING TEAM') {
                recipientQuery = recipientQuery.in('role', ['POSTING TEAM', 'POSTING_TEAM']);
            } else if (normalizedTargetRole === 'GENERAL MANAGER') {
                recipientQuery = recipientQuery.in('role', ['GENERAL MANAGER', 'GM']);
            } else {
                recipientQuery = recipientQuery.eq('role', normalizedTargetRole);
            }
        } else if (targetType === 'ROLE_IDENTIFIER') {
            recipientQuery = recipientQuery.eq('role_identifier', targetValue);
        } else if (targetType === 'USER') {
            recipientQuery = recipientQuery.eq('user_id', targetValue);
        } else if (targetType === 'ALL') {
            // keep default recipientQuery (all users)
        } else {
            return res.status(400).json({ error: 'Invalid target type' });
        }

        const { data: users, error: usersError } = await recipientQuery;
        if (usersError || !users.length) {
            return res.status(400).json({ error: 'No recipients found' });
        }

        // Insert Recipients
        const recipientInserts = users.map(u => ({
            notification_id: notification.notification_id,
            user_id: u.user_id
        }));

        const { error: recipError } = await supabase
            .from('notification_recipients')
            .insert(recipientInserts);

        if (recipError) {
            return res.status(500).json({ error: 'Failed to assign recipients', details: recipError.message });
        }

        res.json({ message: 'Notification sent successfully', notification });
    } catch (err) {
        console.error('Send notification error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get User Notifications
app.get('/api/notifications', async (req, res) => {
    try {
        const userId = req.user.id;

        const { data, error } = await supabase
            .from('notification_recipients')
            .select('id, is_read, read_at, notification_id, notifications(title, message, type, created_at, sender_id)')
            .eq('user_id', userId);

        if (error) {
            console.error('Failed to fetch notifications:', error);
            return res.status(500).json({ error: 'Failed to fetch notifications', details: error.message });
        }

        // Sort by notification created_at descending
        const sortedData = [...(data || [])].sort((a, b) => {
            const dateA = a?.notifications?.created_at ? new Date(a.notifications.created_at).getTime() : 0;
            const dateB = b?.notifications?.created_at ? new Date(b.notifications.created_at).getTime() : 0;
            return dateB - dateA;
        });

        res.json(sortedData);
    } catch (err) {
        console.error('Notification fetch error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Mark as Read
app.patch('/api/notifications/:id/read', async (req, res) => {
    try {
        const userId = req.user.id;
        const notificationId = req.params.id; // From URL, user gives the notification_id

        const { error } = await supabase
            .from('notification_recipients')
            .update({
                is_read: true,
                read_at: new Date().toISOString()
            })
            .eq('notification_id', notificationId)
            .eq('user_id', userId);

        if (error) {
            return res.status(500).json({ error: 'Failed to mark as read', details: error.message });
        }
        res.json({ message: 'Marked as read' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Unread Count
app.get('/api/notifications/unread-count', async (req, res) => {
    try {
        const userId = req.user.id;
        const { count, error } = await supabase
            .from('notification_recipients')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) {
            console.error('Failed to get unread count:', error);
            return res.status(500).json({ error: 'Failed to get unread count', details: error.message });
        }
        res.json({ count });
    } catch (err) {
        console.error('Unread count error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── Emergency Tasks ───
app.post('/api/emergency/:id/toggle', async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const resolvedRole = await getRequesterRole(req.user);

        if (!resolvedRole) {
            return res.status(403).json({ error: 'User profile not found' });
        }

        const allowed = ['ADMIN', 'GENERAL MANAGER', 'GM', 'COO'].includes(resolvedRole);
        if (!allowed) {
            return res.status(403).json({ error: 'Only Admin, GM, and COO can toggle emergency status' });
        }

        // Get current state
        const { data: item, error: fetchErr } = await supabase
            .from('content_items')
            .select('is_emergency')
            .eq('id', id)
            .single();

        if (fetchErr) return res.status(500).json({ error: fetchErr.message });

        const newState = !item.is_emergency;
        const updateData = {
            is_emergency: newState,
            emergency_marked_by: newState ? userId : null,
            emergency_marked_at: newState ? new Date().toISOString() : null
        };

        const { error } = await supabase
            .from('content_items')
            .update(updateData)
            .eq('id', id);

        if (error) return res.status(500).json({ error: error.message });
        res.json({ success: true, is_emergency: newState });
    } catch (err) {
        console.error('Emergency toggle error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Emergency API: All emergency items (Role-Aware)
app.get('/api/emergency/all', authenticateUser, async (req, res) => {
    try {
        const resolvedRole = await getRequesterRole(req.user);
        const userId = req.user.id;

        let query = supabase
            .from('content_items')
            .select('*, clients(company_name, team_lead_id)')
            .eq('is_emergency', true);

        // Role-completion filtering
        if (resolvedRole === 'PRODUCTION HEAD') {
            query = query.not('status', 'in', '("WAITING FOR APPROVAL","APPROVED","WAITING FOR POSTING","POSTED")');
        } else {
            query = query.not('status', 'eq', 'POSTED');
        }

        // Team Lead scoping
        if (resolvedRole === 'TEAM LEAD') {
            const { data: clients, error: clientError } = await supabase
                .from('clients')
                .select('id')
                .eq('team_lead_id', userId);
            
            if (clientError) throw clientError;
            const clientIds = clients.map(c => c.id);
            if (clientIds.length === 0) return res.json([]);
            query = query.in('client_id', clientIds);
        }

        const { data, error } = await query.order('scheduled_datetime');
        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('[Emergency API] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// New Endpoint: Pending Important Tasks (Overdue & Today)
app.get('/api/dashboard/pending-important', authenticateUser, async (req, res) => {
    try {
        const resolvedRole = await getRequesterRole(req.user);
        const userId = req.user.id;
        
        const now = new Date();
        const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

        let query = supabase
            .from('content_items')
            .select('*, clients(company_name, team_lead_id)')
            .lte('scheduled_datetime', endDate);

        // Role-completion filtering
        if (resolvedRole === 'PRODUCTION HEAD') {
            query = query.not('status', 'in', '("WAITING FOR APPROVAL","APPROVED","WAITING FOR POSTING","POSTED")');
        } else {
            query = query.not('status', 'eq', 'POSTED');
        }

        // Team Lead scoping
        if (resolvedRole === 'TEAM LEAD') {
            const { data: clients, error: clientError } = await supabase
                .from('clients')
                .select('id')
                .eq('team_lead_id', userId);
            
            if (clientError) throw clientError;
            const clientIds = clients.map(c => c.id);
            if (clientIds.length === 0) return res.json([]);
            query = query.in('client_id', clientIds);
        }

        const { data, error } = await query.order('scheduled_datetime', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('[Pending Important API] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/emergency/all', authenticateUser, async (req, res) => {
    try {
        const resolvedRole = await getRequesterRole(req.user);
        const userId = req.user.id;

        let query = supabase
            .from('content_items')
            .select('*, clients(company_name, team_lead_id)')
            .eq('is_emergency', true);

        // Role-completion filtering
        if (resolvedRole === 'PRODUCTION HEAD') {
            query = query.not('status', 'in', '("WAITING FOR APPROVAL","APPROVED","WAITING FOR POSTING","POSTED")');
        } else {
            query = query.not('status', 'eq', 'POSTED');
        }

        // Team Lead scoping
        if (resolvedRole === 'TEAM LEAD') {
            const { data: clients, error: clientError } = await supabase
                .from('clients')
                .select('id')
                .eq('team_lead_id', userId);
            
            if (clientError) throw clientError;
            const clientIds = clients.map(c => c.id);
            if (clientIds.length === 0) return res.json([]);
            query = query.in('client_id', clientIds);
        }

        const { data, error } = await query.order('scheduled_datetime', { ascending: true });
        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('[Emergency All API] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/emergency/today', async (req, res) => {
    try {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const dayStart = `${yyyy}-${mm}-${dd}T00:00:00`;
        const dayEnd = `${yyyy}-${mm}-${dd}T23:59:59`;

        const { data, error } = await supabase
            .from('content_items')
            .select(`*, clients (company_name)`)
            .eq('is_emergency', true)
            .order('scheduled_datetime');

        if (error) return res.status(500).json({ error: error.message });
        const activeEmergencyTasks = (data || []).filter(
            (item) => (item.status || '').toUpperCase() !== 'POSTED'
        );
        res.json(activeEmergencyTasks);
    } catch (err) {
        console.error('Emergency today error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/emergency/month', async (req, res) => {
    try {
        const { month } = req.query;
        if (!month) return res.status(400).json({ error: 'Missing month parameter (YYYY-MM)' });

        const [year, mon] = String(month).split('-');
        const startDate = `${year}-${mon}-01T00:00:00`;
        const lastDay = new Date(parseInt(year), parseInt(mon), 0).getDate();
        const endDate = `${year}-${mon}-${String(lastDay).padStart(2, '0')}T23:59:59`;

        const { data, error } = await supabase
            .from('content_items')
            .select(`*, clients (company_name)`)
            .eq('is_emergency', true)
            .gte('scheduled_datetime', startDate)
            .lte('scheduled_datetime', endDate)
            .order('scheduled_datetime');

        if (error) return res.status(500).json({ error: error.message });
        const activeEmergencyTasks = (data || []).filter(
            (item) => (item.status || '').toUpperCase() !== 'POSTED'
        );
        res.json(activeEmergencyTasks);
    } catch (err) {
        console.error('Emergency month error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── Public: Client Onboarding Submission ───
app.post('/api/onboarding/submit', async (req, res) => {
    const { full_name, email, phone_number } = req.body;
    if (!full_name || !email) {
        return res.status(400).json({ error: 'Full name and email are required.' });
    }

    try {
        // Check if email already exists in onboarding_requests
        const { data: existing } = await supabase
            .from('onboarding_requests')
            .select('id')
            .eq('email', email)
            .eq('status', 'PENDING')
            .single();

        if (existing) {
            return res.status(400).json({ error: 'You already have a pending application with this email.' });
        }

        const { data, error } = await supabase
            .from('onboarding_requests')
            .insert([{
                full_name,
                email,
                phone_number: phone_number || '',
                status: 'PENDING'
            }]);

        if (error) throw error;
        res.json({ message: 'Application submitted successfully! Our team will review it shortly.' });
    } catch (err) {
        console.error('Onboarding submission error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── Admin: Onboarding Requests ───
app.get('/api/admin/onboarding-requests', requireRoles(ADMIN_ROLES), async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('onboarding_requests')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[Onboarding] Fetch error:', error.message);
            return res.status(500).json({ error: error.message });
        }

        // Normalize status to uppercase for frontend consistency
        const normalizedData = (data || []).map(req => ({
            ...req,
            status: (req.status || 'PENDING').toUpperCase()
        }));

        res.json(normalizedData);
    } catch (err) {
        console.error('[Onboarding] Crash:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/admin/onboarding-requests/:id/accept', requireRoles(ADMIN_ROLES), async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) return res.status(400).json({ error: 'Password is required to create client account' });

    try {
        // 1. Fetch request details
        const { data: request, error: fetchError } = await supabase
            .from('onboarding_requests')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !request) return res.status(404).json({ error: 'Onboarding request not found' });
        if (request.status === 'ACCEPTED') return res.status(400).json({ error: 'Request already accepted' });

        // 2. Create Supabase Auth User
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email: request.email,
            password: password,
            email_confirm: true,
            user_metadata: { role: 'CLIENT', name: request.full_name }
        });

        if (authError) {
            console.error(`[Onboarding] Auth creation error for ${request.email}:`, authError.message);
            return res.status(500).json({ error: authError.message });
        }

        // 3. Create record in public.users
        const { error: userError } = await supabase.from('users').insert([{
            user_id: authUser.user.id,
            name: request.full_name,
            email: request.email,
            password_hash: password,
            role: 'CLIENT',
            role_identifier: 'CLIENT'
        }]);

        if (userError) {
            console.error(`[Onboarding] DB insertion error for user ${request.email}:`, userError.message);
            await supabase.auth.admin.deleteUser(authUser.user.id);
            return res.status(500).json({ error: userError.message });
        }

        // 4. Create record in public.clients
        const { error: clientError } = await supabase.from('clients').insert([{
            company_name: request.full_name, // Using full_name as company name initially
            email: request.email,
            phone: request.phone_number,
            password_hash: password,
            is_active: true,
            is_deleted: false,
            batch_type: '1-1'
        }]);

        if (clientError) {
            console.error(`[Onboarding] DB insertion error for client ${request.email}:`, clientError.message);
            // Rollback auth and public.users record
            try {
                await supabase.auth.admin.deleteUser(authUser.user.id);
                await supabase.from('users').delete().eq('user_id', authUser.user.id);
            } catch (rollbackErr) {
                console.error('[Onboarding] Rollback failed:', rollbackErr.message);
            }

            // Provide specific error for duplicate company name which is common
            if (clientError.message.includes('unique_violation') || clientError.message.includes('already exists')) {
                return res.status(400).json({ error: `A client with company name "${request.full_name}" already exists.` });
            }
            return res.status(500).json({ error: clientError.message });
        }

        // 5. Update request status
        const { error: updateError } = await supabase
            .from('onboarding_requests')
            .update({ status: 'ACCEPTED' })
            .eq('id', id);

        if (updateError) {
            console.error(`[Onboarding] Status update error for request ${id}:`, updateError.message);
        }

        myCache.del("admin_clients");
        myCache.del("gm_clients");

        res.json({ message: 'Client onboarded successfully', client_email: request.email });

    } catch (error) {
        console.error(`[Onboarding] Crash during acceptance of ${id}:`, error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/onboarding-requests/:id/reject', requireRoles(ADMIN_ROLES), async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase
        .from('onboarding_requests')
        .update({ status: 'REJECTED' })
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Request rejected' });
});

// ─── System Settings ───
app.get('/api/settings', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('system_settings')
            .select('*');

        if (error) {
            if (error.code === '42P01') return res.json([]);
            return res.status(500).json({ error: error.message });
        }
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/admin/settings', requireRoles(ADMIN_ROLES), async (req, res) => {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'Key is required' });

    try {
        const { data, error } = await supabase
            .from('system_settings')
            .upsert([{ key, value, updated_at: new Date().toISOString() }], { onConflict: 'key' })
            .select();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        myCache.del(`setting_${key}`);
        res.json(data[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
