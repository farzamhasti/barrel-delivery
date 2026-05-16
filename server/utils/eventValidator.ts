/**
 * Event Validation System
 * Validates if events are currently active and calculates operational impact
 * Integrates with NHL, CFL, and holiday calendars
 */

interface Event {
  id: string;
  name: string;
  type: 'nhl' | 'cfl' | 'holiday' | 'concert' | 'other';
  startTime: Date;
  endTime: Date;
  location: string;
  demandMultiplier: number;
  description: string;
}

interface ActiveEvent {
  id: string;
  name: string;
  type: string;
  demandMultiplier: number;
  description: string;
  hoursRemaining: number;
  isActive: boolean;
}

/**
 * Canadian holidays and major events for Fort Erie area
 */
const CANADIAN_HOLIDAYS = [
  { name: 'New Year\'s Day', month: 1, day: 1, demandMultiplier: 1.3 },
  { name: 'Family Day', month: 2, day: 19, demandMultiplier: 1.2 },
  { name: 'Good Friday', month: 4, day: 18, demandMultiplier: 1.1 },
  { name: 'Victoria Day', month: 5, day: 19, demandMultiplier: 1.2 },
  { name: 'Canada Day', month: 7, day: 1, demandMultiplier: 1.4 },
  { name: 'Civic Holiday', month: 8, day: 5, demandMultiplier: 1.2 },
  { name: 'Labour Day', month: 9, day: 2, demandMultiplier: 1.1 },
  { name: 'National Day for Truth and Reconciliation', month: 9, day: 30, demandMultiplier: 1.0 },
  { name: 'Thanksgiving', month: 10, day: 14, demandMultiplier: 1.3 },
  { name: 'Remembrance Day', month: 11, day: 11, demandMultiplier: 1.1 },
  { name: 'Christmas', month: 12, day: 25, demandMultiplier: 1.5 },
  { name: 'Boxing Day', month: 12, day: 26, demandMultiplier: 1.4 },
];

/**
 * Check if a date is a Canadian holiday
 */
function isCanadianHoliday(date: Date): { isHoliday: boolean; name?: string; multiplier?: number } {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const holiday = CANADIAN_HOLIDAYS.find(h => h.month === month && h.day === day);

  if (holiday) {
    return {
      isHoliday: true,
      name: holiday.name,
      multiplier: holiday.demandMultiplier,
    };
  }

  return { isHoliday: false };
}

/**
 * Check if an event is currently active
 */
function isEventActive(event: Event, now: Date = new Date()): boolean {
  return now >= event.startTime && now <= event.endTime;
}

/**
 * Calculate hours remaining until event ends
 */
function getHoursRemaining(event: Event, now: Date = new Date()): number {
  if (!isEventActive(event, now)) {
    return 0;
  }

  const diffMs = event.endTime.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60));
}

/**
 * Get all active events for Fort Erie
 * Currently returns empty array - integrate with real event APIs
 */
async function getActiveEvents(now: Date = new Date()): Promise<ActiveEvent[]> {
  const activeEvents: ActiveEvent[] = [];

  // Check for holidays
  const holiday = isCanadianHoliday(now);
  if (holiday.isHoliday) {
    activeEvents.push({
      id: `holiday-${holiday.name}`,
      name: holiday.name || '',
      type: 'holiday',
      demandMultiplier: holiday.multiplier || 1.0,
      description: `Canadian holiday: ${holiday.name}`,
      hoursRemaining: 24,
      isActive: true,
    });
  }

  // TODO: Integrate with real NHL API
  // - Fetch Buffalo Sabres schedule (closest NHL team)
  // - Check if game is today in Fort Erie area
  // - Add demand multiplier if game is active

  // TODO: Integrate with real CFL API
  // - Fetch Toronto Argonauts or Hamilton Tiger-Cats schedule
  // - Check if game is today
  // - Add demand multiplier if game is active

  // TODO: Integrate with real concert/event APIs
  // - Check local event calendars
  // - Add demand multiplier for major events

  return activeEvents;
}

/**
 * Calculate total demand multiplier from all active events
 */
async function calculateEventDemandMultiplier(now: Date = new Date()): Promise<number> {
  const activeEvents = await getActiveEvents(now);

  if (activeEvents.length === 0) {
    return 1.0;
  }

  // Apply highest multiplier from active events
  const maxMultiplier = Math.max(...activeEvents.map(e => e.demandMultiplier));

  return maxMultiplier;
}

/**
 * Get event impact description
 */
function getEventImpactDescription(multiplier: number): string {
  if (multiplier >= 1.4) {
    return 'Major event - expect very high demand surge';
  } else if (multiplier >= 1.2) {
    return 'Holiday or significant event - expect high demand';
  } else if (multiplier >= 1.1) {
    return 'Minor event - expect moderate demand increase';
  } else {
    return 'No active events - normal demand expected';
  }
}

export {
  Event,
  ActiveEvent,
  isCanadianHoliday,
  isEventActive,
  getHoursRemaining,
  getActiveEvents,
  calculateEventDemandMultiplier,
  getEventImpactDescription,
};
