
with open(r'c:\Users\phani\Desktop\tracker-trueupmedia\graphify-out\GRAPH_REPORT.md', 'a', encoding='utf-8') as f:
    f.write("""
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
""")
