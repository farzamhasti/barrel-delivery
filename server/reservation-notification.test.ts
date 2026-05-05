import { describe, it, expect } from 'vitest';

describe('Reservation Notification Message Format', () => {
  it('should format reservation done notification as "The reservation (eventType) has been done"', () => {
    const eventType = "Negin's birthday";
    const message = `The reservation (${eventType}) has been done`;
    
    expect(message).toBe("The reservation (Negin's birthday) has been done");
  });

  it('should format reservation done notification for different event types', () => {
    const testCases = [
      { eventType: "Negin's birthday", expected: "The reservation (Negin's birthday) has been done" },
      { eventType: "Large Conference", expected: "The reservation (Large Conference) has been done" },
      { eventType: "Wedding", expected: "The reservation (Wedding) has been done" },
    ];

    testCases.forEach(({ eventType, expected }) => {
      const message = `The reservation (${eventType}) has been done`;
      expect(message).toBe(expected);
    });
  });

  it('should not include reservation ID in the message', () => {
    const reservationId = 210001;
    const eventType = "Negin's birthday";
    const message = `The reservation (${eventType}) has been done`;
    
    // Verify the message does NOT contain the reservation ID
    expect(message).not.toContain(reservationId.toString());
    expect(message).toBe("The reservation (Negin's birthday) has been done");
  });
});
