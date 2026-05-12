import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, TrendingUp, Users, Zap, AlertCircle, BarChart3 } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface EmergingZonesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EmergingZonesModal({ isOpen, onClose }: EmergingZonesModalProps) {
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const { data: zonesData, isLoading } = trpc.analytics.analyzeEmergingZones.useQuery();

  if (!isOpen) return null;

  const zones = zonesData?.zones || [];
  const selectedZone = zones.find(z => z.zoneId === selectedZoneId) || zones[0];

  const getClassificationBadgeColor = (classification: string) => {
    switch (classification) {
      case "rapid_emerging":
        return "bg-green-100 text-green-800 border border-green-300";
      case "early_growth":
        return "bg-blue-100 text-blue-800 border border-blue-300";
      case "stable":
        return "bg-gray-100 text-gray-800 border border-gray-300";
      case "saturated":
        return "bg-orange-100 text-orange-800 border border-orange-300";
      case "declining":
        return "bg-red-100 text-red-800 border border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-300";
    }
  };

  const getClassificationDescription = (classification: string) => {
    switch (classification) {
      case "rapid_emerging":
        return "Rapidly emerging market with strong growth potential. High priority for expansion.";
      case "early_growth":
        return "Early-stage growth zone showing positive momentum. Good opportunity for investment.";
      case "stable":
        return "Mature, stable market with consistent demand. Reliable revenue source.";
      case "saturated":
        return "Market saturation detected. Consider optimization strategies.";
      case "declining":
        return "Declining demand. May require market repositioning or service adjustments.";
      default:
        return "Zone analysis in progress.";
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="w-6 h-6" />
              Emerging Demand Zones Detection
            </h2>
            <p className="text-gray-600 mt-1">
              Identify high-growth delivery areas and market opportunities using spatial and temporal analysis
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Analyzing emerging zones...</p>
              </div>
            </div>
          ) : zones.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No emerging zones detected yet. More data needed for analysis.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Zone List */}
              <div className="lg:col-span-1">
                <h3 className="text-lg font-semibold mb-4">Detected Zones</h3>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {zones.map((zone, idx) => (
                    <button
                      key={zone.zoneId}
                      onClick={() => setSelectedZoneId(zone.zoneId)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                        selectedZoneId === zone.zoneId || (!selectedZoneId && idx === 0)
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">Zone {idx + 1}</p>
                          <p className="text-xs text-gray-600">
                            {zone.totalOrders} orders
                          </p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${getClassificationBadgeColor(zone.classification)}`}>
                          {(zone.emergingScore * 100).toFixed(0)}%
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Zone Details */}
              <div className="lg:col-span-2 space-y-4">
                {selectedZone && (
                  <>
                    {/* Classification Card */}
                    <Card className="border-0 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <AlertCircle className="w-5 h-5" />
                          Zone Classification
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className={`inline-block px-4 py-2 rounded-lg font-semibold ${getClassificationBadgeColor(selectedZone.classification)}`}>
                            {selectedZone.classification.replace(/_/g, " ").toUpperCase()}
                          </div>
                        </div>
                        <p className="text-gray-700">
                          {getClassificationDescription(selectedZone.classification)}
                        </p>
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                          <div>
                            <p className="text-sm text-gray-600">Overall Score</p>
                            <p className="text-2xl font-bold text-blue-600">
                              {(selectedZone.emergingScore * 100).toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Growth Velocity</p>
                            <p className="text-2xl font-bold text-green-600">
                              {(selectedZone.growthVelocity * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Demand Metrics */}
                    <Card className="border-0 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <BarChart3 className="w-5 h-5" />
                          Demand Metrics
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-blue-50 rounded-lg p-4">
                            <p className="text-sm text-gray-600 mb-1">Total Orders</p>
                            <p className="text-2xl font-bold text-blue-600">{selectedZone.totalOrders}</p>
                          </div>
                          <div className="bg-green-50 rounded-lg p-4">
                            <p className="text-sm text-gray-600 mb-1">New Customers</p>
                            <p className="text-2xl font-bold text-green-600">{selectedZone.newCustomerCount}</p>
                          </div>
                          <div className="bg-purple-50 rounded-lg p-4">
                            <p className="text-sm text-gray-600 mb-1">Repeat Customers</p>
                            <p className="text-2xl font-bold text-purple-600">{selectedZone.repeatCustomerCount}</p>
                          </div>
                          <div className="bg-orange-50 rounded-lg p-4">
                            <p className="text-sm text-gray-600 mb-1">Avg Delivery Time</p>
                            <p className="text-2xl font-bold text-orange-600">{selectedZone.avgDeliveryDuration.toFixed(1)} min</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Scoring Factors */}
                    <Card className="border-0 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Zap className="w-5 h-5" />
                          Scoring Factors
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {[
                            { label: "Demand Acceleration", value: selectedZone.demandAcceleration, icon: "📈" },
                            { label: "New Customer Growth", value: selectedZone.newCustomerGrowth, icon: "👥" },
                            { label: "Residential Expansion", value: selectedZone.residentialExpansion, icon: "🏘️" },
                            { label: "Delivery Feasibility", value: selectedZone.deliveryFeasibility, icon: "🚗" },
                            { label: "Competitor Saturation", value: selectedZone.competitorSaturation, icon: "🏪" },
                          ].map((factor, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{factor.icon}</span>
                                <span className="text-sm font-medium text-gray-700">{factor.label}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full"
                                    style={{ width: `${Math.min(factor.value * 100, 100)}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm font-semibold text-gray-900 w-12 text-right">
                                  {(factor.value * 100).toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Market Insights */}
                    <Card className="border-0 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <MapPin className="w-5 h-5" />
                          Market Insights
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="bg-blue-50 rounded-lg p-3 border-l-4 border-blue-500">
                          <p className="text-sm font-medium text-blue-900">Location</p>
                          <p className="text-sm text-blue-700 mt-1">
                            Lat: {selectedZone.centerLat.toFixed(4)}, Lng: {selectedZone.centerLng.toFixed(4)}
                          </p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3 border-l-4 border-green-500">
                          <p className="text-sm font-medium text-green-900">Competitors</p>
                          <p className="text-sm text-green-700 mt-1">
                            {selectedZone.competitorCount} competitors detected in this zone
                          </p>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-3 border-l-4 border-purple-500">
                          <p className="text-sm font-medium text-purple-900">Recommendation</p>
                          <p className="text-sm text-purple-700 mt-1">
                            {selectedZone.classification === "rapid_emerging"
                              ? "High priority for expansion. Strong growth indicators suggest immediate investment opportunity."
                              : selectedZone.classification === "early_growth"
                              ? "Good opportunity for market penetration. Monitor growth trends closely."
                              : selectedZone.classification === "stable"
                              ? "Maintain current service levels. Focus on customer retention."
                              : selectedZone.classification === "saturated"
                              ? "Consider service optimization and competitive differentiation strategies."
                              : "Evaluate market repositioning or service adjustments."}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
