# GRAPH REPORT

## Latest Changes — 2026-06-09 (Posting Team Login Infinite Refresh Loop Fix)
- **Goal**: Resolve the infinite refresh loop and repetitive data-fetching glitches when logging in or navigating to the Posting Team dashboard.
- **Affected Files**:
    - `frontend/src/components/ui/TopProgressBar.tsx`
    - `frontend/src/components/ui/ToastProvider.tsx`
    - `frontend/src/app/posting/dashboard/page.tsx`
- **System Impact**: Memoizes `startLoading` and `stopLoading` callbacks in `PageLoadingProvider`, and memoizes the context value of `ToastProvider` to guarantee stable reference identities for hooks. In `posting/dashboard/page.tsx`, removes the unstable fetch functions from the main sync `useEffect` dependency array and limits the mount effect's execution to a single run. This completely resolves the cyclic rendering and data-fetching loop, restoring stability to the Posting Team dashboard.

## Previous Changes — 2026-06-09 (Production Head Client Calendar Infinite Refresh & Glitch Fix)
- **Goal**: Resolve the infinite data-fetching and page-refreshing loops in the Production Head dashboard and client calendar views.
- **Affected Files**:
    - `frontend/src/app/ph/dashboard/page.tsx`
- **System Impact**: Decouples the state-driven calendar data array lengths from the dependency arrays of `fetchTodayStats`, `fetchClientCalendar`, `fetchViewTaskClientCalendar`, and `fetchMasterCalendar` callbacks by using React `useRef` handles. Additionally, removes the redundant `fetchTodayStats()` invocation from the component mount `useEffect` to ensure that data fetches only occur dynamically according to the active panel view. This stops the cyclic race condition and restores smooth, glitch-free UI performance.

## Previous Changes — 2026-06-08 (Manager Role Implementation)
- **Goal**: Add a new user role called "Manager" that mirrors the features, permissions, and views of the "General Manager" (GM) role but is labeled as "Manager" in the UI.
- **Affected Files**:
    - `backend/index.js`
    - `backend/migrate_manager_role.js` [NEW]
    - `frontend/src/app/page.tsx`
    - `frontend/src/lib/api.ts`
    - `frontend/src/components/NotificationBell.tsx`
    - `frontend/src/components/SendNotificationModal.tsx`
    - `frontend/src/app/admin/team/page.tsx`
    - `frontend/src/app/coo/team/page.tsx`
    - `frontend/src/app/manager/` [NEW]
- **System Impact**: Integrates the "Manager" role globally across the authentication, client-side routing, notification permissions, and dashboard panels, while ensuring the independent route `/manager/dashboard` compiles correctly.

## Previous Changes — 2026-06-08 (Merge Conflict Resolution & Git Sync)
- **Goal**: Resolve git merge conflicts on GM dashboard (`frontend/src/app/gm/dashboard/page.tsx`) and clean-merge remote updates for the COO dashboard (`frontend/src/app/coo/dashboard/page.tsx`).
- **Affected Files**:
    - `frontend/src/app/gm/dashboard/page.tsx`
    - `frontend/src/app/coo/dashboard/page.tsx`
    - `graphify-out/GRAPH_REPORT.md`
- **System Impact**: Restores project compilation and synchronizes local development with remote repositories. Resolves lucide-react import conflicts for `Download` and `Loader2` in the GM dashboard. Re-aligns the COO dashboard with the upstream command center design while preserving all responsive assets (ToastProvider, TopProgressBar, and hooks).

## Previous Changes — 2026-06-08 (Optimistic UI & Double Loading Skeletons Refactoring)
- **Goal**: Implement optimistic UI updates with rollbacks, loading skeletons on first load, refreshing indicators/background revalidation, Mobile-Desktop responsive glassmorphism toast placement, and compilation/prerendering error fixes across calendars and dashboards.
- **Affected Files**:
    - `frontend/src/app/admin/client-calendar/[id]/page.tsx`
    - `frontend/src/app/coo/client-calendar/[id]/page.tsx`
    - `frontend/src/app/ph/dashboard/page.tsx`
    - `frontend/src/app/posting/dashboard/page.tsx`
