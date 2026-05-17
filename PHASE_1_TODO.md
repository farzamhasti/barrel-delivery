# PHASE 1 — CORE PIPELINE STABILIZATION

## Critical Tasks

### Authentication & Session Management
- [ ] Fix Today/Tomorrow authentication rejection - identify why systemSession is null/undefined
- [ ] Verify systemSession.role is set to 'admin' during login
- [ ] Add logging to context.ts to trace token extraction
- [ ] Test session token persistence in database
- [ ] Verify browser sends x-system-session-token header correctly
- [ ] Add session validation middleware with detailed error messages

### Query Execution & Data Flow
- [ ] Ensure Overview query (zoneId: "1") continues working
- [ ] Fix Today query (zoneId: "42.8_-79.0", forecastMode: "TODAY_FORECAST")
- [ ] Fix Tomorrow query (zoneId: "42.8_-79.0", forecastMode: "TOMORROW_FORECAST")
- [ ] Verify all tRPC queries return valid data (not null)
- [ ] Eliminate all null forecast states
- [ ] Add query retry logic with exponential backoff
- [ ] Add fallback responses when FastAPI is unavailable

### Runtime Validation
- [ ] Add session token validation at request entry
- [ ] Add context loading validation
- [ ] Add query execution validation
- [ ] Add FastAPI response validation
- [ ] Add React state update validation
- [ ] Log all validation failures with full context

### Structured Logging
- [ ] Implement centralized logging system
- [ ] Add request/response logging for all tRPC calls
- [ ] Add FastAPI call logging with timing
- [ ] Add React state change logging
- [ ] Add error stack traces with context
- [ ] Create log aggregation/viewing interface

### Frontend Error Handling
- [ ] Add error boundary to SpatialAIIntelligenceCard
- [ ] Add error boundary to GeomarketingAnalytics page
- [ ] Display user-friendly error messages
- [ ] Log errors with full stack traces
- [ ] Add retry buttons for failed queries
- [ ] Add fallback UI for missing data

### Backend Resilience
- [ ] Add retry logic to FastAPI calls
- [ ] Add timeout handling
- [ ] Add circuit breaker pattern
- [ ] Add graceful degradation
- [ ] Add health check endpoints
- [ ] Add database connection pooling

### UI Consistency
- [ ] Overview tab renders forecast data ✅ (already working)
- [ ] Today tab renders forecast data consistently
- [ ] Tomorrow tab renders forecast data consistently
- [ ] All tabs show same data structure
- [ ] All tabs have consistent styling
- [ ] All tabs handle loading/error states

## Verification Checklist

- [ ] No "Please login (10001)" errors for authenticated users
- [ ] No null forecast responses
- [ ] No silent failures (all errors logged and visible)
- [ ] All three tabs (Overview, Today, Tomorrow) display data
- [ ] Session tokens persist across page reloads
- [ ] Forecast data updates in real-time
- [ ] No console errors in browser
- [ ] No server errors in backend logs
- [ ] All network requests complete successfully
- [ ] React state updates correctly reflect API responses

## Deliverables

- Stable forecast rendering across all tabs
- Zero unauthorized forecast queries
- Zero silent failures
- Full runtime traceability with structured logs
- Production-ready error handling
- Documented system diagnostics
