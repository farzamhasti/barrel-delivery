/**
 * Canadian Sports & Events Integration
 * Integrates NHL, CFL, NFL games and holidays for demand prediction
 */

import { logger } from '../utils/logger';

interface SportEvent {
  id: string;
  name: string;
  type: 'nhl' | 'cfl' | 'nfl' | 'holiday' | 'concert' | 'other';
  date: Date;
  time?: string;
  location?: string;
  teams?: string[];
  demandMultiplier: number;
  confidence: number;
}

interface EventImpact {
  eventId: string;
  demandIncrease: number;
  affectedZones: string[];
  timeWindow: { start: Date; end: Date };
  description: string;
}

/**
 * Canadian Events Integration Engine
 */
export class CanadianEventsIntegration {
  private events: Map<string, SportEvent> = new Map();
  private nhlTeams = ['Toronto Maple Leafs', 'Ottawa Senators', 'Winnipeg Jets', 'Calgary Flames', 'Edmonton Oilers', 'Vancouver Canucks'];
  private cflTeams = ['Toronto Argonauts', 'Hamilton Tiger-Cats', 'Winnipeg Blue Bombers', 'Calgary Stampeders'];
  private canadianHolidays = [
    { name: 'New Year', month: 1, day: 1 },
    { name: 'Family Day', month: 2, day: 15 }, // Third Monday
    { name: 'St. Patrick\'s Day', month: 3, day: 17 },
    { name: 'Easter', month: 4, day: 9 }, // Varies
    { name: 'Victoria Day', month: 5, day: 20 }, // Monday before May 25
    { name: 'Canada Day', month: 7, day: 1 },
    { name: 'Civic Holiday', month: 8, day: 1 }, // First Monday
    { name: 'Labour Day', month: 9, day: 1 }, // First Monday
    { name: 'National Day for Truth and Reconciliation', month: 9, day: 30 },
    { name: 'Thanksgiving', month: 10, day: 10 }, // Second Monday
    { name: 'Halloween', month: 10, day: 31 },
    { name: 'Remembrance Day', month: 11, day: 11 },
    { name: 'Black Friday', month: 11, day: 24 }, // Friday after Thanksgiving
    { name: 'Cyber Monday', month: 11, day: 27 }, // Monday after Thanksgiving
    { name: 'Christmas', month: 12, day: 25 },
    { name: 'Boxing Day', month: 12, day: 26 },
    { name: 'New Year\'s Eve', month: 12, day: 31 },
  ];

  constructor() {
    this.initializeEvents();
  }

  /**
   * Initialize events for current and future dates
   */
  private initializeEvents(): void {
    try {
      // Add holidays for current year and next year
      const currentYear = new Date().getFullYear();
      for (let year = currentYear; year <= currentYear + 1; year++) {
        for (const holiday of this.canadianHolidays) {
          const date = new Date(year, holiday.month - 1, holiday.day);
          this.addEvent({
            id: `holiday_${holiday.name}_${year}`,
            name: holiday.name,
            type: 'holiday',
            date,
            demandMultiplier: this.getHolidayMultiplier(holiday.name),
            confidence: 1.0,
          });
        }
      }

      // Add sample NHL games (in production, fetch from NHL API)
      this.addSampleNHLGames();

      // Add sample CFL games
      this.addSampleCFLGames();

      logger.info(`Initialized ${this.events.size} events`);
    } catch (error) {
      logger.error('Failed to initialize events:', error);
    }
  }