- **System Impact**: Resolves client-calendar syntax issues by restoring missing closing `</div>` tags on calendar cards/grids. Adds missing `Loader2` imports from `'lucide-react'` in `ph/dashboard/page.tsx` to prevent ReferenceErrors. Cleans up deprecated local toast components in `posting/dashboard/page.tsx` in favor of centralized responsive, glassmorphic toast notification wrappers. Restores complete frontend compilation under Next.js production build (`npm run build`).

## Previous Changes — 2026-06-08 (GM Calendar Content Item Background Color Fix)
- **Goal**: Resolve the transparent background color issue for calendar content items (specifically YouTube and Pending tasks) in the General Manager (GM) panel client and master calendars.
- **Affected Files**:
    - `frontend/src/app/gm/dashboard/gm.css`
- **System Impact**: Defines high-contrast CSS rules for `.content-item.youtube` and `.content-item.pending` in `gm.css`, restoring the visual theme for these task types on the GM calendar views so they do not render with transparent backgrounds.

## Previous Changes — 2026-06-08 (URL Sync Loop & Auth Concurrent Lock Theft Fix)
- **Goal**: Resolve the React "Maximum update depth exceeded" and Supabase "Lock was released because another request stole it" runtime errors across role-based dashboards by decoupling the URL search parameters synchronization and the client auth check logic.
- **Affected Files**:
    - `frontend/src/app/gm/dashboard/page.tsx`
    - `frontend/src/app/ph/dashboard/page.tsx`
    - `frontend/src/app/posting/dashboard/page.tsx`
    - `frontend/src/app/tl/dashboard/page.tsx`
    - `frontend/src/app/content-head/dashboard/page.tsx`
- **System Impact**: Resolves infinite React state update loop errors during browser history synchronization by introducing a React useRef `latestState` to store the active dashboard parameters (`view`, `selectedClient`, `activeItemId`, `isDetailsOpen`). Decouples the popstate event listener dependency array, checking parameters safely without triggers. Also decouples Supabase auth (`auth.getUser()`) calls from component dependency loops to execute exactly once upon page initialization or component mount. This stops the simultaneous lock-theft and abort errors from competing calls to Supabase.

## Previous Changes — 2026-06-08 (Upstash Redis Caching Implementation)
- **Goal**: Implement high-performance Redis caching using Upstash Redis to reduce PostgreSQL database load, improve API response times, and prevent repeated execution of expensive queries for client calendars, master calendar, pending tasks, and dashboard analytics.
- **Affected Files**:
    - `backend/index.js`
- **System Impact**: Integrates a lightweight, native REST client wrapper for Upstash Redis with a 2-second timeout and 1-retry fallback. Automatically caches client calendars (`v1:client_calendar:{id}:{month}`) for 15 minutes, master calendars (`v1:master_calendar:{month}`) for 10 minutes, employee and manager pending dashboards (`v1:dashboard:...`) for 5 minutes, and operational stats/analytics (`v1:analytics:...`) for 5 minutes. Implements database mutation hooks (creates, edits, status updates, assignments, emergency toggles, and deletions) that automatically trigger cache invalidation for all affected cache keys, including employee pending task caches for both old and new assignees on task reassignments. Gracefully falls back to PostgreSQL with `[REDIS_WARNING]` logs if Redis is unreachable.

## Previous Changes — 2026-06-08 (Client Calendar Redirection & Browser Back Support)
- **Goal**: Make the client name clickable at the top of the task details modal across all role-based dashboards/calendars to redirect the user to that client's calendar view, and support browser "Back" navigation restoration.
- **Affected Files**:
    - `frontend/src/app/globals.css`
    - `frontend/src/app/admin/dashboard/page.tsx`
    - `frontend/src/app/admin/master-calendar/page.tsx`
    - `frontend/src/app/admin/company-calendar/page.tsx`
    - `frontend/src/app/admin/production-schedule/page.tsx`
    - `frontend/src/app/coo/dashboard/page.tsx`
    - `frontend/src/app/coo/master-calendar/page.tsx`
    - `frontend/src/app/coo/company-calendar/page.tsx`
    - `frontend/src/app/gm/dashboard/page.tsx`
    - `frontend/src/app/ph/dashboard/page.tsx`
    - `frontend/src/app/tl/dashboard/page.tsx`
    - `frontend/src/app/posting/dashboard/page.tsx`
    - `frontend/src/app/content-head/dashboard/page.tsx`
