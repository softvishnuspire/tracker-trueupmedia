# GRAPH REPORT

## Latest Changes — 2026-05-12 (TL Dashboard Color Standardization)
- **Goal**: Align Team Lead (TL) dashboard calendar color scheme with GM dashboard for Posts and Reels.
- **Affected Files**:
    - `frontend/src/app/tl/dashboard/tl.css`: Updated `.content-item.post` (green → blue `#3b82f6`), `.content-item.reel` (yellow → purple `#a855f7`), and corresponding hover states. Also updated `.type-badge.post` and `.type-badge.reel` in the detail modal to use the same unified colors.

## System Impact
- **Visual Consistency**: TL calendar pills and type badges now match GM standard — Posts are blue, Reels are purple — across all calendar views (monthly, weekly, client, master).
- **No Logic Changes**: Only CSS class color values changed; no TSX/component logic was modified.
- **Scope**: Limited to `tl.css`. Admin, GM, COO, and PH stylesheets were not touched.

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
