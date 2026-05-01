# Graph Report - .  (2026-05-01)

## Corpus Check
- 122 files · ~263,712 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 199 nodes · 211 edges · 80 communities detected
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.83)
- Token cost: 10,000 input · 5,000 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Frontend Pages|Frontend Pages]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Backend Auth & API|Backend Auth & API]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Database Migrations|Database Migrations]]
- [[_COMMUNITY_Admin & Supabase Integration|Admin & Supabase Integration]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_User Management|User Management]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Notification System|Notification System]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]

## God Nodes (most connected - your core abstractions)
1. `fetchClients()` - 14 edges
2. `fetchClientCalendar()` - 11 edges
3. `fetchMasterCalendar()` - 11 edges
4. `handleToggleEmergency()` - 10 edges
5. `handleItemClick()` - 8 edges
6. `handleSubmit()` - 8 edges
7. `handleUndoStatus()` - 7 edges
8. `handleStatusUpdate()` - 7 edges
9. `handlePrev()` - 6 edges
10. `handleNext()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Supabase Skill` --describes--> `Supabase Client`  [INFERRED]
  skills/supabase/SKILL.md → frontend/src/utils/supabase/client.ts
- `middleware()` --calls--> `updateSession()`  [INFERRED]
  frontend\src\middleware.ts → frontend\src\utils\supabase\middleware.ts
- `handleLogin()` --calls--> `createClient()`  [INFERRED]
  frontend\src\app\page.tsx → frontend\src\utils\supabase\server.ts
- `handleAssignClient()` --calls--> `fetchClients()`  [EXTRACTED]
  frontend\src\app\gm\dashboard\page.tsx → temp_backup\page.tsx
- `init()` --calls--> `fetchClients()`  [EXTRACTED]
  frontend\src\app\tl\dashboard\page.tsx → temp_backup\page.tsx

## Hyperedges (group relationships)
- **Backend Migration System** — migrate_notes_script, migrate_notifications_script, migrate_poc_communications_script, migrate_roles_script, migrate_teams_script [INFERRED 0.90]

## Communities

### Community 0 - "Frontend Pages"
Cohesion: 0.23
Nodes (11): fetchDashboardStats(), fetchTeamLeads(), fetchUser(), getClientName(), handleAssignClient(), handleItemClick(), handleNext(), handlePrev() (+3 more)

### Community 1 - "Community 1"
Cohesion: 0.27
Nodes (6): fetchClients(), fetchTeam(), handleAddClick(), handleDeleteClick(), handleEditClick(), handleSubmit()

### Community 2 - "Community 2"
Cohesion: 0.39
Nodes (5): fetchDashboardData(), fetchEmergencyTasks(), handleSaveEdit(), handleStatusUpdate(), handleUndoStatus()

### Community 3 - "Community 3"
Cohesion: 0.57
Nodes (7): fetchClientCalendar(), fetchMasterCalendar(), fetchTodayQueue(), fetchTodayStats(), handleDeleteContent(), handleMarkPosted(), handleUndo()

### Community 4 - "Community 4"
Cohesion: 0.32
Nodes (6): fetchPocNotes(), handleLogout(), handlePocNoteClick(), handleSavePocNote(), init(), normalizeRole()

### Community 5 - "Backend Auth & API"
Cohesion: 0.4
Nodes (2): getRequesterRole(), normalizeRole()

### Community 6 - "Community 6"
Cohesion: 0.5
Nodes (3): canonicalizeRole(), handleLogin(), createClient()

### Community 7 - "Community 7"
Cohesion: 0.5
Nodes (2): loadRole(), normalizeRole()

### Community 8 - "Community 8"
Cohesion: 0.5
Nodes (2): middleware(), updateSession()

### Community 9 - "Community 9"
Cohesion: 0.67
Nodes (2): checkUser(), handleLogout()

### Community 10 - "Database Migrations"
Cohesion: 0.5
Nodes (4): Add Reschedule Column Script, Migrate Notes Script, Performance Migration Script, status_logs Table

### Community 11 - "Admin & Supabase Integration"
Cohesion: 0.5
Nodes (4): Admin Clients Page, API Library, Supabase Client, Supabase Skill

### Community 12 - "Community 12"
Cohesion: 0.67
Nodes (0): 

### Community 13 - "Community 13"
Cohesion: 0.67
Nodes (0): 

### Community 14 - "User Management"
Cohesion: 0.67
Nodes (3): Fix User Sync Script, Migrate Roles Script, users Table

