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
Enhanced the Admin Dashboard analytics by adding granular tracking for monthly deliverable progress. In addition to total Reels and Posts, the dashboard now tracks **Pending** and **Completed** status breakdowns.
- **Completed**: Defined as items in "WAITING FOR POSTING" or "POSTED" states.
- **Pending**: Defined as all other items in the current month's pipeline.

### Key Technical Decisions
1. **Granular Metric Calculation**:
   - Updated `AdminDashboard` to compute counts for:
     - Pending vs Completed totals for the month.
     - Breakdown of Pending Reels and Posts.
     - Breakdown of Completed Reels and Posts.
   - Calculations are derived from the standardized `calendarData` source of truth.

2. **UI/UX Enhancement**:
   - Expanded the `stats-grid` from 4 to 6 cards.
   - Added two new dedicated cards for **Pending** and **Completed** deliverables.
   - Included sub-labels (e.g., "12 R | 8 P") within these cards to provide at-a-glance category breakdowns without cluttering the main grid.
   - Utilized semantic coloring (Red/Danger for Pending, Green/Success for Completed) and distinct iconography.

### Affected Components
- **AdminDashboard (`frontend/src/app/admin/dashboard/page.tsx`)**: Updated `Stats` interface, data aggregation logic, and card grid UI.

## Recent Changes: Deliverable Metrics Indicators Enhancement (May 2026)
### Implementation Overview
Expanded granular deliverable metrics ("Number of Reels" and "Number of Posts") across the entire dashboard ecosystem. This enhancement adds specific count indicators (status pills) to all role-based calendars (Admin, GM, TL, COO, Posting), providing at-a-glance visibility into content production volume alongside existing workflow statuses.

### Key Technical Decisions
1. **Granular Status Aggregation**:
   - Updated `.reduce()` logic in all dashboard components to calculate `reels` and `posts` counts based on the `content_type` field ('Reel' or 'Post').
   - **Data Integrity**: Integrated `isDayInPeriod` filters into the reduction logic for all client-specific views (Admin Client Calendar, TL Dashboard, Posting Dashboard) to ensure counts accurately reflect the current 15-15 or calendar-month reporting window.

2. **UI/UX Standardization**:
   - Integrated `.status-pill-reels` (Orange/Warning) and `.status-pill-posts` (Green/Success) badges into the `status-summary-row` of all calendar views.
   - Standardized these pill styles across all role-specific CSS files (`admin.css`, `gm.css`, `tl.css`, `posting.css`) to maintain visual uniformity.

3. **Expanded Module Coverage**:
   - **Admin Dashboard & Master/Client Calendars**: Added metrics to the global master view and individual client calendars.
   - **GM & COO Dashboards**: Expanded status summary rows to include Reels/Posts totals.
   - **TL & Posting Dashboards**: Integrated summary pills above calendar grids for team lead and posting operator visibility.

### Affected Components
- **Admin Dashboards**: `frontend/src/app/admin/master-calendar/page.tsx`, `frontend/src/app/admin/client-calendar/[id]/page.tsx`.
- **GM Dashboard**: `frontend/src/app/gm/dashboard/page.tsx`.
- **COO Calendar**: `frontend/src/app/coo/master-calendar/page.tsx`.
- **TL Dashboard**: `frontend/src/app/tl/dashboard/page.tsx`.
- **Posting Dashboard**: `frontend/src/app/posting/dashboard/page.tsx`.
- **Style Sheets**: `admin.css`, `gm.css`, `tl.css`, `posting.css`.
708: 
709: ## Recent Changes: GM Dashboard Type Safety Fix (May 2026)
710: ### Implementation Overview
711: Resolved TypeScript "implicit any" errors in the General Manager dashboard's statistical calculation logic.
712: 
713: ### Key Technical Decisions
714: 1. **Explicit Typing**:
715:    - Explicitly typed the `item` parameter as `ContentItem` in `.filter()` and `.reduce()` callbacks within the `fetchDashboardStats` function.
716:    - This ensures type safety and eliminates build-time errors related to implicit `any` types.
717: 
718: ### Affected Components
719: - **GMDashboard (`frontend/src/app/gm/dashboard/page.tsx`)**: Fixed type annotations in dashboard stats aggregation logic.