- **System Impact**: Integrates Link component routing for Admin/COO pages, and view/clientId state transitions for state-driven GM/PH/TL/Posting/Content Head pages. Synchronizes open details state (`taskId`) and active layout states (`view`, `clientId`) in URL search parameters across all pages, listening to browser `popstate` events to seamlessly restore open task cards and views on browser Back/Forward navigation. Prevents stripping `taskId` from previous history states when programmatically closing the modal to change views by introducing URL parameter guard conditions (checking if `viewParam === view` and `clientIdParam === selectedClient`) before executing `replaceState` across all state-driven dashboards (GM, PH, TL, Posting, and Content Head). Also fixes the browser Back popstate listener to ensure the details modal is opened if a `taskIdParam` exists in the URL but the modal was closed, even if `activeItem` already matches `taskIdParam` (since `activeItem` is retained in component state on view switches).

## Previous Changes — 2026-05-29 (Admin & COO Calendar Filters Overlap Fix)
- **Goal**: Fix the layout bug where calendar filters (Client and Type selectors) overflowed their container and overlapped the adjacent Schedule Export button on narrower/medium screen widths.
- **Affected Files**:
    - `frontend/src/app/admin/admin.css`
    - `frontend/src/components/ScheduleExport.tsx`
    - `frontend/src/app/coo/master-calendar/page.tsx`
    - `frontend/src/app/coo/company-calendar/page.tsx`
- **System Impact**: Resolves UI overlapping issues in the Admin and COO panel calendar headers. Sets the filter container's `min-width` to `320px` to guarantee sufficient space for two dropdowns (120px min-width each), filter icon, and spacers. Configures the Schedule Export button with `flex-shrink: 0` to prevent squishing. Allows proper wrapping under tight layouts.

## Previous Changes — 2026-05-28 (Merge Conflict Resolution & Calendar Emojis/Reschedule Consolidation)
- **Goal**: Resolve git merge conflicts in admin and COO calendar pages (`company-calendar`, `master-calendar`, `client-calendar`) to integrate both cross-month rescheduled visual styling (`[RM]` prefix) and `Special Poster` / `Special Day Poster` emoji prepends (`🎉 `).
- **Affected Files**:
    - `frontend/src/app/admin/company-calendar/page.tsx`
    - `frontend/src/app/admin/master-calendar/page.tsx`
    - `frontend/src/app/coo/client-calendar/[id]/page.tsx`
    - `frontend/src/app/coo/company-calendar/page.tsx`
    - `frontend/src/app/coo/master-calendar/page.tsx`
- **System Impact**: Restores project compilation by resolving all remaining git merge conflict blocks, ensuring all calendars display both the `[RM]` cross-month rescheduled markers and the `🎉 ` emojis.

## Previous Changes — 2026-05-28 (GM Mobile Sidebar, Backend Syntax, & Merge Conflict Resolves)
- **Goal**: Fix the GM panel mobile sidebar menu toggle, resolve backend startup syntax errors, and fix frontend compilation errors caused by git merge conflicts.
- **Affected Files**:
    - `frontend/src/app/gm/dashboard/page.tsx`:
        - Changed the class binding on `<aside>` from `open` to `mobile-open` when the sidebar is open on mobile views.
        - Resolved all git merge conflicts regarding imports, calendar list items styling/classNames, and mobile dot rendering blocks.
    - `backend/index.js`:
        - Consolidated both the `/api/gm/content/:id` and `/api/admin/content/:id` PUT endpoints to use the correct `fetchContentOrFreelancerItem` lookup and history-logging payloads while removing duplicate declarations (`existingItem`, `original_scheduled_datetime`, `data`, `error`) that triggered syntax errors during start.