  /**
   * Add sample NHL games
   */
  private addSampleNHLGames(): void {
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const gameDate = new Date(today);
      gameDate.setDate(gameDate.getDate() + i);

      if (gameDate.getDay() !== 0) {
        // Skip Sundays
        const teams = [this.nhlTeams[Math.floor(Math.random() * this.nhlTeams.length)]];
        this.addEvent({
          id: `nhl_game_${gameDate.toISOString()}`,
          name: `NHL Game: ${teams[0]}`,
          type: 'nhl',
          date: gameDate,
          time: `${19 + Math.floor(Math.random() * 2)}:00`,
          teams,
          demandMultiplier: 1.3,
          confidence: 0.8,
        });
      }
    }
  }

  /**
   * Add sample CFL games
   */
  private addSampleCFLGames(): void {
    const today = new Date();
    // CFL season is typically June-November
    for (let i = 0; i < 20; i++) {
      const gameDate = new Date(today);
      gameDate.setDate(gameDate.getDate() + i * 7); // Weekly games

      if (gameDate.getMonth() >= 5 && gameDate.getMonth() <= 10) {
        const teams = [this.cflTeams[Math.floor(Math.random() * this.cflTeams.length)]];
        this.addEvent({
          id: `cfl_game_${gameDate.toISOString()}`,
          name: `CFL Game: ${teams[0]}`,
          type: 'cfl',
          date: gameDate,
          time: '19:00',
          teams,
          demandMultiplier: 1.25,
          confidence: 0.7,
        });
      }
    }
  }

  /**
   * Get holiday demand multiplier
   */
  private getHolidayMultiplier(holidayName: string): number {
    const multipliers: Record<string, number> = {
      'New Year': 1.8,
      'St. Patrick\'s Day': 1.6,
      'Easter': 1.4,
      'Canada Day': 1.7,
      'Halloween': 1.5,
      'Thanksgiving': 1.6,
      'Black Friday': 1.9,
      'Cyber Monday': 1.8,
      'Christmas': 2.0,
      'Boxing Day': 1.7,
      'New Year\'s Eve': 1.9,
    };
    return multipliers[holidayName] || 1.2;
  }

  /**
   * Add event
   */
  addEvent(event: SportEvent): void {
    this.events.set(event.id, event);
  }

  /**
   * Get events for date range
   */
  getEventsInRange(startDate: Date, endDate: Date): SportEvent[] {
    const events: SportEvent[] = [];
    for (const event of this.events.values()) {
      if (event.date >= startDate && event.date <= endDate) {
        events.push(event);
      }
    }
    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Get events for today
   */
  getTodayEvents(): SportEvent[] {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    return this.getEventsInRange(startOfDay, endOfDay);
  }

  /**
   * Get events for this week
   */
  getWeekEvents(): SportEvent[] {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    return this.getEventsInRange(startOfWeek, endOfWeek);
  }

  /**
   * Calculate demand impact for a specific time
   */
  calculateDemandImpact(date: Date): EventImpact[] {
    const impacts: EventImpact[] = [];
    const events = this.getEventsInRange(
      new Date(date.getTime() - 3600000), // 1 hour before
      new Date(date.getTime() + 7200000) // 2 hours after
    );

    for (const event of events) {
      const eventStart = new Date(event.date);
      if (event.time) {
        const [hours, minutes] = event.time.split(':').map(Number);
        eventStart.setHours(hours, minutes);
      }

      const eventEnd = new Date(eventStart.getTime() + 3600000); // 1 hour duration

      impacts.push({
        eventId: event.id,
        demandIncrease: (event.demandMultiplier - 1) * 100,
        affectedZones: this.getAffectedZones(event),
        timeWindow: { start: eventStart, end: eventEnd },
        description: `${event.name} - Expected ${Math.round((event.demandMultiplier - 1) * 100)}% increase in demand`,
      });
    }

    return impacts;
  }

  /**
   * Get affected zones for an event
   */
  private getAffectedZones(event: SportEvent): string[] {
    // In production, this would be based on venue location
    // For now, return all zones with varying intensity
    const zones = ['downtown', 'north', 'south', 'east', 'west'];

    if (event.type === 'holiday') {
      return zones; // Holidays affect all zones
    } else if (event.type === 'nhl' || event.type === 'cfl') {
      // Sports events mainly affect downtown and nearby zones
      return ['downtown', 'north', 'south'];
    }

    return zones;
  }

  /**
   * Get demand multiplier for a specific time
   */
  getDemandMultiplier(date: Date): number {
    const impacts = this.calculateDemandImpact(date);
    if (impacts.length === 0) return 1.0;

    // Calculate weighted average multiplier
    let totalMultiplier = 1.0;
    for (const impact of impacts) {
      totalMultiplier *= 1 + impact.demandIncrease / 100;
    }

    return Math.min(totalMultiplier, 3.0); // Cap at 3x multiplier
  }

  /**
   * Get upcoming events (next 7 days)
   */
  getUpcomingEvents(): SportEvent[] {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return this.getEventsInRange(today, nextWeek);
  }

  /**
   * Search events by type
   */
  searchEventsByType(type: SportEvent['type']): SportEvent[] {
    return Array.from(this.events.values()).filter((e) => e.type === type);
  }

  /**
   * Get event statistics
   */
  getEventStatistics(): {
    totalEvents: number;
    byType: Record<string, number>;
    upcomingCount: number;
    averageDemandMultiplier: number;
  } {
    const byType: Record<string, number> = {};
    let totalMultiplier = 0;

    for (const event of this.events.values()) {
      byType[event.type] = (byType[event.type] || 0) + 1;
      totalMultiplier += event.demandMultiplier;
    }

    const upcomingCount = this.getUpcomingEvents().length;

    return {
      totalEvents: this.events.size,
      byType,
      upcomingCount,
      averageDemandMultiplier: totalMultiplier / Math.max(this.events.size, 1),
    };
  }
}

// Export singleton instance
export const canadianEventsIntegration = new CanadianEventsIntegration();