## Recent Changes: Standardization of Role-Based Dashboard Metrics (May 2026)
### Implementation Overview
Completed the standardization of deliverable metrics across the General Manager (GM) and Team Lead (TL) dashboards to align with the Admin panel's reporting format. This ensures consistent tracking of monthly content production (Pending vs. Completed) across all leadership roles.

### Key Technical Decisions
1. **Universal Metric Logic**:
   - Implemented consistent "Completed" vs. "Pending" categorization across all dashboards.
   - **Completed**: WAITING FOR POSTING, POSTED.
   - **Pending**: All other pipeline statuses.
   - Added granular Reels (R) and Posts (P) breakdowns for both status categories.

2. **Role-Specific Scoping**:
   - **GM Dashboard**: Operates on global data (or filtered by client), mirroring the Admin panel's visibility.
   - **TL Dashboard**: Logic is strictly restricted to clients assigned to the logged-in Team Lead, ensuring data privacy and operational focus.

3. **UI/UX Alignment**:
   - Standardized the `stats-grid` layout to include dedicated cards for **Pending Deliverables** and **Completed Deliverables**.
   - Used semantic coloring (Red/Danger for Pending, Green/Success for Completed) and consistent icons (`Clock` and `Check`).
   - Integrated MTD (Month-To-Date) labels and total deliverable ratios (e.g., "15 / 20") for immediate context.

### Affected Components
- **GMDashboard (`frontend/src/app/gm/dashboard/page.tsx`)**: Updated stats state, aggregation logic, and dashboard grid UI.
- **TLDashboard (`frontend/src/app/tl/dashboard/page.tsx`)**: Enhanced `monthStatusCounts` reduction logic and updated the overview stats grid to mirror leadership metrics while maintaining assigned client scoping.

## Recent Changes: Client Password Authentication & Auth Integration (May 2026)
### Implementation Overview
Implemented a secure, password-based authentication system for clients created through the Admin panel. This enables clients to have their own credentials and log into the system with restricted dashboard access.

### Key Technical Decisions
1. **Integrated User Creation**:
   - Modified `POST /api/admin/clients` to automatically create a corresponding user in Supabase Auth and the `public.users` table with the `CLIENT` role.
   - Synchronized client data between the `clients` table and the `users` table using the email address as the linking identifier.

2. **Secure Password Management**:
   - Added a mandatory `password` field to the "Add Client" modal and an optional one to the "Edit Client" modal (for updates).
   - Passwords are stored in the `password_hash` column of both `clients` and `users` tables to maintain consistency with existing team member storage patterns, while the actual authentication is handled securely by Supabase Auth.

3. **Login Flow Expansion**:
   - Added the "Client" role option to the login page (`frontend/src/app/page.tsx`).
   - Updated the canonicalization logic to recognize the `client` role and redirect users to the appropriate dashboard path (`/client/dashboard`).

4. **Role Normalization**:
   - Updated the backend `getRequesterRole` and `requireRoles` logic to support the new `CLIENT` role and verify permissions.

### Affected Components
- **Backend API (`backend/index.js`)**: Updated `POST /api/admin/clients` and `PUT /api/admin/clients/:id` for user/auth sync; updated role normalization logic.
- **Client Management UI (`frontend/src/app/admin/clients/page.tsx`)**: Added password field to formData and modal.
- **Login Page (`frontend/src/app/page.tsx`)**: Added `client` role to selection and canonicalization.
- **API Client (`frontend/src/lib/api.ts`)**: Updated `Client` interface to include optional password field.

### Schema Adjustments (Manual Execution Required)
- **Enum Update**: Added `'CLIENT'` to the `user_role` type to allow client logins.
- **Client Table Update**: Added `updated_at` column to the `public.clients` table for tracking modifications and resolving sync errors.

## Recent Changes: Client Onboarding Module (May 2026)
### Implementation Overview
Introduced a new "Client Onboarding" module within the Admin dashboard to streamline the acquisition and management of new clients. This module provides a workflow for viewing registration requests, approving them with credential setup, or rejecting them.

