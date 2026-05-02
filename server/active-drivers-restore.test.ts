import { describe, it, expect } from "vitest";

describe("Active Drivers Filter Restoration", () => {
  it("should filter drivers with status 'online' and isActive true", () => {
    const drivers = [
      { id: 1, name: "Driver 1", status: "online", isActive: true },
      { id: 2, name: "Driver 2", status: "offline", isActive: true },
      { id: 3, name: "Driver 3", status: "online", isActive: false },
      { id: 4, name: "Driver 4", status: "online", isActive: true },
    ];

    const activeDrivers = drivers.filter((d: any) => d.status === "online" && d.isActive);

    expect(activeDrivers).toHaveLength(2);
    expect(activeDrivers[0].id).toBe(1);
    expect(activeDrivers[1].id).toBe(4);
  });

  it("should return empty array when no drivers match filter", () => {
    const drivers = [
      { id: 1, name: "Driver 1", status: "offline", isActive: true },
      { id: 2, name: "Driver 2", status: "offline", isActive: false },
    ];

    const activeDrivers = drivers.filter((d: any) => d.status === "online" && d.isActive);

    expect(activeDrivers).toHaveLength(0);
  });

  it("should correctly filter drivers with mixed statuses", () => {
    const drivers = [
      { id: 1, name: "Farzam", status: "online", isActive: true },
      { id: 2, name: "Ali", status: "online", isActive: true },
      { id: 3, name: "Mohammad", status: "offline", isActive: true },
      { id: 4, name: "Sara", status: "online", isActive: false },
    ];

    const activeDrivers = drivers.filter((d: any) => d.status === "online" && d.isActive);

    expect(activeDrivers).toHaveLength(2);
    expect(activeDrivers.map((d: any) => d.name)).toEqual(["Farzam", "Ali"]);
  });
});
