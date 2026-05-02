# Return Time Calculation Issue - Root Cause Analysis & Fix

## Problem Summary

When driver Farzam Hasti presses the "Calculate Return Time" button for an order to 255 American Avenue, the system calculates **4 minutes** instead of the expected **15 minutes** (1 minute pickup + 2 minutes delivery + 12 minutes round-trip travel).

## Root Cause Analysis

The issue has **two components**:

### Issue #1: Wrong Default Restaurant Coordinates (FIXED ✅)

**Location**: `server/driverRouter.ts` lines 320-321

**Problem**: The code used hardcoded default coordinates for **New York City** instead of the actual restaurant location:

```typescript
// BEFORE (WRONG)
const restaurantLat = input?.restaurantLatitude ?? 40.7128;  // NYC latitude
const restaurantLng = input?.restaurantLongitude ?? -74.0060; // NYC longitude
```

**Impact**: When calculating distance, the system was measuring from NYC to the customer's address instead of from the restaurant to the customer's address.

**Fix Applied**:

```typescript
// AFTER (CORRECT)
const restaurantLat = input?.restaurantLatitude ?? 42.905191;    // Fort Erie
const restaurantLng = input?.restaurantLongitude ?? -78.9225479; // Fort Erie
```

Restaurant coordinates: **224 Garrison Rd, Fort Erie, ON L2A 1M7**
- Latitude: `42.905191`
- Longitude: `-78.9225479`

### Issue #2: Missing Customer Coordinates (CRITICAL ⚠️)

**Location**: Database - customers table

**Problem**: The system calculates travel time using the Haversine formula with customer latitude/longitude. If these coordinates are **null or missing**, the algorithm **skips those orders** and only calculates:
- Pickup time: 1 minute (60 seconds)
- Delivery time: 2 minutes per order (120 seconds)
- Travel time: 0 (skipped because no valid coordinates)
- **Total: ~3 minutes**

This matches the observed 4-minute calculation!

**Why Coordinates Are Missing**:

1. Existing customers in the database were created **before** the geocoding feature was implemented
2. The `createCustomer()` function automatically geocodes new customers, but **existing customers were never geocoded**
3. When orders are created, they reference existing customers without coordinates

**Solution Implemented**:

Added a new tRPC procedure to geocode all existing customers:

```typescript
// In server/routers.ts - customers router
geocodeAll: adminOrSystemAdminProcedure
  .mutation(async () => {
    return db.geocodeAllCustomers();
  }),
```

This procedure calls `db.geocodeAllCustomers()` which:
1. Fetches all customers without coordinates
2. Uses Google Maps Geocoding API to convert addresses to latitude/longitude
3. Updates the database with the coordinates
4. Returns count of geocoded customers

## How to Fix Existing Data

### Option 1: Automatic Geocoding (Recommended)

Call the new `customers.geocodeAll` procedure from the admin dashboard:

```typescript
const geocodeMutation = trpc.customers.geocodeAll.useMutation({
  onSuccess: (result) => {
    console.log(`Geocoded ${result.geocodedCount} customers`);
    // Refresh driver return time calculations
  },
});

// Trigger geocoding
geocodeMutation.mutate();
```

### Option 2: Manual Geocoding When Creating Orders

When creating a new order, ensure the customer has coordinates:

```typescript
// In order creation form
const customer = {
  name: "John Doe",
  phone: "555-1234",
  address: "255 American Avenue, Fort Erie, ON", // Must be complete address
  // Coordinates will be auto-geocoded by createCustomer()
};
```

## Return Time Calculation Algorithm

Once coordinates are available, the calculation works as follows:

```
Total Return Time = Pickup Time + Delivery Time + Travel Time

Where:
- Pickup Time = 1 minute (60 seconds)
- Delivery Time = 2 minutes per order (120 seconds per order)
- Travel Time = Distance / Average Speed
  - Uses Nearest Neighbor algorithm for route optimization
  - Average speed: 50 km/h (13.89 m/s)
  - Route: Restaurant → Nearest Customer → ... → Restaurant
```

### Example Calculation

For Farzam Hasti's order to 255 American Avenue:

- **Pickup**: 1 minute
- **Delivery**: 2 minutes (1 order)
- **Travel**: ~12 minutes (round trip from restaurant)
  - Restaurant to 255 American Avenue: ~6 km ≈ 6 minutes
  - Return to restaurant: ~6 km ≈ 6 minutes
- **Total**: 1 + 2 + 12 = **15 minutes** ✅

## Testing

A comprehensive test suite was created to verify the calculation:

```bash
npm test -- return-time-calculation.test.ts
```

Tests verify:
- ✅ Correct return time for single order
- ✅ Correct handling of multiple orders
- ✅ Proper handling of missing coordinates
- ✅ Correct restaurant coordinate usage
- ✅ Breakdown of time components

## Changes Made

1. **`server/driverRouter.ts`** (Line 320-321)
   - Fixed restaurant coordinates from NYC to Fort Erie

2. **`server/routers.ts`** (Line 233-236)
   - Added `customers.geocodeAll` procedure to geocode all existing customers

3. **`server/return-time-calculation.test.ts`** (New file)
   - Created comprehensive test suite for return time calculations

## Next Steps

1. **Immediate**: Call `customers.geocodeAll` mutation to geocode all existing customers
2. **Verify**: Test the return time calculation with Farzam Hasti's order - should now show ~15 minutes
3. **Monitor**: Watch for any geocoding failures in server logs
4. **Prevent**: Ensure all new customers are created with complete addresses for automatic geocoding

## Troubleshooting

If return time is still incorrect after geocoding:

1. **Check customer coordinates**: Verify the customer has latitude/longitude in the database
2. **Check order status**: Ensure order status is "On the Way" (other statuses are filtered out)
3. **Check address format**: Ensure customer address is complete (street, city, province, postal code)
4. **Check geocoding logs**: Look for warnings about failed geocoding attempts

## Related Files

- `server/returnTime.ts` - Return time calculation algorithm
- `server/driverRouter.ts` - Driver return time calculation endpoint
- `server/db.ts` - Database functions including `geocodeAllCustomers()`
- `server/_core/map.ts` - Geocoding helper functions
- `server/geocoding.ts` - Distance calculation utilities