### Key Technical Decisions
1. **Onboarding Workflow**:
   - **Request Storage**: Onboarding data is stored in the `onboarding_requests` table (fields: `full_name`, `email`, `phone_number`, `status`).
   - **Approval Mechanism**: Admins can approve a request by setting a mandatory password. This action triggers:
     - Creation of a Supabase Auth user.
     - Insertion of a record in the `public.users` table with the `CLIENT` role.
     - Insertion of a record in the `public.clients` table.
     - Updating the request status to `ACCEPTED`.
   - **Rejection Mechanism**: Allows admins to mark requests as `REJECTED`, preserving the audit trail without creating system accounts.

2. **Backend API Extensions**:
   - `POST /api/onboarding/submit`: **(NEW)** Public endpoint for prospective clients to submit their registration requests. Includes anti-duplication checks for pending requests.
   - `GET /api/admin/onboarding-requests`: Fetches all requests ordered by date.
   - `POST /api/admin/onboarding-requests/:id/accept`: Atomic-like operation handling Auth user creation, database sync, and status updates.
   - `POST /api/admin/onboarding-requests/:id/reject`: Simple status update for rejected leads.

3. **Premium UI/UX Implementation**:
   - **Public Onboarding Page**: **(NEW)** Created a premium, high-converting registration page at `/onboarding` for new clients. Features glassmorphism, responsive design, and instant submission feedback.
   - **Onboarding Page (Admin)**: Enhanced the admin dashboard for onboarding requests with robust status normalization (case-insensitive) to resolve filtering and interaction bugs.
   - **Search & Filter**: Integrated real-time search by name/email and status-based filtering (Pending, Accepted, Rejected).
   - **Onboarding Modal**: A focused modal for approval that emphasizes security by requiring password entry and providing clear feedback during the creation process.

### Affected Components
- **Backend API (`backend/index.js`)**: Added public submission endpoint; maintained existing admin endpoints.
- **Frontend API Library (`frontend/src/lib/api.ts`)**: Added `publicApi` for submissions and updated `adminApi` with onboarding methods.
- **Onboarding Page (`frontend/src/app/admin/onboarding/page.tsx`)**: Fixed case-sensitivity bugs in filtering, stats, and action buttons.
- **Public Onboarding Page (`frontend/src/app/onboarding/page.tsx`)**: New public-facing registration page.
- **Style Modules**: 
  - `onboarding.module.css`: Admin dashboard styles.
  - `onboarding_public.module.css`: **(NEW)** High-fidelity styles for the public application form.

## Recent Changes: Team Lead Authorization Fix (May 2026)
### Implementation Overview
Resolved a critical "403 Forbidden" error that prevented Team Leads from updating content statuses from their dashboard. This fix expands the authorization scope for content management endpoints to include the Team Lead role.

### Key Technical Decisions
1. **Role Expansion**:
   - Updated the `PATCH /api/gm/content/:id/status` endpoint to use `TL_ROLES` instead of `GM_ROLES`.
   - Since `TL_ROLES` is a superset of `GM_ROLES` (containing Team Lead, Admin, GM, and General Manager), this allows Team Leads to manage the content pipeline without removing access for higher management roles.

2. **Authorization Hardening**:
   - Added `requireRoles(TL_ROLES)` to the `POST /api/gm/content/:id/undo-status` endpoint.
   - This ensures that only authorized roles can revert status changes, closing a previous security gap where the endpoint lacked explicit role-based access control.

### Affected Components
- **Backend Entry Point (`backend/index.js`)**: Updated authorization middleware for status update and undo-status routes.

## Recent Changes: System Toggles & Feature Visibility (May 2026)
### Implementation Overview
Introduced a global "System Toggles" framework to allow administrators to manage feature visibility and system-wide behavior from a centralized dashboard. The first implementation controls the visibility of the "Company Calendar" across all dashboard roles.

### Key Technical Decisions
1. **Centralized Configuration Dashboard**:
   - Created a new **Admin Toggles** page (`/admin/toggles`) using a premium settings-card layout.
   - Utilizes `settingsApi` to interact with a backend `settings` table, storing key-value pairs for global configurations.

2. **Synchronized Role Sidebars**:
   - Integrated visibility checks into the sidebar navigation of all user roles: **Admin**, **General Manager (GM)**, **Team Lead (TL)**, and **Posting Team**.
   - **Persistence**: Sidebars fetch the `show_company_calendar` flag on component mount using `useEffect`, ensuring immediate synchronization with the admin's setting.

