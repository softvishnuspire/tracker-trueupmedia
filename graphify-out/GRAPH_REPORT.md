# GRAPH REPORT

## Latest Changes — 2026-05-19 (POC Communication Note Edit & Delete Feature)
- **Goal**: Implement editing, deleting, and change tracking/history for POC communication notes on both Team Lead and GM dashboards.
- **Affected Files**:
    - `backend/index.js`: Added `PUT /api/tl/poc-notes/:id` (with edit history logging) and `DELETE /api/tl/poc-notes/:id` endpoints.
    - `frontend/src/lib/api.ts`: Added `updatePocNote` and `deletePocNote` to `tlApi`, and added history/tracking fields to `PocNote` interface.
    - `frontend/src/app/tl/dashboard/page.tsx`: Modified the POC details modal to make the text field editable by default, rendering Save Changes and Delete Note buttons directly along with the edit history log.
    - `frontend/src/app/gm/dashboard/page.tsx`: Imported `tlApi`, modified the POC details modal to make the text field editable by default for GMs/Admins, rendering Save Changes and Delete Note buttons directly along with the edit history log.
- **System Impact**: Empowers Team Leads and GMs to edit notes directly upon opening them in the calendar view, providing a robust edit history and direct delete capability to prevent communication gaps.

## Latest Changes — 2026-05-19 (Admin Panel Employee Tracking UI Enhancement)
- **Goal**: Improve readability of the "RECENT TASKS" list in the Employee Tracking view within the Admin Panel.
- **Affected Files**:
    - `frontend/src/app/admin/employee-tracking/page.tsx`:
        - Updated `.list-header` CSS to increase font size from `9px` to `11px`, brighten the color to `#cbd5e1`, and add letter spacing.
        - Updated `.task-name` CSS to increase font size from `11px` to `13px` and brighten the color to pure white (`#ffffff`).
        - Updated `.task-client` CSS to increase font size from `9px` to `11px` and brighten the color to `#e2e8f0`.
- **System Impact**: Resolves visibility issues with the recent tasks list inside employee and team lead tracking cards, making the text significantly bigger and whiter for improved accessibility and user experience.

## Latest Changes — 2026-05-19 (Date/Time Picker Icon Visibility Fix)
- **Goal**: Fix invisible calendar and clock icons in date/time picker inputs across all dashboards (reschedule modal, edit content modal, etc.).
- **Affected Files**:
    - `frontend/src/app/gm/dashboard/gm.css`: Added `color-scheme: dark` and `::-webkit-calendar-picker-indicator` styles to `.form-input`.
    - `frontend/src/app/tl/dashboard/tl.css`: Same fix applied.
    - `frontend/src/app/coo/dashboard/coo.css`: Same fix applied.
    - `frontend/src/app/admin/admin.css`: Same fix applied, removed incorrectly duplicated `.form-input` block.
- **System Impact**: The `color-scheme: dark` property tells the browser to render native form controls (date/time pickers) with light-colored icons suitable for dark backgrounds, making the calendar and clock icons clearly visible.

## Latest Changes — 2026-05-19 (GM Dashboard UI Refinement)
- **Goal**: Remove specific operational tracking cards ("Posted", "Content Approved", "Designing In Progress") from the premium statistics grid in the General Manager (GM) Dashboard to streamline the interface and focus on core metrics.
- **Affected Files**:
    - `frontend/src/app/gm/dashboard/page.tsx`:
        - Removed the UI code blocks rendering the "Posted", "Content Approved", and "Designing In Progress" stat cards from the `.premium-stats-grid` container.
        - Refactored `activeStats` calculation to permanently use `globalMonthCounts` instead of swapping to `monthStatusCounts` when a client is selected, ensuring the top statistics cards always display global statistics across all clients.
        - Added 3 new client-specific progress tabs (Monthly Pipeline, Total Reels, Total Posts) to the `unified-status-list` inside the Operational Command Center to display specific client stats alongside Today, This Week, and This Month.
- **System Impact**: Cleans up the top-level GM Dashboard view by reducing the number of premium stats cards displayed from 7 to 4, effectively utilizing the CSS auto-fit grid layout to redistribute the remaining cards seamlessly.