- **System Impact**: Enables the backend Node.js server to start and the frontend Next.js app to compile without compilation errors, resolving the mobile sidebar visibility issue.

## Previous Changes — 2026-05-18 (Cross-Month Rescheduled Calendar Styling & Integration)
- **Goal**: Implement visual differentiation for cross-month rescheduled content items in all calendar views. Any task rescheduled to a different calendar month than its original scheduled date gets visually marked with the prefix `[RM]` and the orange color theme (`#f97316`) for enhanced visibility and operational clarity.
- **Affected Files**:
    - `frontend/src/utils/calendarUtils.ts`: Created helper utility `isCrossMonthRescheduled(item)` to centralize cross-month rescheduled logic.
    - `frontend/src/app/gm/dashboard/gm.css`, `frontend/src/app/admin/admin.css`, `frontend/src/app/posting/posting.css`: Added dedicated `.rescheduled-cross-month` definitions for both desktop calendar items (background, colors, borders, hover states) and mobile dot indicators to ensure high contrast and premium design.
    - `frontend/src/app/gm/dashboard/page.tsx`: Integrated `isCrossMonthRescheduled` in GM day grid items and mobile dots.
    - `frontend/src/app/coo/master-calendar/page.tsx`: Integrated `isCrossMonthRescheduled` in COO master calendar day grid items and mobile dots.
    - `frontend/src/app/coo/company-calendar/page.tsx`: Integrated `isCrossMonthRescheduled` in COO company calendar day grid items and mobile dots.
    - `frontend/src/app/coo/client-calendar/[id]/page.tsx`: Integrated `isCrossMonthRescheduled` in COO client calendar day grid items and mobile dots.
    - `frontend/src/app/admin/master-calendar/page.tsx`: Integrated `isCrossMonthRescheduled` in Admin master calendar day grid items and mobile dots.
    - `frontend/src/app/admin/company-calendar/page.tsx`: Integrated `isCrossMonthRescheduled` in Admin company calendar day grid items and mobile dots.
    - `frontend/src/app/admin/client-calendar/[id]/page.tsx`: Integrated `isCrossMonthRescheduled` in Admin client calendar day grid items and mobile dots.
- **System Impact**: Ensures a consistent visual cue, premium orange color coding, and label (`[RM]`) across all client, master, and company calendars (across GM, COO, and Admin views) when content is rescheduled to a different calendar month. Fully resolves transparency and styling discrepancies.

## Previous Changes — 2026-05-23 (Content Head Role Implementation)
- **Goal**: Implement the "Content Head" role to handle content review and approval (transitioning tasks from WAITING FOR APPROVAL to CONTENT APPROVED) along with a dedicated dashboard, client calendar, and master calendar.
- **Affected Files**:
    - `backend/index.js`:
        - Added `'CONTENT HEAD'` to `GM_ROLES` and `TL_ROLES` constants.
        - Updated `getRequesterRole` to normalize and resolve `'CONTENT HEAD'` role requests from token metadata or DB profile record.
    - `frontend/src/app/page.tsx`:
        - Added the `'content-head'` workspace role card to the login page roles list.
        - Mapped `'content_head'`, `'content-head'`, and `'content head'` variants to return `'content-head'` in `canonicalizeRole`.
    - `frontend/src/app/content-head/dashboard/page.tsx` [NEW]:
        - Created the main workspace dashboard component for the Content Head, supporting queue filtering (WAITING FOR APPROVAL & CONTENT APPROVED), client calendars, and master calendars.
        - Calculated dynamic period boundaries (standard monthly 1-1 vs bi-monthly 15-15) based on client batch cycles.
        - Implemented the top metrics grid cards for Monthly Pipeline, Reels, and Posts with `x/y` completion indicators based on Content Head approvals.
        - Designed task detail modals supporting inline approval (advancing status to `CONTENT APPROVED`) and undoing approval (reverting status to `WAITING FOR APPROVAL`).
    - `frontend/src/app/content-head/dashboard/content-head.css` [NEW]:
        - Added premium dark-theme layout, sidebar navigation, statistics ribbons, calendar grid, queue cards, and details dialog style definitions.