3. **Robust Type Handling**:
   - Implemented a standardized boolean check (`value === true || value === 'true'`) across all dashboard components. This ensures consistent UI behavior regardless of whether the backend stores the flag as a native boolean or a stringified value.

4. **Premium UX/UI**:
   - Implemented sleek toggle switches with smooth transitions.
   - Added interactive "Save" states with loading spinners and success banners to provide clear feedback to the administrator.

### Affected Components
- **Admin Panel**: `frontend/src/app/admin/layout.tsx` (Sidebar sync), `frontend/src/app/admin/toggles/page.tsx` (Management UI).
- **GM Dashboard**: `frontend/src/app/gm/dashboard/page.tsx` (Conditional nav rendering).
- **TL Dashboard**: `frontend/src/app/tl/dashboard/page.tsx` (Conditional nav rendering).
- **Posting Dashboard**: `frontend/src/app/posting/dashboard/page.tsx` (Conditional nav rendering).
- **API Library**: `frontend/src/lib/api.ts` (Added `settingsApi` support).

## Recent Changes: GM Dashboard Content Metrics Integration (May 2026)
### Implementation Overview
Integrated "Total Reels" and "Total Posts" metrics into the GM Dashboard overview to match the Admin Dashboard's reporting capabilities. This provides the General Manager with immediate visibility into the total volume of deliverables in the pipeline, alongside the existing status-based (Pending vs. Completed) metrics.

### Key Technical Decisions
1. **Extended State Management**:
   - Updated the `Stats` state interface in the GM Dashboard to include `reelsCount` and `postsCount` fields.
   - Initialized these fields to `0` to prevent layout shifts during initial load.

2. **Refined Data Aggregation**:
   - Enhanced the `fetchDashboardStats` logic to filter and count deliverables by `content_type` ('Reel' vs. 'Post') from the monthly `periodData` source.
   - Maintained consistency with the existing `isDayInPeriod` logic to ensure metrics are accurately scoped to the current reporting window.

3. **UI/UX Consistency**:
   - Expanded the `stats-grid` in the GM Dashboard with two new dedicated cards for **Total Reels** and **Total Posts**.
   - **Styling Alignment**: Used icons and colors consistent with the Admin Panel:
     - **Total Reels**: `Video` icon with an orange (`var(--warning)`) theme.
     - **Total Posts**: `FileText` icon with a cyan (`var(--accent-secondary)`) theme.
   - Maintained the premium glassmorphism design and responsive grid layout.

### Affected Components
- **GMDashboard (`frontend/src/app/gm/dashboard/page.tsx`)**: Updated `Stats` state, `fetchDashboardStats` aggregation logic, and dashboard overview grid UI.

## Recent Changes: Production Head Status Logic Update (May 2026)
### Implementation Overview
Fixed a critical issue where the "Mark Shoot Done" button was missing from the Production Head (PH) dashboard. This was caused by a status rename migration that changed "CONTENT READY" to "CONTENT APPROVED", but left hardcoded checks for the old status string in both the frontend and backend.

### Key Technical Decisions
1. **Frontend-Backend Alignment**:
   - Updated all logic in `backend/index.js` within the Production Head endpoints (`/api/ph/*`) to recognize and return the new `CONTENT APPROVED` status.
   - Updated the `Mark Shoot Done` validation to correctly target items in the `CONTENT APPROVED` state.
   - Fixed the `undo` endpoint to revert items back to `CONTENT APPROVED` instead of the deprecated `CONTENT READY`.

2. **UI/UX Consistency**:
   - Updated the Production Head dashboard (`frontend/src/app/ph/dashboard/page.tsx`) to display the button when an item's status is `CONTENT APPROVED`.
   - Updated tooltips, toast messages, and dashboard subtitles to reflect the "Approved for shooting" terminology, providing clearer context to the Production team.

### Affected Components
- **Backend Entry Point (`backend/index.js`)**: Updated `PH` routes for queue fetching, calendar views, status updates, and undo actions.
- **Production Head Dashboard (`frontend/src/app/ph/dashboard/page.tsx`)**: Updated status checks in the details modal, action buttons in the queue, and UI labels.

## Recent Changes: GM Dashboard Feature Visibility (May 2026)
### Implementation Overview
Temporarily hid the **"Company Calendar"** feature and its associated metrics from the General Manager (GM) dashboard as requested. This involved commenting out UI elements, navigation links, and optimizing background processing by disabling unused data calculations.

