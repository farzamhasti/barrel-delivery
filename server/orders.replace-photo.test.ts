import { describe, it, expect, beforeAll } from "vitest";
import { createOrder, getOrderById, updateOrder } from "./db";
import { initializeDatabase } from "./_core/initDb";

describe("Order Replace Photo Feature", () => {
  let orderId: number;

  beforeAll(async () => {
    // Initialize database
    await initializeDatabase();

    // Create a test order
    const orderResult = await createOrder({
      customerId: 1,
      totalPrice: 50.0 as any,
      orderNumber: "TEST-REPLACE-001",
      customerPhone: "+1 (555) 123-4567",
      customerAddress: "123 Test St",
      area: "DT",
    });
    orderId = Array.isArray(orderResult)
      ? (orderResult as any)[0]?.insertId
      : (orderResult as any).insertId;
  });

  it("should update order with new receipt image URL", async () => {
    const newReceiptUrl = "https://mock-s3.example.com/receipts/test-123.png";
    const result = await updateOrder(orderId, {
      receiptImage: newReceiptUrl,
      formattedReceiptImage: newReceiptUrl,
    });
    expect(result).toBeDefined();

    const updated = await getOrderById(orderId);
    expect(updated?.receiptImage).toBe(newReceiptUrl);
    expect(updated?.formattedReceiptImage).toBe(newReceiptUrl);
  });

  it("should update order with receipt text extracted from new image", async () => {
    const extractedText = "Order #123 - Pizza $25.99 - Pasta $15.99 - Total: $41.98";
    const result = await updateOrder(orderId, {
      receiptText: extractedText,
    });
    expect(result).toBeDefined();

    const updated = await getOrderById(orderId);
    expect(updated?.receiptText).toBe(extractedText);
  });

  it("should preserve other order fields when replacing photo", async () => {
    const originalStatus = "Pending";
    const originalArea = "DT";
    const originalPhone = "+1 (555) 123-4567";

    // Update only the receipt image
    const newReceiptUrl = "https://mock-s3.example.com/receipts/updated-456.png";
    await updateOrder(orderId, {
      receiptImage: newReceiptUrl,
      formattedReceiptImage: newReceiptUrl,
    });

    const updated = await getOrderById(orderId);
    // Verify receipt was updated
    expect(updated?.receiptImage).toBe(newReceiptUrl);
    // Verify other fields are preserved
    expect(updated?.status).toBe(originalStatus);
    expect(updated?.area).toBe(originalArea);
    expect(updated?.customerPhone).toBe(originalPhone);
  });

  it("should handle multiple photo replacements on same order", async () => {
    // First replacement
    const firstReceiptUrl = "https://mock-s3.example.com/receipts/first-789.png";
    await updateOrder(orderId, {
      receiptImage: firstReceiptUrl,
      formattedReceiptImage: firstReceiptUrl,
    });

    let updated = await getOrderById(orderId);
    expect(updated?.receiptImage).toBe(firstReceiptUrl);

    // Second replacement
    const secondReceiptUrl = "https://mock-s3.example.com/receipts/second-012.png";
    await updateOrder(orderId, {
      receiptImage: secondReceiptUrl,
      formattedReceiptImage: secondReceiptUrl,
    });

    updated = await getOrderById(orderId);
    expect(updated?.receiptImage).toBe(secondReceiptUrl);
  });

  it("should allow partial updates without requiring receipt image", async () => {
    const newStatus = "Ready";
    const result = await updateOrder(orderId, {
      status: newStatus,
    });
    expect(result).toBeDefined();

    const updated = await getOrderById(orderId);
    expect(updated?.status).toBe(newStatus);
  });

  it("should update order with combined receipt and other fields", async () => {
    const newReceiptUrl = "https://mock-s3.example.com/receipts/combined-345.png";
    const newStatus = "On the Way";
    const newAddress = "456 Updated Ave";

    const result = await updateOrder(orderId, {
      receiptImage: newReceiptUrl,
      formattedReceiptImage: newReceiptUrl,
      status: newStatus,
      customerAddress: newAddress,
    });
    expect(result).toBeDefined();

    const updated = await getOrderById(orderId);
    expect(updated?.receiptImage).toBe(newReceiptUrl);
    expect(updated?.status).toBe(newStatus);
    expect(updated?.customerAddress).toBe(newAddress);
  });
});