- **System Impact**: Integrates the Content Head approval step into the task lifecycle, allowing specialized review of posts and reels before they proceed to scheduling and production, complete with real-time statistics and historical logging.

## Previous Changes — 2026-05-21 (TL Dashboard Client Tasks Status Overview)
- **Goal**: Add client-wise task status breakdown grid/table to the TL Dashboard overview displaying progress according to each client's specific batch cycle (standard 1-1 vs bi-monthly 15-15).
- **Affected Files**:
    - `frontend/src/app/tl/dashboard/page.tsx`:
        - Updated `fetchMasterCalendar` to load adjacent months if `view === 'dashboard'` to support cross-month boundaries for bi-monthly clients.
        - Overrode the `clientId` query filter to be `undefined` (all clients) when `view === 'dashboard'` to prevent task counts from incorrectly dropping to 0 when navigating back from a single client calendar.
        - Reset `selectedClient` state to `'all'` when clicking "Dashboard Overview" in the sidebar navigation.
        - Calculated client-specific MTD task statistics (Reels, Posts, Shoot Done, Content Approved) using their specific date range boundaries.
        - Rendered a premium responsive table displaying client status metrics and a visual progress bar.
    - `frontend/src/app/tl/dashboard/tl.css`:
        - Added layout and theme-aware CSS styles for the overview table, client badges, metric badges, progress bars, and hover states.
- **System Impact**: Provides Team Leads with a client-by-client visual breakdown of scheduled tasks, approval rates, and posting completion directly on their dashboard overview, with robust navigation and state consistency.

## Previous Changes — 2026-05-19 (GM Dashboard Content Approved Metric Correction)
- **Goal**: Fix the "Content Approved" pill counter in the GM Dashboard returning 0 when a client only has Reels or YouTube videos scheduled (no Posts).
- **Affected Files**:
    - `frontend/src/app/gm/dashboard/page.tsx`: Updated `monthStatusCounts` and `globalMonthCounts` reduction logic to use the global `contentApprovedStatuses` array instead of artificially scoping the `acc.contentApproved` increment strictly to the `type === 'POST'` block.
- **System Impact**: Restores accurate "Content Approved" accumulation counts for the active client calendar view, reflecting global approval status across all task types including Reels and YouTube, bringing it in line with TL and PH dashboards.

## Previous Changes — 2026-05-19 (Bi-Monthly Dynamic Range Correction)
- **Goal**: Dynamically determine the bi-monthly range (15-to-15 cycle) based on whether the current date's day of the month is before or after the 15th, resolving discrepancies in "Shoot Done" counts in the GM, PH, and TL dashboards.
- **Affected Files**:
    - `frontend/src/app/gm/dashboard/page.tsx`: Updated `isBiMonthlyView` check to include the dashboard view, dynamically adjusted `periodStart`/`periodEnd` based on `currentMonth.getDate()`, and refactored client/master calendar fetches to retrieve the correct two-month window.
    - `frontend/src/app/ph/dashboard/page.tsx`: Applied the same dynamic range offsets and two-month client/master calendar fetch logic.
    - `frontend/src/app/tl/dashboard/page.tsx`: Updated `periodStart`/`periodEnd` range calculation and `fetchClientCalendar` to calculate and load the correct two-month interval.
- **System Impact**: Ensures that when selecting a 15-15 client, the active period dynamically aligns to the correct cycle (e.g. May 15 to June 15 if today is May 19, or April 15 to May 15 if today is May 10), reflecting accurate counts for all statistics cards and calendar items across GM, PH, and TL dashboards.

## Previous Changes — 2026-05-19 (Environment Variables Configuration)
- **Goal**: Configure environment variables for Supabase and the local API url across the frontend and backend.
- **Affected Files**:
    - `frontend/.env`: Added `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `NEXT_PUBLIC_API_URL`.
    - `frontend/.env.local`: Added identical keys for local Next.js development.
    - `backend/.env`: Added `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `PORT`.