### Community 15 - "Community 15"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "Community 16"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "Community 17"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Community 18"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Community 19"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Community 28"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (0): 

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (0): 

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (0): 

### Community 52 - "Notification System"
Cohesion: 1.0
Nodes (2): Notification Bell, Send Notification Modal

### Community 53 - "Community 53"
Cohesion: 1.0
Nodes (0): 

### Community 54 - "Community 54"
Cohesion: 1.0
Nodes (0): 

### Community 55 - "Community 55"
Cohesion: 1.0
Nodes (0): 

### Community 56 - "Community 56"
Cohesion: 1.0
Nodes (0): 

### Community 57 - "Community 57"
Cohesion: 1.0
Nodes (0): 

### Community 58 - "Community 58"
Cohesion: 1.0
Nodes (0): 

### Community 59 - "Community 59"
Cohesion: 1.0
Nodes (0): 

### Community 60 - "Community 60"
Cohesion: 1.0
Nodes (0): 

### Community 61 - "Community 61"
Cohesion: 1.0
Nodes (0): 

### Community 62 - "Community 62"
Cohesion: 1.0
Nodes (1): Check Schema Script

### Community 63 - "Community 63"
Cohesion: 1.0
Nodes (1): Backend Entry Point

### Community 64 - "Community 64"
Cohesion: 1.0
Nodes (1): Migrate Notifications Script

### Community 65 - "Community 65"
Cohesion: 1.0
Nodes (1): Migrate POC Communications Script

### Community 66 - "Community 66"
Cohesion: 1.0
Nodes (1): Migrate Teams Script

### Community 67 - "Community 67"
Cohesion: 1.0
Nodes (1): Check Data Scratch Script

### Community 68 - "Community 68"
Cohesion: 1.0
Nodes (1): Check Users Scratch Script

### Community 69 - "Community 69"
Cohesion: 1.0
Nodes (1): Database Seed Script

### Community 70 - "Community 70"
Cohesion: 1.0
Nodes (1): Database Test Script

### Community 71 - "Community 71"
Cohesion: 1.0
Nodes (1): Database Update Script

### Community 72 - "Community 72"
Cohesion: 1.0
Nodes (1): List All Users Script

### Community 73 - "Community 73"
Cohesion: 1.0
Nodes (1): Frontend Configuration

### Community 74 - "Community 74"
Cohesion: 1.0
Nodes (1): Admin Layout

### Community 75 - "Community 75"
Cohesion: 1.0
Nodes (1): COO Dashboard

### Community 76 - "Community 76"
Cohesion: 1.0
Nodes (1): GM Dashboard

### Community 77 - "Community 77"
Cohesion: 1.0
Nodes (1): System Requirements Specification

### Community 78 - "Community 78"
Cohesion: 1.0
Nodes (1): Postgres Best Practices

### Community 79 - "Community 79"
Cohesion: 1.0
Nodes (1): Application Logo

