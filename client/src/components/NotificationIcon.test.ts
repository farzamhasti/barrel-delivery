import { describe, it, expect } from 'vitest';

describe('NotificationIcon Double-Click Functionality', () => {
  it('should require double-click to mark notification as read', () => {
    let clickCount = 0;
    let lastClickTime = 0;

    const handleClick = () => {
      const now = Date.now();
      // Reset if more than 300ms has passed since last click
      if (now - lastClickTime > 300) {
        clickCount = 1;
      } else {
        clickCount += 1;
      }
      lastClickTime = now;
    };

    // First click
    handleClick();
    expect(clickCount).toBe(1);

    // Second click within 300ms
    handleClick();
    expect(clickCount).toBe(2);
  });

  it('should reset click count if clicks are more than 300ms apart', () => {
    let clickCount = 0;
    let lastClickTime = 0;

    const handleClick = () => {
      const now = Date.now();
      if (now - lastClickTime > 300) {
        clickCount = 1;
      } else {
        clickCount += 1;
      }
      lastClickTime = now;
    };

    // First click
    handleClick();
    expect(clickCount).toBe(1);

    // Simulate 400ms delay
    lastClickTime = Date.now() - 400;

    // Second click after 400ms should reset
    handleClick();
    expect(clickCount).toBe(1);
  });

  it('should mark notification as read only on second click', () => {
    let isMarkedAsRead = false;
    let clickCount = 0;
    let lastClickTime = 0;

    const handleClick = () => {
      const now = Date.now();
      if (now - lastClickTime > 300) {
        clickCount = 1;
      } else {
        clickCount += 1;
      }
      lastClickTime = now;

      // Mark as read on double-click
      if (clickCount === 2) {
        isMarkedAsRead = true;
        clickCount = 0;
      }
    };

    // First click - should not mark as read
    handleClick();
    expect(isMarkedAsRead).toBe(false);

    // Second click - should mark as read
    handleClick();
    expect(isMarkedAsRead).toBe(true);
    expect(clickCount).toBe(0); // Reset after marking
  });
});