- **System Impact**: Enables frontend components, API clients, and backend migration/utility scripts to authenticate and communicate with the Supabase database instance and the local backend server.

## Previous Changes — 2026-05-19 (Normal Task Colors & Special Day Poster Emoji Enhancements)
- **Goal**: Align the calendar design with the rule that normal tasks should not use red (which is reserved for emergency/rescheduled/pending tasks) and globally prepend a party blaster emoji (`🎉 `) to all "Special Poster" and "Special Day Poster" calendar content items.
- **Affected Files**:
    - `frontend/src/app/tl/dashboard/tl.css`, `frontend/src/app/ph/dashboard/ph.css`, `frontend/src/app/gm/dashboard/gm.css`, `frontend/src/app/coo/dashboard/coo.css`, `frontend/src/app/admin/admin.css`: Updated Reel colors to Pink (`#ec4899`) and YouTube to Purple (`#8b5cf6`) across calendar cards, mobile badges/dots, and status lists to completely remove normal-use Red.
    - `frontend/src/app/admin/client-calendar/[id]/page.tsx`, `frontend/src/app/admin/master-calendar/page.tsx`, `frontend/src/app/admin/company-calendar/page.tsx`, `frontend/src/app/admin/production-schedule/page.tsx`, `frontend/src/app/coo/client-calendar/[id]/page.tsx`, `frontend/src/app/coo/master-calendar/page.tsx`, `frontend/src/app/coo/company-calendar/page.tsx`, `frontend/src/app/tl/dashboard/page.tsx`, `frontend/src/app/ph/dashboard/page.tsx`, `frontend/src/app/gm/dashboard/page.tsx`, `frontend/src/app/posting/dashboard/page.tsx`, `frontend/src/app/employee/dashboard/page.tsx`: Globally prepended `🎉 ` to `'Special Poster'` and `'Special Day Poster'` content types in day cells, agenda modals, and active detail modals.
    - `frontend/src/app/employee/dashboard/page.tsx`: Added optional `assigned_at` field to the `Task` interface to resolve the TypeScript compiler error where `assigned_at` was referenced during date checks.
- **System Impact**: Establishes visual consistency with the new semantic rules, preventing user confusion by preserving red for system warnings and highlighting special days with a recognizable emoji.