## Latest Changes — 2026-05-18 (Special Day Poster Feature Implementation)
- **Goal**: Introduce the "Special Day Poster" feature allowing GMs and Admins to add on-demand special posters (for birthdays, anniversaries, etc.) that are exempt from pre-given standard poster targets, while ensuring visual premium rose theme styling and robust status/details modal flow compatibility.
- **Affected Files**:
    - `frontend/src/app/gm/dashboard/page.tsx`:
        - Added "Special Poster" to the content type filters dropdown.
        - Extended the Add Content modal form type selector with "Special Poster".
        - Mapped both `'Special Poster'` and `'Special Day Poster'` keys to the standard `'Post'` workflow status array inside both status timeline/advancement dictionaries to prevent modal detail selection crashes.
        - Sanitized CSS classes derived from item content type using `.toLowerCase().replace(/\s+/g, '-')` to prevent multi-word class name spacing issues (e.g., `.special-poster`).
    - `frontend/src/app/admin/client-calendar/[id]/page.tsx`:
        - Added "Special Poster" to the task type select dropdown field.
        - Mapped `'Special Poster'` and `'Special Day Poster'` keys to the `'Post'` workflow status flow in details timeline.
        - Sanitized desktop calendar cards, mobile dots, mobile agenda list item colors, and details modal type badges to use spaced-sanitized class names.
    - `frontend/src/app/admin/dashboard/page.tsx`:
        - Added "Special Poster" option in edit/add content form type select.
        - Mapped `'Special Poster'` and `'Special Day Poster'` keys to the `'Post'` status flow array in both timeline flow dictionaries.
        - Sanitized detail header type badges for safe CSS spacing.
    - `frontend/src/app/ph/dashboard/page.tsx`:
        - Mapped `'Special Poster'` and `'Special Day Poster'` keys to the `'Post'` workflow status flow dictionary.
        - Sanitized calendar grid content items and mobile dot class names.
    - `frontend/src/app/gm/dashboard/gm.css`, `frontend/src/app/ph/dashboard/ph.css`, `frontend/src/app/admin/admin.css`:
        - Appended beautiful rose/magenta theme styles (`.special-poster`, `.special-day-poster`) with distinct hover states, premium glassmorphism gradients, type badges, mobile dots, and agenda items to achieve visual excellence.
- **System Impact**: Perfectly integrates the Special Day Poster option across GM, PH, and Admin dashboards, allowing on-demand scheduling without target count constraints or system crashes.

## Previous Changes — 2026-05-18 (GM Dashboard Stats Alignment & 15-15 Cycle Synchronization)
- **Goal**: Align the premium statistics cards at the top of the GM Dashboard with the active client's calendar date boundary and batch cycle boundaries (standard 1-1 month vs. bi-monthly 15-15 cycle) when a client is selected, and fix the boundary-day timestamp cutoff in both GM and PH dashboards.
- **Affected Files**:
    - `frontend/src/app/gm/dashboard/page.tsx`:
        - Expanded `monthStatusCounts` reduction logic to track additional metrics: `posted`, `contentApprovedCount`, `designingInProgress`, and `shotPosts`.
        - Implemented an `activeStats` dynamic selector that switches context data source seamlessly (uses client-scoped `monthStatusCounts` when a client is filtered; defaults to system-wide `globalMonthCounts` when "All Clients" or global views are active).
        - Updated the top-level `.premium-stats-grid` cards to render values from `activeStats` instead of standard monthly `globalMonthCounts`.
        - Wrapped `periodStart` and `periodEnd` inside `isDayInPeriod` with `startOfDay` and `endOfDay` from `date-fns` to prevent timestamp cutoff errors on boundary days (e.g. June 15th).
    - `frontend/src/app/ph/dashboard/page.tsx`:
        - Imported `startOfDay` and `endOfDay` from `date-fns`.
        - Updated `isDayInPeriod` to use `startOfDay(periodStart)` and `endOfDay(periodEnd)` to align dates correctly and prevent boundary day cutoff.
- **System Impact**: Ensures perfect, real-time consistency between the top statistics panel, status pills, and the calendar views below it, resolving the mismatch (e.g. 6 posts vs. 5 posts on top) when viewing bi-monthly client cycles across both dashboards.

## Previous Changes — 2026-05-18 (PH Dashboard Calendar Cycle Fix)
- **Goal**: Resolve the issue where clients on a 15-15 calendar cycle were incorrectly displayed using a standard 1-1 monthly cycle in the Production Head (PH) dashboard.
- **Affected Files**:
    - `frontend/src/app/ph/dashboard/page.tsx`:
        - Implemented dynamic date bounds (`periodStart`, `periodEnd`) based on the client's `batch_type`.
        - Updated `fetchClientCalendar` and `fetchMasterCalendar` to automatically fetch and merge the current and next month's data if a 15-15 cycle is detected.
        - Adjusted `days` calculation and `getPeriodLabel` to correctly reflect the bi-monthly boundary.
- **System Impact**: Synchronizes the PH dashboard with the GM dashboard logic, ensuring accurate scheduling and visibility for bi-monthly clients.

## Previous Changes — 2026-05-18 (GM Dashboard Stats Tabs Visibility)
- **Goal**: Restrict the visibility of the premium statistics grid so that it only appears on the main "Dashboard Overview", reducing clutter on other views (like Master Calendar and Client Calendar).
- **Affected Files**:
    - `frontend/src/app/gm/dashboard/page.tsx`:
        - Wrapped the `.premium-stats-grid` block with a `view === 'dashboard'` conditional check.
- **System Impact**: Keeps the large, overarching statistical data focused on the main dashboard screen, allowing granular calendar views to remain clean and focused on task scheduling.

## Previous Changes — 2026-05-16 (GM Command Center Refinement)
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