### Key Technical Decisions
1. **Granular UI Hiding**:
   - Commented out the **"Company's Calendar Progress"** section header and progress meter cards from the main GM dashboard view.
   - Disabled the **"Company Calendar"** link in the sidebar navigation to prevent accidental access while the feature is hidden.

2. **Performance Optimization**:
   - Commented out the data fetching and calculation logic for `companyStats` within `fetchDashboardStats`. This prevents unnecessary parallel API calls to `gmApi.getMasterCalendar` and local processing of large datasets (7-day offset logic), improving dashboard load times.

3. **Reversibility**:
   - Used standard commenting patterns (`{/* */}` in TSX and `/* */` in logic blocks) to ensure the feature can be easily restored by uncommenting the relevant blocks.

### Affected Components
- **GMDashboard (`frontend/src/app/gm/dashboard/page.tsx`)**: Commented out sidebar navigation link, `companyStats` calculation logic, and the dashboard progress section.

---

## Modification Log - 2026-05-05 (2)

### Changes Made

1. **New Dashboard Metric: Weeks Pending**:
   - Added a `weeksPending` field to the `stats` state in the GM dashboard.
   - Implemented calculation logic in `fetchDashboardStats` to count tasks scheduled within the next 7 days that have not reached "WAITING FOR POSTING" or "POSTED" status.
   - Integrated `addDays` and `endOfDay` from `date-fns` for accurate date window calculations.

2. **Emergency Panel UI Enhancement**:
   - Updated the `emergency-panel` header to include a visually distinct "Weeks Pending" badge.
   - Applied styling in `gm.css` for the `.weeks-pending-badge` with a premium aesthetic (glassmorphism-lite, subtle glow, and appropriate semantics).
   - Adjusted header layout using `justify-content: space-between` to balance the panel title and the new metric.

### Affected Components
- **GMDashboard (`frontend/src/app/gm/dashboard/page.tsx`)**: Added state, logic, and UI for `weeksPending`.
- **Dashboard Styles (`frontend/src/app/gm/dashboard/gm.css`)**: Added badge styling and layout refinements.

## Recent Changes: GM Dashboard Deliverable Quotas Tracking (May 2026)
### Implementation Overview
Upgraded the General Manager (GM) Dashboard to provide granular, real-time tracking of content deliverable progress against monthly quotas. This transition moves from simple count reporting to a comprehensive "Items on Calendar / Quota Assigned" visualization for both Reels and Posts.

### Key Technical Decisions
1. **Granular deliverable aggregation**:
   - Updated `monthStatusCounts` calculation logic to distinguish between total scheduled content and completed deliverables.
   - **Completed Definition**: Content items in `WAITING FOR POSTING` or `POSTED` status.
   - **Quota Integration**: Integrated `reels_per_month` and `posts_per_month` from the `clients` table into the dashboard logic.

2. **Unified Progress Visualization**:
   - Implemented a standardized display format: `[Items on Calendar] / [Quota]` across the dashboard.
   - Added completion tracking as a secondary metric: `([Completed] Done)` or `[Completed] Completed`.
   - Applied this format to both the **Top-Level Status Pills** (summary row) and the **Primary Stat Cards** (overview grid).

3. **Global vs. Individual Scoping**:
   - The aggregation logic seamlessly handles both single-client views and the "All Clients" (Master/Company) view, summing quotas and progress across the entire client portfolio for GMs.

4. **Code Consistency**:
   - Centralized the `isItemCompleted` helper within the component scope to ensure uniform status detection across all metric calculations.

### Affected Components
- **GMDashboard (`frontend/src/app/gm/dashboard/page.tsx`)**: Updated `monthStatusCounts`, `assignedTotals`, status pills, and stat card rendering logic.

## Recent Changes: Calendar PDF Export Full-Month Fix (May 2026)
### Implementation Overview
Fixed the `ScheduleExport` component so that the downloaded PDF calendar always renders the **full calendar month** (1st to last day), regardless of whether the client uses a `1-1` or `15-15` billing cycle. Previously, 15-15 clients would only see half the month in the exported PDF (either 1–15 or 15–next-15), causing incomplete calendar downloads.

