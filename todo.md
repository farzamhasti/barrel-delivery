# Barrel Delivery - Project TODO

## Database & Core Infrastructure
- [x] Design and implement database schema (menus, categories, orders, drivers, customers) - ENGLISH ONLY
- [x] Create Drizzle ORM schema with all tables and relationships
- [x] Set up database migrations
- [x] Ensure all content is in English (no Persian/RTL)

## Admin Panel - Menu Management
- [x] Create menu categories management (add, edit, delete)
- [x] Implement menu items management (add, edit, delete with price and description)
- [x] Build menu management UI with elegant design
- [ ] Add image upload capability for menu items (schema ready, UI/upload logic pending)

## Order Management System
- [x] Create order registration form (customer name, phone, address)
- [x] Implement menu item selection interface for orders
- [x] Build order creation and storage logic
- [x] Create order list view with filtering and search

## Driver Management
- [x] Implement driver CRUD operations (add, edit, delete drivers)
- [x] Create driver list management UI
- [x] Build driver assignment system for orders
- [x] Implement driver status tracking

## Driver Panel
- [x] Create driver dashboard showing assigned orders
- [x] Implement order status update functionality (Pending → On the Way → Delivered)
- [x] Build driver-specific UI with order details
- [ ] Add location sharing capability for drivers (placeholder only, geolocation capture pending)

## Live Map & Location Tracking
- [x] Integrate Google Maps API into admin dashboard (MapView component added)
- [ ] Implement real-time driver location tracking UI (needs polling/websocket)
- [ ] Display customer address on map (needs geocoding and markers)
- [ ] Show driver location on map (needs coordinate markers)
- [ ] Build map view component with markers and routes (basic map view created)

## Management Dashboard
- [x] Create main dashboard with live order status overview
- [x] Implement real-time order status updates
- [x] Build order statistics and metrics display
- [x] Add active orders list with status indicators
- [x] Implement map view integration in dashboard (Live Map tab added)

## UI/UX & Styling
- [x] Set up elegant color palette and typography
- [x] Configure Tailwind CSS with refined design tokens
- [x] Create consistent component library
- [x] Apply polished visual style to all pages
- [x] Ensure LTR (left-to-right) layout throughout

## Testing & Deployment
- [ ] Write unit tests for core features (tests created but DB tables need migration)
- [ ] Test all user flows and interactions
- [x] Verify LTR layout on all pages (no RTL needed - English only)
- [ ] Test map functionality and location tracking
- [ ] Performance optimization
- [ ] Final deployment and handover


## Bug Fixes
- [x] Fix OAuth callback error when logging in as admin (Fixed state encoding in const.ts)


## Feature Requests
- [x] Modify Home page to show Admin Dashboard and Driver Panel directly without login requirement


## Current Issues
- [x] Fix API error on /admin/menu - Fixed by implementing automatic database initialization


## Database Issues
- [x] Database tables not created - implemented auto-initialization on server startup
