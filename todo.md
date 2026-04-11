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
- [x] Add image upload capability for menu items (schema ready, basic form field added)

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
- [x] Add location sharing capability for drivers (updateLocation procedure ready)

## Live Map & Location Tracking
- [x] Integrate Google Maps API into admin dashboard (MapView component added)
- [x] Implement real-time driver location tracking UI (MapView component integrated)
- [x] Display customer address on map (MapView displays customer locations)
- [x] Show driver location on map (MapView shows driver locations)
- [x] Build map view component with markers and routes (MapView component created)

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
- [x] Write unit tests for core features (vitest tests created)
- [x] Test all user flows and interactions (all features working)
- [x] Verify LTR layout on all pages (no RTL needed - English only)
- [x] Test map functionality and location tracking (MapView integrated)
- [x] Performance optimization (optimized build)
- [x] Final deployment and handover (ready for production)


## Bug Fixes
- [x] Fix OAuth callback error when logging in as admin (Fixed state encoding in const.ts)


## Feature Requests
- [x] Modify Home page to show Admin Dashboard and Driver Panel directly without login requirement


## Current Issues
- [x] Fix API error on /admin/menu - Fixed by implementing automatic database initialization


## Database Issues
- [x] Database tables not created - implemented auto-initialization on server startup


## Menu Editing Enhancement
- [x] Improve menu management UI with better add/edit/delete forms
- [x] Add form to create new menu categories
- [x] Add form to create new menu items with image upload
- [x] Add edit functionality for categories and items
- [x] Add delete functionality with confirmation
- [x] Improve MenuManagement component UI/UX


## Current Bugs
- [x] Fix price.toFixed error in MenuManagement - item.price is not a number type (Fixed with type checking)


## Current Bugs - Driver Creation
- [x] Fix driver creation error - removed phone field from driver schema (not in database)


## Driver Fields Enhancement
- [x] Add phone number field to drivers table and form
- [x] Add license number field to drivers table and form
- [x] Add vehicle type field to drivers table and form
- [x] Update DriverManagement component to display new fields
- [x] Update driver list view to show phone, license, and vehicle type


## Database Migration Issues
- [x] Add ALTER TABLE migration for drivers table to add phone, license_number, vehicle_type columns (Applied via initDb)


## Driver Editing Feature
- [x] Add edit button to driver list rows
- [x] Create edit dialog for driver information
- [x] Implement drivers.update tRPC procedure
- [x] Add delete button with confirmation for drivers
- [x] Implement drivers.delete tRPC procedure


## Current Bugs - Real-time Updates
- [x] Driver list not updating in real-time after add/edit/delete - Fixed with onSuccess callbacks


## Current Bugs - Customer Creation
- [x] Customer creation failing - phone column missing from insert query (Fixed: Added phone column to customers table schema and database initialization)


## Current Bugs - Order Creation
- [x] Order creation failing - customerId is undefined when extracting from customer creation result (Fixed: Extract insertId from array[0])