### Key Technical Decisions
1. **Unified Period Calculation**:
   - Replaced the conditional `isBiMonthly` period logic with unconditional `startOfMonth(month)` / `endOfMonth(month)`.
   - This ensures the calendar grid, weekly analysis table, and total content count all span the entire month.

2. **Label & Filename Simplification**:
   - Period label now always shows `MMMM yyyy` (e.g., "MAY 2026") instead of the confusing "Mid-Cycle" label.
   - Filename is simplified to `ClientName_Schedule_MMM_yyyy.pdf`.

3. **Preserved Batch Type Display**:
   - The "Schedule Type" field in the PDF info bar still correctly displays "15/15 BATCHING" or "MONTHLY EXECUTION" based on the client's `batch_type` prop.

4. **Cleanup**:
   - Removed unused `addMonths` and `isSameMonth` imports from `date-fns`.
   - Eliminated the `isBiMonthly` variable entirely.

### Affected Components
- **ScheduleExport (`frontend/src/components/ScheduleExport.tsx`)**: Refactored period calculation, label, filename, and cleaned up unused imports.

<<<<<<< Updated upstream
---

## Recent Changes: Production Head Dashboard UI Alignment & Premium Aesthetic (May 2026)
### Implementation Overview
Resolved a critical layout bug in the Production Head dashboard where the content was shifted significantly to the right. The issue was caused by nested layout containers, both providing a 280px sidebar margin. Additionally, upgraded the dashboard to a premium "Pro Max" aesthetic with glassmorphism, dynamic gradients, and responsive layouts.

### Key Technical Decisions
1. **Layout Consolidation**:
   - Simplified `frontend/src/app/ph/layout.tsx` to a minimal pass-through component. This eliminated the redundant outer `.main-content` wrapper and sidebar, resolving the double-margin issue.
   - Centralized layout control within `frontend/src/app/ph/dashboard/page.tsx` to better manage the dynamic sidebar state and sub-view navigation (Shoot Queue, Client Production, Master Schedule).

2. **Premium Visual Overhaul**:
   - **Glassmorphism**: Implemented `backdrop-filter: blur(20px)` and semi-transparent backgrounds for the sidebar and modals.
   - **Modern Gradients**: Replaced flat colors with rich, linear gradients for stats cards (`.progress-meter-card`) and action buttons.
   - **Typography & Spacing**: Upgraded font sizes, weights, and letter-spacing for a high-end feel. Increased padding and margins for better white space.
   - **Micro-Animations**: Added entrance animations (`fadeInDown`) and smooth hover transitions for all interactive elements.

3. **Responsive Design Fixes**:
   - Refined the mobile experience by adding a dedicated `mobile-header-top` and a smooth slide-in sidebar.
   - Implemented a `max-width: 1600px` constraint for the main content area to prevent extreme stretching on ultra-wide monitors.

### Affected Components
- **ProductionHeadLayout (`frontend/src/app/ph/layout.tsx`)**: Removed redundant shell and sidebar.
- **ProductionHeadDashboard (`frontend/src/app/ph/dashboard/page.tsx`)**: Verified primary layout classes and structure.
- **Style Sheet (`frontend/src/app/ph/dashboard/ph.css`)**: Comprehensive upgrade of all layout, card, sidebar, and mobile styles.
=======
## Recent Changes: Employee Task System Implementation (May 2026)
### Implementation Overview
Implemented a dedicated "Employee" role and task management system to streamline daily execution for content teams. This system allows Production Heads to delegate specific tasks to employees without cluttering the primary content production pipeline.

### Key Technical Decisions
1. **Independent Task Tracking**:
   - Added `assigned_to` (linking to employee users) and `employee_task_status` (`PENDING`, `COMPLETED`) fields to content items.
   - **Isolation**: Changes to `employee_task_status` are independent of the main production status (e.g., CONTENT APPROVED, WAITING FOR POSTING), ensuring operational oversight remains distinct from task execution.

2. **Production Head Delegation UI**:
   - Integrated a searchable employee assignment dropdown into the content details modal of the PH Dashboard.
   - Added real-time task status visibility for Production Heads to monitor employee progress directly from the calendar view.