## Knowledge Gaps
- **27 isolated node(s):** `Add Reschedule Column Script`, `Check Schema Script`, `Backend Entry Point`, `Migrate Notes Script`, `Migrate Notifications Script` (+22 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 15`** (2 nodes): `addRescheduleColumn()`, `add_reschedule_column.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (2 nodes): `check_schema.js`, `check()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (2 nodes): `migrate_notes.js`, `migrate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (2 nodes): `migrate_notifications.js`, `migrate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (2 nodes): `migrate_poc_communications.js`, `run()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (2 nodes): `migrate_roles.js`, `migrate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (2 nodes): `migrate_teams.js`, `migrate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (2 nodes): `performance_migration.js`, `runPerformanceMigration()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (2 nodes): `scratch_check_data.js`, `checkClients()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (2 nodes): `seed.js`, `seed()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (2 nodes): `test_db.js`, `test()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (2 nodes): `update_db.js`, `updateSchema()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (2 nodes): `addNoteColumn()`, `add_column.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (2 nodes): `addNoteColumn()`, `add_note_column.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (2 nodes): `check_all_users.js`, `checkAllUsers()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (2 nodes): `check_any_logs.js`, `checkAllLogs()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (2 nodes): `check_id_sync.js`, `checkUsers()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (2 nodes): `check_invalid_logs.js`, `fixOldLogs()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (2 nodes): `check_latest_logs.js`, `checkLogs()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (2 nodes): `check_logs.js`, `checkLogs()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (2 nodes): `check_logs_data.js`, `checkLogs()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (2 nodes): `check_note_col.js`, `checkNote()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (2 nodes): `check_schema.js`, `checkSchema()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (2 nodes): `check_teaser_logs.js`, `checkItemLogs()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (2 nodes): `find_item_with_note.js`, `findItemWithNote()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (2 nodes): `fix_user_sync.js`, `syncUsers()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (2 nodes): `list_all_users.js`, `check()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (2 nodes): `migrate.js`, `migrate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (2 nodes): `layout.tsx`, `RootLayout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (2 nodes): `layout.tsx`, `PostingLayout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (2 nodes): `SendNotificationModal.tsx`, `handleSubmit()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (2 nodes): `SkeletonCard.tsx`, `SkeletonCard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (2 nodes): `ThemeToggle.tsx`, `ThemeToggle()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (2 nodes): `skeleton.tsx`, `Skeleton()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (2 nodes): `team-member-card.tsx`, `TeamMemberCard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (2 nodes): `utils.ts`, `cn()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (2 nodes): `createClient()`, `client.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Notification System`** (2 nodes): `Notification Bell`, `Send Notification Modal`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (1 nodes): `eslint.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (1 nodes): `next.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (1 nodes): `postcss.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (1 nodes): `tailwind.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (1 nodes): `loading.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (1 nodes): `loading.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (1 nodes): `loading.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (1 nodes): `loading.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (1 nodes): `api.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 62`** (1 nodes): `Check Schema Script`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (1 nodes): `Backend Entry Point`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 64`** (1 nodes): `Migrate Notifications Script`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 65`** (1 nodes): `Migrate POC Communications Script`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 66`** (1 nodes): `Migrate Teams Script`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 67`** (1 nodes): `Check Data Scratch Script`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 68`** (1 nodes): `Check Users Scratch Script`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 69`** (1 nodes): `Database Seed Script`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 70`** (1 nodes): `Database Test Script`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 71`** (1 nodes): `Database Update Script`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 72`** (1 nodes): `List All Users Script`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 73`** (1 nodes): `Frontend Configuration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 74`** (1 nodes): `Admin Layout`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 75`** (1 nodes): `COO Dashboard`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 76`** (1 nodes): `GM Dashboard`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 77`** (1 nodes): `System Requirements Specification`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 78`** (1 nodes): `Postgres Best Practices`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 79`** (1 nodes): `Application Logo`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `fetchClients()` connect `Community 1` to `Frontend Pages`, `Community 3`, `Community 4`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `handleToggleEmergency()` connect `Frontend Pages` to `Community 2`, `Community 3`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `handleSubmit()` connect `Community 1` to `Frontend Pages`, `Community 3`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `Add Reschedule Column Script`, `Check Schema Script`, `Backend Entry Point` to the rest of the system?**
  _27 weakly-connected nodes found - possible documentation gaps or missing edges._

## Recent Changes: Dashboard Reporting Standardization (April 2026)
### Implementation Overview
Standardized all dashboard performance metrics (Today, Week, Month progress meters, status breakdowns, and throughput) to a strict **calendar-month cycle** (1st through the last day) across all user roles (GM, TL, Admin, Posting, COO). This eliminates confusing bi-monthly UI reporting for clients on 15-15 billing cycles while maintaining backend operational integrity.

### Key Technical Decisions
1. **Simplified Frontend Data Fetching**:
   - Removed sequential/parallel multi-month API calls (fetching current and next month) from all dashboard components.
   - All dashboards now request a single month of data (`yyyy-MM` format) and aggregate it locally.
   - **Performance**: Significant reduction in API overhead and dashboard load times by eliminating 50% of redundant requests for bi-monthly clients.

2. **Standardized Period Helpers**:
   - Refactored `isDayInPeriod` and `getPeriodLabel` to ignore the client's `batch_type` in the frontend UI.
   - All progress meters now use `startOfMonth` and `endOfMonth` from `date-fns` for calculation boundaries.

3. **Separation of Concerns**:
   - **Frontend**: Reporting is purely calendar-based for simplicity and consistency.
   - **Backend**: Quota enforcement (`checkContentLimit`) remains on the 15-15 rolling cycle to ensure billing and operational compliance.

### Affected Components
- `GMDashboard`: Consolidated `fetchDashboardStats` and simplified period math.
- `AdminDashboard`: Normalised period labels and progress calculation.
- `TLDashboard`: Simplified master/client calendar fetching and POC note tracking.
- `PostingDashboard`: Standardized "Period Progress" and queue filtering.
- `COODashboard`: Removed bi-monthly branch logic from data fetching and aggregation.

## Recent Changes: Monthly Content Quota Enforcement
### Implementation Overview
Restored and re-implemented the server-side validation to enforce client-specific monthly limits for Posts, Reels, and YouTube content. This logic maintains the **15-15 rolling cycle** for operational quotas even while UI reporting is standardized to calendar months.

### Key Technical Decisions
1. **Restored Server-Side Validation Helper (`checkContentLimit`)**:
   - Re-implemented the utility in `backend/index.js` to calculate batch windows (Standard or 15-15) and count existing content items.
   - Respects `posts_per_month`, `reels_per_month`, and `youtube_per_month` defined in the `clients` table.
   - Uses UTC-based date boundaries to ensure consistency between server and database.

2. **Endpoint Integration**:
   - Integrated validation into `POST /api/gm/content` and `POST /api/admin/content`.
   - Returns `400 Bad Request` with a descriptive error message when limits are reached.

3. **Frontend Feedback**:
   - Caught and displayed backend validation errors in `handleAddContent` (Admin) and `handleSubmit` (GM Dashboard).

### Affected Components
- **Backend Entry Point (`backend/index.js`)**: Core logic and API enforcement.
- **AdminDashboard (`frontend/src/app/admin/client-calendar/[id]/page.tsx`)**: Error handling in creation flow.
- **GMDashboard (`frontend/src/app/gm/dashboard/page.tsx`)**: Error handling in creation flow.

## Recent Changes: Repository Sync and Conflict Resolution (May 2026)
### Implementation Overview
Successfully synchronized the local repository with remote updates while preserving critical local modifications. This involved resolving manual merge conflicts in the backend status flows and ensuring consistent dashboard logic across all roles.

### Key Technical Decisions
1. **Conflict Resolution in `backend/index.js`**:
   - Adopted the remote repository's standardized status names (`PENDING`, `CONTENT NOT STARTED`, `CONTENT APPROVED`) to align with the new bi-monthly migration logic.
   - Resolved conflicts in `STATUS_FLOWS` for Reels, Posts, and YouTube types.
   - Standardized `initial_status` to `PENDING` across all content creation endpoints.

2. **Preservation of Dashboard Enhancements**:
   - Verified that auto-merged changes in role-based dashboards (`Admin`, `COO`, `GM`, `TL`) correctly integrated local scrolling and reporting fixes with remote performance optimizations.

### Affected Components
- **Backend Entry Point (`backend/index.js`)**: Resolved status flow conflicts.
- **Role Dashboards**: Verified merged logic for Admin, COO, GM, TL, and Posting roles.
- **Graph Knowledge Base**: Updated `GRAPH_REPORT.md` to reflect current repository state.

## Recent Changes: Syntax Error Fix (May 2026)
### Implementation Overview
Fixed a critical build error in the General Manager dashboard that prevented the application from compiling. The issue was a syntax error in the `isDayInPeriod` function where a missing closing brace caused the entire component to fail parsing.

### Affected Components
- **GMDashboard (`frontend/src/app/gm/dashboard/page.tsx`)**: Fixed syntax error in `isDayInPeriod` helper function to restore build functionality.

## Recent Changes: Admin Dashboard Analytics Update (May 2026)
### Implementation Overview
Replaced the "Active Pipelines" metric in the Admin Dashboard with two granular metrics: **Number of Reels** and **Number of Posts** for the current month. This provides more actionable insights into content production volume per category.

### Key Technical Decisions
1. **Dynamic Metric Calculation**:
   - Updated `AdminDashboard` logic to calculate specific counts for Reels and Posts by filtering the existing `calendarData` (the single source of truth for the current month).
   - Metrics are computed on the fly within the `fetchDashboardData` function, ensuring they reflect both individual client selections and global views.

2. **UI/UX Enhancement**:
   - Replaced the aggregated "Active Pipelines" card with two distinct cards in the `stats-grid`.
   - Utilized descriptive icons (`Video` for Reels, `FileText` for Posts) and harmonious color schemes (Warning/Amber for Reels, Cyan for Posts) to enhance scannability.
   - Updated the loading skeleton states to accommodate the new card layout, maintaining a premium user experience during data fetching.

### Affected Components
- **AdminDashboard (`frontend/src/app/admin/dashboard/page.tsx`)**: Updated `Stats` interface, data fetching logic, and stats grid UI.