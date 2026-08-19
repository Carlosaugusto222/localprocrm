# Plan: Performance and Stability Optimization

Auditing and optimizing system performance, caching strategies, and data stability to ensure a world-class engineering standard.

## Proposed Changes

### 1. Global Cache & Hydration Optimization
- **File**: `src/router.tsx`
  - Fine-tune TanStack Query's `gcTime` and `staleTime` to balance memory usage and data freshness.
  - Implement a more aggressive preloading strategy for core daily operation routes.
- **File**: `src/lib/query-persist.ts`
  - Optimize the hydration process to prevent main-thread blocking on large cache loads.
  - Implement throttled persistence to reduce disk I/O.

### 2. Database Query Hardening (Payload Minimization)
- **Files**: `src/routes/_authenticated/dashboard.tsx`, `src/routes/_authenticated/hoje.tsx`, `src/routes/_authenticated/estoque.tsx`
  - Replace generic `.select("*")` with explicit column selection to reduce payload sizes (up to 70% reduction in some views).
  - Move memory-intensive filtering (e.g., stock status, date ranges) from client-side JS to Supabase PostgREST queries.

### 3. Stability & PWA Enhancements
- **File**: `vite.config.ts`
  - Audit Workbox configuration for better offline reliability and faster subsequent loads.
  - Ensure proper asset bundling for smaller initial chunks.

### 4. Code Resilience
- Add `ErrorBoundaries` or `CatchBoundary` components to data-heavy views to prevent full-page crashes if a secondary query fails.

## Technical Details
- **Explicit Selecting**: `supabase.from('table').select('id, name, created_at')` instead of `select('*')`.
- **Query Caching**: Standardizing `staleTime` at 1 minute for management views and 5 seconds for "Dia a dia" views.
- **Payload Compression**: Smaller JSON objects mean faster TTI (Time to Interactive) especially on mobile/PWA.
