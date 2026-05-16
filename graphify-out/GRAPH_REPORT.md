# GRAPH REPORT

## Latest Changes — 2026-05-16 (GM Command Center Refinement)
- **Goal**: Improved the Operational Command Center by standardizing progress reporting and adding time-based metrics.
- **Affected Files**:
    - `frontend/src/app/gm/dashboard/page.tsx`:
        - Updated "Task Lifecycle" list to display counts in `X / Y` format with context-aware denominators.
        - Replaced "Production Status Breakdown" with a "Production Progress" section featuring Today, This Week, and This Month bars.
- **System Impact**: Enhances GM's ability to quickly assess production velocity and completion rates across different time horizons.

## Previous Changes — 2026-05-16 (GM Dashboard Stats Expansion)
- **Goal**: Expanded the GM Dashboard's global overview by adding three new metric cards: Posted, Content Approved, and Designing in Progress.
- **Affected Files**:
    - `frontend/src/app/gm/dashboard/page.tsx`: 
        - Enhanced `globalMonthCounts` logic to track system-wide totals for the new statuses.
        - Integrated 3 new premium stat cards into the top grid.
    - `frontend/src/app/gm/dashboard/gm.css`:
        - Updated `premium-stats-grid` to use `auto-fit` for responsive card wrapping (supporting 7+ cards).
        - Added distinct accent colors and styling for the new metric cards.
- **System Impact**: Provides more granular global visibility into the production pipeline, allowing GMs to track design progress and final posting status at a glance.

## Previous Changes — 2026-05-16 (PH Dashboard Cleanup)
- **Goal**: Simplified the Production Head (PH) dashboard by removing the "Production Status Overview" section as requested.
- **Affected Files**:
    - `frontend/src/app/ph/dashboard/page.tsx`: Removed the `dashboard-view` block containing the `Production Status Overview` card.
- **System Impact**: Reduces visual clutter on the main PH dashboard, focusing attention on emergency and pending important tasks.

## Previous Changes — 2026-05-16 (Statistical Accuracy & Logic Refinement)
- **Goal**: Corrected statistical discrepancies in the premium cards by refining the "Shot" vs "Done" status definitions and ensuring data is strictly derived from the calendar items.
- **Affected Files**:
    - `frontend/src/app/gm/dashboard/page.tsx`:
        - Refactored `isItemCompleted` to strictly include final posting stages (`POSTED`, `WAITING FOR POSTING`).
        - Updated `globalMonthCounts` to accurately count `total`, `shot`, and `done` items per content type.
        - Synchronized `fetchGlobalData` with the main dashboard refresh cycle to ensure real-time accuracy.
        - Implemented explicit monthly date filtering for global stats.
        - Resolved "used before declaration" TypeScript error for `fetchGlobalData`.
        - Applied standard CSS `line-clamp` property for cross-browser compatibility.
- **System Impact**: Establishes a reliable source of truth for GM oversight, with global stats that perfectly align with granular task progress.

## Previous Changes — 2026-05-16 (GM Dashboard Global Stats & Layout Update)
- **Goal**: Surfaced 4 premium statistics cards at the top of the dashboard as a global overview, decoupled from individual client filters.
- **Affected Files**:
    - `frontend/src/app/gm/dashboard/page.tsx`:
        - Repositioned the `premium-stats-grid` to the top of the `main-content` area, outside the Operational Command Center.
        - Implemented `globalCalendarData` and `fetchGlobalData` to calculate system-wide statistics for all clients independently of selected filters.
        - Refactored `globalAssignedTotals` to correctly aggregate production targets across the entire client base.
- **System Impact**: Provides a constant "System Health" overview at the top of the page, while maintaining granular controls in the sections below.

## Previous Changes — 2026-05-16 (Hybrid Dashboard/Master Filter Logic)
- **Goal**: Implement a hybrid filtering strategy where the Operational Command Center is restricted to single-client views, while the Master Calendar and POC views default to a global "All Clients" view.
- **Affected Files**:
    - `frontend/src/app/gm/dashboard/page.tsx`:
        - Updated Sidebar navigation to explicitly set `selectedClient` to `'all'` when entering Master/POC views, and to the first available client when returning to the Dashboard.
        - Restored `<option value="all">` only for Master Calendar and POC Communication filters.
        - Maintained restriction on the "All Clients" option within the Dashboard's Operational Command Center.
        - Restored logic guards and IIFE reduction logic in `assignedTotals` to support both global and scoped metrics.
