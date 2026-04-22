import { trpc } from "./trpc";

/**
 * Centralized cache invalidation utility for order-related queries.
 * When any order is modified (created, updated, deleted, or items changed),
 * this function ensures all related queries are invalidated so all dashboards
 * refresh with the latest data.
 */
export function invalidateOrderCache(utils: ReturnType<typeof trpc.useUtils>) {
  // Invalidate all order list queries
  utils.orders.list.invalidate();

  // Invalidate date-range queries
  utils.orders.getByDateRange.invalidate();

  // Invalidate today's orders queries
  utils.orders.getTodayOrdersWithItems.invalidate();

  // Invalidate driver-specific order queries
  utils.orders.getTodayOrdersForDriver.invalidate();

  // Invalidate individual order details (all possible IDs)
  // This is a catch-all that invalidates any getById query
  utils.orders.getById.invalidate();

  // Note: customers doesn't have a list query, but individual customer updates
  // will be caught by order query invalidation
}

/**
 * Invalidate cache for a specific order and all related queries.
 * Use this when you only need to refresh a particular order and its related data.
 */
export function invalidateOrderById(
  utils: ReturnType<typeof trpc.useUtils>,
  orderId: number
) {
  // Invalidate the specific order
  utils.orders.getById.invalidate({ orderId });

  // Also invalidate list queries as the order may appear in lists
  utils.orders.list.invalidate();
  utils.orders.getTodayOrdersWithItems.invalidate();
  utils.orders.getTodayOrdersForDriver.invalidate();
  utils.orders.getByDateRange.invalidate();
}

/**
 * Invalidate cache for customer-related queries.
 * Use this when customer information is updated.
 */
export function invalidateCustomerCache(
  utils: ReturnType<typeof trpc.useUtils>,
  customerId?: number
) {
  // Invalidate all order queries as they may contain customer data
  utils.orders.list.invalidate();
  utils.orders.getTodayOrdersWithItems.invalidate();
  utils.orders.getTodayOrdersForDriver.invalidate();
  utils.orders.getByDateRange.invalidate();
  utils.orders.getById.invalidate();
}

/**
 * Invalidate cache for menu-related queries.
 * Use this when menu items or categories are modified.
 */
export function invalidateMenuCache(utils: ReturnType<typeof trpc.useUtils>) {
  utils.menu.categories.list.invalidate();
  utils.menu.items.list.invalidate();

  // Also invalidate order queries as they may contain menu item references
  utils.orders.list.invalidate();
  utils.orders.getTodayOrdersWithItems.invalidate();
  utils.orders.getTodayOrdersForDriver.invalidate();
  utils.orders.getByDateRange.invalidate();
  utils.orders.getById.invalidate();
}

/**
 * Invalidate cache for driver-related queries.
 * Use this when driver information or assignments are modified.
 */
export function invalidateDriverCache(utils: ReturnType<typeof trpc.useUtils>) {
  utils.drivers.list.invalidate();

  // Also invalidate order queries as they may contain driver assignments
  utils.orders.list.invalidate();
  utils.orders.getTodayOrdersWithItems.invalidate();
  utils.orders.getTodayOrdersForDriver.invalidate();
  utils.orders.getByDateRange.invalidate();
  utils.orders.getById.invalidate();
}