## Previous Changes — 2026-05-19 (TL Dashboard Bi-Weekly Calendar Fix)
- **Goal**: Resolve issue where bi-weekly (15-to-15 cycle) client calendars in the Team Lead (TL) panel behaved like standard 1-to-1 month calendars (missing range calculations and not fetching next month's items).
- **Affected Files**:
    - `frontend/src/app/tl/dashboard/page.tsx`: 
        - Updated date utility imports to include `startOfDay` and `endOfDay`.
        - Added `isBiMonthlyView` check, and updated `periodStart`, `periodEnd`, and `days` interval ranges to reflect 15th-to-15th logic for `'15-15'` batch type.
        - Updated `fetchClientCalendar` to query next month's data and merge calendar items when client uses `'15-15'` cycle.
        - Filtered `filteredCalendarData` to the active bi-weekly range so stats match the active window.
- **System Impact**: Establishes correct bi-weekly calendar calculations and rendering in the TL dashboard panel, matching GM and Admin dashboard cycles.

## Previous Changes — 2026-05-19 (GM Dashboard Monthly Pipeline Calculation Update)
- **Goal**: Update the "MONTHLY PIPELINE" card in the Production Progress panel to display the number of posted/completed reels and posts in x/y format instead of shot reels and posts.
- **Affected Files**:
    - `frontend/src/app/gm/dashboard/page.tsx`: Updated numerator of the "MONTHLY PIPELINE" calculation to sum `completedReels` and `completedPosts`.
- **System Impact**: Ensures the Monthly Pipeline reflects real-time post completion rates across the dashboard.

## Previous Changes — 2026-05-19 (GM Dashboard Task Lifecycle Milestone Update)
- **Goal**: Replace the "SHOOT DONE" milestone tracker with "CONTENT APPROVED" in the Task Lifecycle sidebar section to monitor content approval rates rather than shoot status.
- **Affected Files**:
    - `frontend/src/app/gm/dashboard/page.tsx`: Updated `milestones` array configuration to track `'CONTENT APPROVED'` instead of `'SHOOT DONE'`.
- **System Impact**: Updates the first progress indicator in the General Manager's Task Lifecycle dashboard widget to show content approval metrics.

## Previous Changes — 2026-05-19 (Special Poster Type Definition Fix)
- **Goal**: Fix TypeScript compilation errors in the admin client calendar where comparisons of `item.content_type` with `'Special Poster'` and `'Special Day Poster'` were marked as invalid due to type narrowing.
- **Affected Files**:
    - `frontend/src/lib/api.ts`: Extended the union type for `content_type` on `ContentItem` to include `'Special Poster'` and `'Special Day Poster'`.
- **System Impact**: Resolves the IDE/build errors in the calendar components where custom special poster types are checked and stylized, allowing the TypeScript build to succeed without errors.

## Previous Changes — 2026-05-19 (Rescheduled Task Date & History Display)
- **Goal**: When a task has been rescheduled, show its original date and a complete list of previous reschedules in a history log inside the details modal.
- **Affected Files**:
    - `backend/index.js`: Updated PUT endpoints for content items and freelancer tasks to track `original_scheduled_datetime` and log all date modifications in a JSONB array `reschedule_history`.
    - `frontend/src/lib/utils.ts`: Created timezone-aware `formatIST` helper to display dates consistently in India Standard Time (`Asia/Kolkata`).
    - `frontend/src/lib/api.ts`: Updated frontend types to include `is_rescheduled`, `original_scheduled_datetime`, and `reschedule_history` properties.
    - `frontend/src/app/gm/dashboard/page.tsx`, `frontend/src/app/admin/dashboard/page.tsx`, `frontend/src/app/admin/client-calendar/[id]/page.tsx`, `frontend/src/app/admin/master-calendar/page.tsx`, `frontend/src/app/admin/company-calendar/page.tsx`, `frontend/src/app/coo/dashboard/page.tsx`, `frontend/src/app/coo/master-calendar/page.tsx`, `frontend/src/app/coo/company-calendar/page.tsx`, `frontend/src/app/coo/client-calendar/[id]/page.tsx`, `frontend/src/app/tl/dashboard/page.tsx`, `frontend/src/app/posting/dashboard/page.tsx`, `frontend/src/app/ph/dashboard/page.tsx`: Updated details modals to format dates in IST using `formatIST` and display the reschedule history list (with the 7-day display offset correctly applied in company calendars).
- **System Impact**: Provides clear traceability for task rescheduling across all user roles, ensuring transparent logs and precise date displays in IST timezone.

## Previous Changes — 2026-05-19 (GM Dashboard Cumulative Task Lifecycle & Production Progress Metrics)
- **Goal**: Correct the Task Lifecycle milestone statistics to use cumulative flow calculations, remove unnecessary time-based progress bars, and add a dedicated Shoot Done metric card to the Production Progress panel.
- **Affected Files**:
    - `frontend/src/app/gm/dashboard/page.tsx`:
        - Updated `shootDoneStatuses` to include `'WAITING FOR FINAL APPROVAL'` and exclude `'WAITING FOR APPROVAL'`.
        - Refactored `TASK LIFECYCLE` rendering to calculate and display cumulative pipeline statistics based on normalized status flows (`flows.REEL`, `flows.YOUTUBE`, `flows.POST`).
        - Replaced `TODAY`, `THIS WEEK`, and `THIS MONTH` progress cards in the `Production Progress` panel with a cumulative `SHOOT DONE` progress card.
- **System Impact**: Aligns task lifecycle metrics and progress bars with the actual pipeline flows, ensuring that tasks at later stages (like `POSTED`) are correctly counted towards earlier milestones (like `SHOOT DONE`).

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