- **System Impact**: Enhances operational flexibility by providing global visibility in specialized views while enforcing focused management in the main command center.

## Previous Changes — 2026-05-16 (GM Dashboard CSS Syntax Fix)
- **Goal**: Resolve "at-rule or selector expected" syntax errors in `gm.css` caused by unresolved git merge conflict markers.
- **Affected Files**:
    - `frontend/src/app/gm/dashboard/gm.css`: Removed git conflict markers and consolidated dropdown styling to maintain high contrast and accessibility.
- **System Impact**: Restored CSS validity, ensuring all styles are correctly parsed and applied to the GM dashboard.

## Previous Changes — 2026-05-15 (PH Dashboard Stats Simplification)
- **Goal**: Declutter the Production Head (PH) dashboard by removing redundant stats cards and consolidating monthly metrics into four key `x/y` cards.
- **Affected Files**:
    - `frontend/src/app/ph/dashboard/page.tsx`:
        - Refactored `monthStatusCounts` calculation to track `completed` vs `total` for Reels, Posts, and Shoots.
        - Replaced the 8 legacy stats cards with 4 unified cards: Monthly Pipeline, Reels Progress, Posts Progress, and Shoots Done.
        - Updated the `status-summary-row` to use the new metric property names, resolving TypeScript errors.
    - `frontend/src/app/ph/dashboard/ph.css`:
        - Updated `.posting-stats-grid` to support 4 columns on desktop and improved responsive wrapping for tablet/mobile.
        - Implemented comprehensive light mode support, fixing invisible text (page title, card labels) and adjusting card backgrounds for better readability.

## Latest Changes — 2026-05-15 (GM Dashboard Simplification & Stats Refactoring)
- **Goal**: Streamline GM dashboard by decluttering statistics and reordering panels for better operational visibility.
- **Key Updates**:
    - **Stats Consolidation**: Removed redundant stat cards (Clients, Scheduled, Pending, Completed).
    - **Simplified Metrics**: Implemented a 2-card ribbon showing "REELS x/y" and "POSTS x/y" using production-based completion boundaries.
    - **Data Accuracy**: Updated `isItemCompleted` to include 'SHOOT DONE' and 'DESIGNING COMPLETED' statuses.
    - **Layout Reorganization**: Surfaced statistics at the top; moved "Emergency Tasks" and "Pending Tasks" panels to the bottom.
- **Affected Files**:
    - `frontend/src/app/gm/dashboard/page.tsx`
    - `frontend/src/app/gm/dashboard/gm.css`

## Latest Changes — 2026-05-15 (PH Dashboard Client-wise Filtering & Stats Correction)
- **Affected Files**:
    - `frontend/src/app/ph/dashboard/page.tsx`:
        - Added a client selection dropdown to the main dashboard header.
        - Updated `fetchTodayStats` to filter master calendar data, pending tasks, and emergency tasks based on the selected client.
        - Refined "Completed" metrics for Today/Week stats to use actual production completion statuses (e.g., `SHOOT DONE`) instead of just `CONTENT READY`.
        - Corrected the "Monthly Pipeline" percentage calculation to reflect items that have been shot, aligning the UI label "Shot" with the underlying data.
        - Centralized production status constants (`contentApprovedStatuses`, `shootDoneStatuses`) for better maintainability.

## Previous Changes — 2026-05-15 (GM Dashboard Calendar Cycle Fix)
- **Goal**: Resolve the issue where clients on a 15-15 calendar cycle were incorrectly displayed using a standard 1-1 monthly cycle in the GM dashboard.
- **Affected Files**:
    - `frontend/src/app/gm/dashboard/page.tsx`: 
        - Refactored `periodStart` and `periodEnd` to dynamically calculate boundaries based on the client's `batch_type`.
        - Updated `fetchClientCalendar` and `fetchMasterCalendar` to fetch data across two months when a 15-15 cycle is detected.
        - Updated the calendar navigation header to display the explicit date range (e.g., "May 15 - Jun 15, 2024") for bi-monthly clients.
        - Ensured that dashboard statistics and the `ScheduleExport` component respect the client-specific batch cycle.

