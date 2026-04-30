# Graph Report - tracker.trueup  (2026-04-30)

## Corpus Check
- 78 files · ~268,503 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 218 nodes · 239 edges · 15 communities detected
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]

## God Nodes (most connected - your core abstractions)
1. `getClientBatchType()` - 11 edges
2. `fetchClientCalendar()` - 11 edges
3. `fetchMasterCalendar()` - 11 edges
4. `fetchDashboardData()` - 7 edges
5. `handleStatusUpdate()` - 6 edges
6. `handleToggleEmergency()` - 6 edges
7. `getPeriodLabel()` - 5 edges
8. `isDayInPeriod()` - 5 edges
9. `handleUndoStatus()` - 5 edges
10. `handleSubmit()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `handleResetPassword()` --calls--> `createClient()`  [INFERRED]
  frontend\src\app\page.tsx → frontend\src\utils\supabase\server.ts
- `POST()` --calls--> `createClient()`  [INFERRED]
  frontend\src\app\api\sync-password\route.ts → frontend\src\utils\supabase\server.ts
- `handleUpdatePassword()` --calls--> `createClient()`  [INFERRED]
  frontend\src\app\reset-password\page.tsx → frontend\src\utils\supabase\server.ts
- `middleware()` --calls--> `updateSession()`  [INFERRED]
  frontend\src\middleware.ts → frontend\src\utils\supabase\middleware.ts
- `handleLogin()` --calls--> `createClient()`  [INFERRED]
  frontend\src\app\page.tsx → frontend\src\utils\supabase\server.ts

## Hyperedges (group relationships)
- **Backend Migration System** — migrate_notes_script, migrate_notifications_script, migrate_poc_communications_script, migrate_roles_script, migrate_teams_script [INFERRED 0.90]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.22
Nodes (18): fetchClientCalendar(), fetchDashboardData(), fetchEmergencyTasks(), fetchMasterCalendar(), fetchTodayQueue(), fetchTodayStats(), getClientBatchType(), getDays() (+10 more)

### Community 1 - "Community 1"
Cohesion: 0.14
Nodes (14): fetchClients(), fetchDashboardStats(), fetchPocNotes(), fetchTeamLeads(), fetchUser(), handleAssignClient(), handleItemClick(), handleLogout() (+6 more)

### Community 2 - "Community 2"
Cohesion: 0.17
Nodes (8): fetchClientCalendar(), fetchClients(), fetchMasterCalendar(), fetchTeam(), handleAddClick(), handleDeleteClick(), handleStatusUpdate(), handleSubmit()

### Community 3 - "Community 3"
Cohesion: 0.21
Nodes (7): getPeriodLabel(), handleItemClick(), handleNext(), handlePrev(), handleToggleEmergency(), if(), isDayInPeriod()

### Community 4 - "Community 4"
Cohesion: 0.24
Nodes (6): canonicalizeRole(), handleLogin(), handleResetPassword(), handleUpdatePassword(), createClient(), POST()

### Community 5 - "Community 5"
Cohesion: 0.36
Nodes (6): fetchClients(), handleItemClick(), handleNext(), handlePrev(), handleToggleEmergency(), if()

### Community 6 - "Community 6"
Cohesion: 0.33
Nodes (2): getRequesterRole(), normalizeRole()

### Community 7 - "Community 7"
Cohesion: 0.47
Nodes (3): fetchClients(), handleDeleteClick(), handleSubmit()

### Community 8 - "Community 8"
Cohesion: 0.5
Nodes (2): loadRole(), normalizeRole()

### Community 9 - "Community 9"
Cohesion: 0.67
Nodes (2): checkUser(), handleLogout()

### Community 10 - "Community 10"
Cohesion: 0.5
Nodes (2): middleware(), updateSession()

### Community 62 - "Community 62"
Cohesion: 1.0
Nodes (1): System Requirements Specification

### Community 63 - "Community 63"
Cohesion: 1.0
Nodes (1): Supabase Skill

### Community 64 - "Community 64"
Cohesion: 1.0
Nodes (1): Postgres Best Practices

### Community 65 - "Community 65"
Cohesion: 1.0
Nodes (1): Application Logo

## Knowledge Gaps
- **4 isolated node(s):** `System Requirements Specification`, `Supabase Skill`, `Postgres Best Practices`, `Application Logo`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 6`** (7 nodes): `authenticateUser()`, `checkContentLimit()`, `getRequesterRole()`, `isMissingPocClientColumn()`, `index.js`, `normalizeRole()`, `requireRoles()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 8`** (5 nodes): `NotificationBell.tsx`, `loadRole()`, `markAsRead()`, `normalizeRole()`, `onSend()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 9`** (4 nodes): `layout.tsx`, `layout.tsx`, `checkUser()`, `handleLogout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 10`** (4 nodes): `middleware.ts`, `middleware.ts`, `middleware()`, `updateSession()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 62`** (1 nodes): `System Requirements Specification`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (1 nodes): `Supabase Skill`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 64`** (1 nodes): `Postgres Best Practices`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 65`** (1 nodes): `Application Logo`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getClientBatchType()` connect `Community 0` to `Community 1`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Why does `fetchClientCalendar()` connect `Community 0` to `Community 1`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **Why does `fetchMasterCalendar()` connect `Community 0` to `Community 1`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **What connects `System Requirements Specification`, `Supabase Skill`, `Postgres Best Practices` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._