3. **Dedicated Employee Dashboard**:
   - **Workspace**: Created a new `/employee/dashboard` with a premium card-based layout.
   - **Auto-Grouping**: Tasks are automatically grouped into "Overdue" and "Today's Assignments" based on the scheduled date.
   - **Single-Action Workflow**: Simplified task completion with a one-click toggle that updates the internal task status.

4. **Auth & Role Integration**:
   - Expanded the login system to support the `EMPLOYEE` role.
   - Updated the navigation system to provide role-specific sidebar layouts and permission-gated access to the employee workspace.

### Affected Components
- **API Client (`frontend/src/lib/api.ts`)**: Added `employeeApi` for task fetching/updating and updated `ContentItem` interface.
- **PH Dashboard (`frontend/src/app/ph/dashboard/page.tsx`)**: Implemented assignment logic and status indicators in the details modal.
- **Employee Dashboard (`frontend/src/app/employee/dashboard/page.tsx`)**: Created the primary interface for employee task management.
- **Employee Layout (`frontend/src/app/employee/layout.tsx`)**: Established the role-specific navigation and theme.
- **Login Page (`frontend/src/app/page.tsx`)**: Integrated role normalization and routing for employees.

## Recent Changes: Employee Task System Implementation (May 2026)
### Implementation Overview
Completed the integration of the **Employee Task System**, enabling Production Heads to assign tasks to specific employees and allowing employees to manage their daily workflow with historical tracking.

### Key Technical Decisions
1. **Isolated Task Management**:
   - Implemented `employee_task_status` in the `content_items` table, completely independent of the main production status flow (`status`).
   - This allows employees to mark tasks as COMPLETED without interfering with the content approval or posting pipeline.

2. **History & Dashboard Logic**:
   - **Dashboard**: Automatically groups tasks into "Overdue" (pending past date) and "Today" (assigned for the current date) for maximum focus.
   - **History View**: Added a dedicated History tab with a month picker (`YYYY-MM`) to fetch and display past assignments.
   - **Backend Optimization**: Modified `/api/employee/tasks` to accept an optional `month` parameter, fetching either the active dashboard view or a full month's history.

3. **Single Assignment Enforcement**:
   - Enforced a single-assignment model where each `content_item` can be assigned to exactly one employee via the `assigned_to` column (foreign key to `users.user_id`).

### Affected Components
- **Backend (`backend/index.js`)**: Updated `/api/employee/tasks` endpoint; verified `/api/ph/content/:id/assign` logic.
- **Frontend API (`frontend/src/lib/api.ts`)**: Updated `employeeApi` with month-based task retrieval.
- **Employee Dashboard (`frontend/src/app/employee/dashboard/page.tsx`)**: Implemented the dual-view (Today/History) interface and toggle logic.
- **Styles (`frontend/src/app/employee/dashboard/employee.css`)**: Added styles for the dashboard view toggle and history picker.

## Recent Changes: Employee Dashboard Type Safety & CSS Fix (May 2026)
### Implementation Overview
Resolved critical TypeScript build errors and CSS compatibility warnings in the Employee Dashboard. These fixes ensure a stable build process and consistent text rendering across different browsers.

### Key Technical Decisions
1. **API Data Sanitization**:
   - Implemented a mapping layer in `fetchDashboardTasks` and `fetchHistoryTasks` to ensure the `employee_task_status` field is never `undefined` or `null` before reaching the state.
   - Defaulted missing statuses to `'PENDING'` as confirmed by requirements, aligning with the `Task` interface and preventing `"not assignable"` errors.

2. **Strict Type Casting in State Updates**:
   - Explicitly typed the functional state update in `handleToggleStatus` as `(prev: Task[]): Task[]`.
   - Used explicit casting (`as 'PENDING' | 'COMPLETED'`) for the `newStatus` variable within the object spread to prevent TypeScript from widening the type to a generic `string`.

3. **Standardized CSS Truncation**:
   - Added the standard `line-clamp` property to the `.task-description` class in `employee.css`.
   - This follows auto-prefixing best practices, resolving the lint warning while maintaining cross-browser support for text truncation.

### Affected Components
- **Employee Dashboard (`frontend/src/app/employee/dashboard/page.tsx`)**: Fixed interface mismatches and functional state update types.
- **Employee Styles (`frontend/src/app/employee/dashboard/employee.css`)**: Added standard `line-clamp` property.
>>>>>>> Stashed changes