## Previous Changes — 2026-05-13 (GM Dashboard Dropdown Contrast Fix)
- **Goal**: Resolve visibility issues in the "Operational Command Center" client dropdown where text and background colors were too similar.
- **Affected Files**:
    - `frontend/src/app/gm/dashboard/gm.css`: Explicitly styled `option` elements for `.client-select-dropdown`, `.client-dropdown`, and `.form-input` to use `var(--bg-surface)` and `var(--text-primary)`. This ensures high contrast in both light and dark modes across all browsers. Also cleaned up inconsistent spacing in the unified dashboard CSS section.

## Previous Changes — 2026-05-12 (Production Calendar Visibility)
- **Goal**: Temporarily hide the "Production Calendar" (Master Production Schedule) from the Admin Panel to simplify the interface.
- **Affected Files**:
    - `frontend/src/app/admin/layout.tsx`: Commented out the 'Master Production Schedule' item from the `menuItems` array in the sidebar navigation. This removes the link from the sidebar, making the page inaccessible via the UI while keeping the underlying route and component logic intact.

## System Impact
- **Visibility**: The "Master Production Schedule" is no longer visible in the Admin sidebar.
- **Code Integrity**: No functional code was deleted; the change is limited to UI navigation visibility.


## Latest Changes — 2026-05-12 (GM Dashboard Undo Functionality Fix)
- **Goal**: Resolve "no history to undo" error in the GM panel and make the undo process seamless by automatically reverting to the previous status.
- **Affected Files**:
    - `backend/index.js`: Refactored the `/api/gm/content/:id/undo-status` route. Added a fallback mechanism that derives the previous status from the `STATUS_FLOWS` array if no entry exists in the `status_logs` table. This ensures the undo functionality works even if the historical record is missing.
    - `frontend/src/app/gm/dashboard/page.tsx`: Updated `handleUndoStatus` to remove the blocking `window.confirm()` dialog and the error alert, providing a faster and more intuitive "single-click" undo experience.

## System Impact
- **Robustness**: Undo functionality is no longer strictly dependent on the existence of `status_logs` entries, making the feature more reliable.
- **User Experience**: Improved the flow for GMs by removing unnecessary confirmation steps and providing a smoother transition when correcting status mistakes.

---

## Previous Changes — 2026-05-12 (TL Dashboard Color Standardization)
- **Goal**: Align Team Lead (TL) dashboard calendar color scheme with GM dashboard for Posts and Reels.
- **Affected Files**:
    - `frontend/src/app/tl/dashboard/tl.css`: Updated `.content-item.post` (green → blue `#3b82f6`), `.content-item.reel` (yellow → purple `#a855f7`), and corresponding hover states. Also updated `.type-badge.post` and `.type-badge.reel` in the detail modal to use the same unified colors.

## System Impact
- **Visual Consistency**: TL calendar pills and type badges now match GM standard — Posts are blue, Reels are purple — across all calendar views (monthly, weekly, client, master).
- **No Logic Changes**: Only CSS class color values changed; no TSX/component logic was modified.

---

## Previous Changes — 2026-05-12 (GM Dashboard Unified Command Center)
- **Goal**: Consolidate GM Dashboard metrics, filters, and production pipeline into a single unified "Operational Command Center" module to resolve data conflicts and visual fragmentation.
- **Affected Files**:
    - `frontend/src/app/gm/dashboard/page.tsx`: Unified state management and refactored the dashboard view into a single card-based module.
    - `frontend/src/app/gm/dashboard/gm.css`: Added comprehensive styles for the new unified dashboard layout.

## System Impact
- **Numerical Consistency**: Centralized metric calculation logic ensures that "Completed", "Pending", and "Scheduled" numbers match across all widgets.
- **Improved UX**: Eliminated redundant headers and split views, moving the client filter directly into the main module for a smoother workflow.
- **Contextual Progress**: Production pipeline now uses "Smart Denominators" (e.g., video-specific stages show progress relative only to video content), providing more accurate insights.
- **Performance**: Reduced redundant rendering by consolidating memoized calculations into the main state fetch.
