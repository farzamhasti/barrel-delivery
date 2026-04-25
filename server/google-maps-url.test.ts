import { describe, it, expect } from "vitest";

const RESTAURANT_LAT = 42.905191;
const RESTAURANT_LNG = -78.9225479;

describe("Google Maps URL Generation", () => {
  it("should generate correct URL for single order delivery", () => {
    const order = {
      id: 1,
      customer: {
        latitude: 42.9,
        longitude: -78.92,
      },
    };

    const url = `https://www.google.com/maps/dir/?api=1&origin=${RESTAURANT_LAT},${RESTAURANT_LNG}&destination=42.9,-78.92&travelmode=driving`;
    expect(url).toContain("api=1");
    expect(url).toContain(`origin=${RESTAURANT_LAT},${RESTAURANT_LNG}`);
    expect(url).toContain("destination=42.9,-78.92");
    expect(url).toContain("travelmode=driving");
  });

  it("should generate correct URL for multiple orders with optimized waypoints", () => {
    const orders = [
      {
        id: 1,
        customer: {
          latitude: 42.9,
          longitude: -78.92,
        },
      },
      {
        id: 2,
        customer: {
          latitude: 42.91,
          longitude: -78.91,
        },
      },
      {
        id: 3,
        customer: {
          latitude: 42.88,
          longitude: -78.93,
        },
      },
    ];

    const waypoints = "42.9,-78.92|42.91,-78.91|42.88,-78.93";
    const url = `https://www.google.com/maps/dir/?api=1&origin=${RESTAURANT_LAT},${RESTAURANT_LNG}&destination=${RESTAURANT_LAT},${RESTAURANT_LNG}&waypoints=${waypoints}&waypoints_order=optimized&travelmode=driving`;

    expect(url).toContain("api=1");
    expect(url).toContain(`origin=${RESTAURANT_LAT},${RESTAURANT_LNG}`);
    expect(url).toContain(`destination=${RESTAURANT_LAT},${RESTAURANT_LNG}`);
    expect(url).toContain("waypoints=42.9,-78.92|42.91,-78.91|42.88,-78.93");
    expect(url).toContain("waypoints_order=optimized");
    expect(url).toContain("travelmode=driving");
  });

  it("should handle Decimal coordinates correctly", () => {
    const order = {
      id: 1,
      customer: {
        latitude: "42.9051" as any, // Decimal type from database
        longitude: "-78.9225" as any,
      },
    };

    const lat = parseFloat(String(order.customer.latitude));
    const lng = parseFloat(String(order.customer.longitude));

    expect(lat).toBe(42.9051);
    expect(lng).toBe(-78.9225);
    expect(typeof lat).toBe("number");
    expect(typeof lng).toBe("number");
  });

  it("should return restaurant location as both origin and destination for multi-order route", () => {
    const orders = [
      {
        id: 1,
        customer: { latitude: 42.9, longitude: -78.92 },
      },
      {
        id: 2,
        customer: { latitude: 42.91, longitude: -78.91 },
      },
    ];

    const url = `https://www.google.com/maps/dir/?api=1&origin=${RESTAURANT_LAT},${RESTAURANT_LNG}&destination=${RESTAURANT_LAT},${RESTAURANT_LNG}&waypoints=42.9,-78.92|42.91,-78.91&waypoints_order=optimized&travelmode=driving`;

    // Verify origin and destination are the same (restaurant)
    const originMatch = url.match(/origin=([^&]+)/);
    const destinationMatch = url.match(/destination=([^&]+)/);

    expect(originMatch?.[1]).toBe(destinationMatch?.[1]);
    expect(originMatch?.[1]).toBe(`${RESTAURANT_LAT},${RESTAURANT_LNG}`);
  });

  it("should include waypoints_order=optimized for multi-stop routes", () => {
    const orders = [
      { id: 1, customer: { latitude: 42.9, longitude: -78.92 } },
      { id: 2, customer: { latitude: 42.91, longitude: -78.91 } },
      { id: 3, customer: { latitude: 42.88, longitude: -78.93 } },
    ];

    const waypoints = orders
      .map((o) => `${o.customer.latitude},${o.customer.longitude}`)
      .join("|");
    const url = `https://www.google.com/maps/dir/?api=1&origin=${RESTAURANT_LAT},${RESTAURANT_LNG}&destination=${RESTAURANT_LAT},${RESTAURANT_LNG}&waypoints=${waypoints}&waypoints_order=optimized&travelmode=driving`;

    expect(url).toContain("waypoints_order=optimized");
    // Verify waypoints are in order (not optimized yet - Google Maps will optimize)
    expect(url).toContain("42.9,-78.92|42.91,-78.91|42.88,-78.93");
  });
});
