/**
 * Operational Intelligence Router
 * tRPC endpoints for real-time operational intelligence
 */

import { router, publicProcedure, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { livePredictEngine } from '../operational/liveForecastEngine';
import { operationalRiskEngine } from '../operational/operationalRiskEngine';
import { scenarioSimulation } from '../operational/scenarioSimulation';
import { canadianEventsIntegration } from '../ml/canadianEventsIntegration';
import { logger } from '../utils/logger';

export const operationalRouter = router({
  // Live Predict Updates
  startLiveUpdates: protectedProcedure
    .input(
      z.object({
        zoneId: z.string(),
        updateInterval: z.number().optional(),
      })
    )
    .mutation(({ input }) => {
      try {
        livePredictEngine.startLiveUpdates(input.zoneId, input.updateInterval);
        return {
          success: true,
          message: `Live predict updates started for zone ${input.zoneId}`,
        };
      } catch (error) {
        logger.error('Failed to start live updates:', error);
        return {
          success: false,
          error: 'Failed to start live updates',
        };
      }
    }),

  stopLiveUpdates: protectedProcedure
    .input(z.object({ zoneId: z.string() }))
    .mutation(({ input }) => {
      try {
        livePredictEngine.stopLiveUpdates(input.zoneId);
        return {
          success: true,
          message: `Live predict updates stopped for zone ${input.zoneId}`,
        };
      } catch (error) {
        logger.error('Failed to stop live updates:', error);
        return {
          success: false,
          error: 'Failed to stop live updates',
        };
      }
    }),

  recordNewOrder: protectedProcedure
    .input(
      z.object({
        zoneId: z.string(),
        orderData: z.any(),
      })
    )
    .mutation(({ input }) => {
      try {
        const triggeredUpdate = livePredictEngine.recordNewOrder(input.zoneId, input.orderData);
        return {
          success: true,
          triggeredUpdate,
          message: triggeredUpdate
            ? 'Adaptation threshold reached, predict updated'
            : 'Order recorded',
        };
      } catch (error) {
        logger.error('Failed to record new order:', error);
        return {
          success: false,
          error: 'Failed to record order',
        };
      }
    }),

  getCurrentPredict: publicProcedure
    .input(z.object({ zoneId: z.string() }))
    .query(({ input }) => {
      try {
        const predict = livePredictEngine.getPredict(input.zoneId);
        return {
          success: true,
          data: predict,
        };
      } catch (error) {
        logger.error('Failed to get predict:', error);
        return {
          success: false,
          error: 'Failed to get predict',
        };
      }
    }),

  getPredictStats: publicProcedure.query(() => {
    try {
      const stats = livePredictEngine.getPredictStats();
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      logger.error('Failed to get predict stats:', error);
      return {
        success: false,
        error: 'Failed to get predict stats',
      };
    }
  }),

  // Operational Risk Assessment
  assessRisks: protectedProcedure
    .input(
      z.object({
        activeOrders: z.number(),
        averageOrderTime: z.number(),
        kitchenCapacity: z.number(),
        kitchenUtilization: z.number(),
        activeDrivers: z.number(),
        ordersPerDriver: z.number(),
        avgDeliveryTime: z.number(),
        maxDeliveryTime: z.number(),
      })
    )
    .query(({ input }) => {
      try {
        const assessment = operationalRiskEngine.assessRisks(input);
        return {
          success: true,
          data: assessment,
        };
      } catch (error) {
        logger.error('Failed to assess risks:', error);
        return {
          success: false,
          error: 'Failed to assess risks',
        };
      }
    }),

  predictFutureRisk: protectedProcedure
    .input(
      z.object({
        activeOrders: z.number(),
        averageOrderTime: z.number(),
        kitchenCapacity: z.number(),
        kitchenUtilization: z.number(),
        activeDrivers: z.number(),
        ordersPerDriver: z.number(),
        avgDeliveryTime: z.number(),
        maxDeliveryTime: z.number(),
        minutesAhead: z.number(),
        expectedNewOrders: z.number(),
      })
    )
    .query(({ input }) => {
      try {
        const { minutesAhead, expectedNewOrders, ...metrics } = input;
        const predict = operationalRiskEngine.predictFutureRisk(
          metrics,
          minutesAhead,
          expectedNewOrders
        );
        return {
          success: true,
          data: predict,
        };
      } catch (error) {
        logger.error('Failed to predict future risk:', error);
        return {
          success: false,
          error: 'Failed to predict future risk',
        };
      }
    }),

  // Scenario Simulation
  simulateScenario: protectedProcedure
    .input(
      z.object({
        scenario: z.enum([
          'heavy_snow',
          'demand_surge',
          'driver_loss',
          'major_sports_event',
          'system_failure',
          'holiday_rush',
        ]),
        activeOrders: z.number(),
        averageOrderTime: z.number(),
        kitchenCapacity: z.number(),
        kitchenUtilization: z.number(),
        activeDrivers: z.number(),
        ordersPerDriver: z.number(),
        avgDeliveryTime: z.number(),
        maxDeliveryTime: z.number(),
      })
    )
    .query(({ input }) => {
      try {
        const { scenario, ...metrics } = input;
        const result = scenarioSimulation.simulateScenario(
          scenario as any,
          metrics
        );
        return {
          success: true,
          data: result,
        };
      } catch (error) {
        logger.error('Failed to simulate scenario:', error);
        return {
          success: false,
          error: 'Failed to simulate scenario',
        };
      }
    }),

  compareScenarios: protectedProcedure
    .input(
      z.object({
        scenarios: z.array(
          z.enum([
            'heavy_snow',
            'demand_surge',
            'driver_loss',
            'major_sports_event',
            'system_failure',
            'holiday_rush',
          ])
        ),
        activeOrders: z.number(),
        averageOrderTime: z.number(),
        kitchenCapacity: z.number(),
        kitchenUtilization: z.number(),
        activeDrivers: z.number(),
        ordersPerDriver: z.number(),
        avgDeliveryTime: z.number(),
        maxDeliveryTime: z.number(),
      })
    )
    .query(({ input }) => {
      try {
        const { scenarios, ...metrics } = input;
        const comparison = scenarioSimulation.compareScenarios(
          metrics,
          scenarios as any
        );
        return {
          success: true,
          data: comparison,
        };
      } catch (error) {
        logger.error('Failed to compare scenarios:', error);
        return {
          success: false,
          error: 'Failed to compare scenarios',
        };
      }
    }),

  getAvailableScenarios: publicProcedure.query(() => {
    try {
      const scenarios = scenarioSimulation.getAvailableScenarios();
      return {
        success: true,
        data: scenarios,
      };
    } catch (error) {
      logger.error('Failed to get scenarios:', error);
      return {
        success: false,
        error: 'Failed to get scenarios',
      };
    }
  }),

  // Event Intelligence
  getTodayEvents: publicProcedure.query(() => {
    try {
      const events = canadianEventsIntegration.getTodayEvents();
      return {
        success: true,
        data: events,
      };
    } catch (error) {
      logger.error('Failed to get today events:', error);
      return {
        success: false,
        error: 'Failed to get today events',
      };
    }
  }),

  getUpcomingEvents: publicProcedure.query(() => {
    try {
      const events = canadianEventsIntegration.getUpcomingEvents();
      return {
        success: true,
        data: events,
      };
    } catch (error) {
      logger.error('Failed to get upcoming events:', error);
      return {
        success: false,
        error: 'Failed to get upcoming events',
      };
    }
  }),

  getEventStatistics: publicProcedure.query(() => {
    try {
      const stats = canadianEventsIntegration.getEventStatistics();
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      logger.error('Failed to get event statistics:', error);
      return {
        success: false,
        error: 'Failed to get event statistics',
      };
    }
  }),

  calculateDemandImpact: publicProcedure
    .input(z.object({ timestamp: z.number() }))
    .query(({ input }) => {
      try {
        const impacts = canadianEventsIntegration.calculateDemandImpact(
          new Date(input.timestamp)
        );
        return {
          success: true,
          data: impacts,
        };
      } catch (error) {
        logger.error('Failed to calculate demand impact:', error);
        return {
          success: false,
          error: 'Failed to calculate demand impact',
        };
      }
    }),
});
