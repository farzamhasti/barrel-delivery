/**
 * Operational Intelligence Dashboard Component
 * Real-time operational monitoring and risk assessment
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, TrendingUp, TrendingDown, Activity, Zap } from 'lucide-react';

interface RiskMetrics {
  overloadProbability: number;
  delayProbability: number;
  staffingRisk: number;
  kitchenPressure: number;
  driverShortage: number;
  overallRiskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

interface OperationalMetrics {
  activeOrders: number;
  averageOrderTime: number;
  kitchenCapacity: number;
  kitchenUtilization: number;
  activeDrivers: number;
  ordersPerDriver: number;
  avgDeliveryTime: number;
  maxDeliveryTime: number;
}

/**
 * Operational Intelligence Dashboard
 * Displays real-time operational metrics and risk assessments
 */
export const OperationalIntelligenceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<OperationalMetrics | null>(null);
  const [risks, setRisks] = useState<RiskMetrics | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<string>('demand_surge');
  const [scenarioResult, setScenarioResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Sample metrics for demonstration
  useEffect(() => {
    const sampleMetrics: OperationalMetrics = {
      activeOrders: 28,
      averageOrderTime: 35,
      kitchenCapacity: 50,
      kitchenUtilization: 0.68,
      activeDrivers: 4,
      ordersPerDriver: 7,
      avgDeliveryTime: 22,
      maxDeliveryTime: 45,
    };

    setMetrics(sampleMetrics);

    // Simulate risk assessment
    const simulatedRisks: RiskMetrics = {
      overloadProbability: 0.45,
      delayProbability: 0.38,
      staffingRisk: 0.52,
      kitchenPressure: 0.68,
      driverShortage: 0.35,
      overallRiskScore: 0.48,
      riskLevel: 'medium',
      recommendations: [
        '⚠️ Kitchen at high capacity (68% utilization)',
        '→ Coordinate with kitchen staff',
        '→ Consider order pacing',
        '🚗 Driver utilization elevated',
        '→ Monitor driver status closely',
      ],
    };

    setRisks(simulatedRisks);
  }, []);

  const getRiskColor = (level: string): string => {
    switch (level) {
      case 'low':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'high':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'medium':
        return <Activity className="w-5 h-5 text-yellow-600" />;
      default:
        return <Zap className="w-5 h-5 text-green-600" />;
    }
  };

  const handleSimulateScenario = () => {
    setLoading(true);
    // Simulate scenario result
    setTimeout(() => {
      setScenarioResult({
        scenarioName: selectedScenario,
        severity: 'high',
        impactMetrics: {
          orderDelayIncrease: 80,
          driverUtilizationIncrease: 40,
          kitchenPressureIncrease: 150,
          costIncrease: 25,
        },
        recommendations: [
          'Activate surge protocol',
          'Call in additional drivers',
          'Increase kitchen staffing',
        ],
      });
      setLoading(false);
    }, 500);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Operational Intelligence</h1>
        <Badge className={`${getRiskColor(risks?.riskLevel || 'low')} flex items-center gap-2`}>
          {getRiskIcon(risks?.riskLevel || 'low')}
          {risks?.riskLevel.toUpperCase()} RISK
        </Badge>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Risk Score Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Overall Risk Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-4xl font-bold">
                    {(risks?.overallRiskScore || 0).toFixed(2)}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        (risks?.overallRiskScore || 0) > 0.75
                          ? 'bg-red-600'
                          : (risks?.overallRiskScore || 0) > 0.5
                            ? 'bg-orange-600'
                            : (risks?.overallRiskScore || 0) > 0.25
                              ? 'bg-yellow-600'
                              : 'bg-green-600'
                      }`}
                      style={{
                        width: `${((risks?.overallRiskScore || 0) * 100).toFixed(0)}%`,
                      }}
                    />
                  </div>
                  <p className="text-sm text-gray-600">
                    System is operating at {risks?.riskLevel.toUpperCase()} risk level
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* System Status Card */}
            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Active Orders</span>
                  <span className="text-2xl font-bold">{metrics?.activeOrders}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Active Drivers</span>
                  <span className="text-2xl font-bold">{metrics?.activeDrivers}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Avg Delivery Time</span>
                  <span className="text-2xl font-bold">{metrics?.avgDeliveryTime}m</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Risk Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Risk Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {[
                  { label: 'Overload Probability', value: risks?.overloadProbability || 0 },
                  { label: 'Delay Probability', value: risks?.delayProbability || 0 },
                  { label: 'Staffing Risk', value: risks?.staffingRisk || 0 },
                  { label: 'Kitchen Pressure', value: risks?.kitchenPressure || 0 },
                  { label: 'Driver Shortage', value: risks?.driverShortage || 0 },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">{item.label}</span>
                      <span className="text-sm font-semibold">{(item.value * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          item.value > 0.7
                            ? 'bg-red-600'
                            : item.value > 0.5
                              ? 'bg-orange-600'
                              : item.value > 0.25
                                ? 'bg-yellow-600'
                                : 'bg-green-600'
                        }`}
                        style={{ width: `${item.value * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics && [
              { label: 'Active Orders', value: metrics.activeOrders, unit: '' },
              { label: 'Avg Order Time', value: metrics.averageOrderTime, unit: 'min' },
              { label: 'Kitchen Utilization', value: (metrics.kitchenUtilization * 100).toFixed(0), unit: '%' },
              { label: 'Active Drivers', value: metrics.activeDrivers, unit: '' },
              { label: 'Orders per Driver', value: metrics.ordersPerDriver.toFixed(1), unit: '' },
              { label: 'Avg Delivery Time', value: metrics.avgDeliveryTime, unit: 'min' },
            ].map((metric) => (
              <Card key={metric.label}>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-2">{metric.label}</p>
                    <p className="text-3xl font-bold">
                      {metric.value}
                      <span className="text-lg text-gray-500 ml-1">{metric.unit}</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Scenarios Tab */}
        <TabsContent value="scenarios" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scenario Simulation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <label className="block text-sm font-medium">Select Scenario</label>
                <select
                  value={selectedScenario}
                  onChange={(e) => setSelectedScenario(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="heavy_snow">Heavy Snow</option>
                  <option value="demand_surge">Demand Surge</option>
                  <option value="driver_loss">Driver Loss</option>
                  <option value="major_sports_event">Major Sports Event</option>
                  <option value="system_failure">System Failure</option>
                  <option value="holiday_rush">Holiday Rush</option>
                </select>
              </div>

              <Button onClick={handleSimulateScenario} disabled={loading} className="w-full">
                {loading ? 'Simulating...' : 'Simulate Scenario'}
              </Button>

              {scenarioResult && (
                <div className={`p-4 rounded-lg border ${getRiskColor(scenarioResult.severity)}`}>
                  <h3 className="font-semibold mb-3">{scenarioResult.scenarioName}</h3>

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span>Order Delay Increase:</span>
                      <span className="font-semibold">
                        +{scenarioResult.impactMetrics.orderDelayIncrease}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Driver Utilization:</span>
                      <span className="font-semibold">
                        +{scenarioResult.impactMetrics.driverUtilizationIncrease}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Kitchen Pressure:</span>
                      <span className="font-semibold">
                        +{scenarioResult.impactMetrics.kitchenPressureIncrease}%
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    {scenarioResult.recommendations.map((rec: string, idx: number) => (
                      <p key={idx} className="text-sm">
                        {rec}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              {risks && risks.recommendations.length > 0 ? (
                <div className="space-y-2">
                  {risks.recommendations.map((rec, idx) => (
                    <Alert key={idx} className="border-l-4">
                      <AlertDescription>{rec}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No active recommendations at this time.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
