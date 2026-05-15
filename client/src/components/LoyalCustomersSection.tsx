import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, MapPin, Phone, Package, Calendar, Image as ImageIcon } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { skipToken } from "@tanstack/react-query";
import { format } from "date-fns";

interface LoyalCustomersData {
  address: string;
  phone: string;
  orderCount: number;
  orders: Array<{
    id: number;
    orderNumber: string;
    customerName: string | null;
    deliveredAt: Date | null;
    receiptImage: string | null;
    formattedReceiptImage: string | null;
  }>;
}

interface LoyalCustomersSectionProps {
  dateRange: { startDate: Date; endDate: Date } | null;
}

export function LoyalCustomersSection({ dateRange }: LoyalCustomersSectionProps) {
  const [expandedAddresses, setExpandedAddresses] = useState<Set<string>>(new Set());
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

  // Fetch loyal customers data
  const { data: loyalCustomers = [], isLoading } = trpc.orders.getLoyalCustomers.useQuery(
    dateRange
      ? {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        }
      : skipToken,
    {
      enabled: !!dateRange,
    }
  );

  const toggleAddress = (address: string) => {
    const newExpanded = new Set(expandedAddresses);
    if (newExpanded.has(address)) {
      newExpanded.delete(address);
    } else {
      newExpanded.add(address);
    }
    setExpandedAddresses(newExpanded);
  };

  if (!dateRange) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500" />
          Loyal Customers
        </CardTitle>
        <CardDescription>
          Customers who placed more than 2 orders to the same address in the selected period
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading loyal customers...</div>
        ) : loyalCustomers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No loyal customers found for the selected period
          </div>
        ) : (
          <div className="space-y-3">
            {loyalCustomers.map((customer, idx) => (
              <div key={idx} className="border rounded-lg overflow-hidden">
                {/* Address Header */}
                <button
                  onClick={() => toggleAddress(customer.address)}
                  className="w-full p-4 bg-gradient-to-r from-red-50 to-pink-50 hover:from-red-100 hover:to-pink-100 transition-colors flex items-start justify-between"
                >
                  <div className="flex-1 text-left">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-gray-900">{customer.address}</p>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {customer.phone}
                          </span>
                          <Badge variant="secondary">
                            {customer.orderCount} orders
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-gray-400">
                    {expandedAddresses.has(customer.address) ? "−" : "+"}
                  </div>
                </button>

                {/* Expanded Orders List */}
                {expandedAddresses.has(customer.address) && (
                  <div className="p-4 bg-white border-t space-y-3">
                    {customer.orders.map((order) => (
                      <div key={order.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Order Info */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-blue-500" />
                              <span className="font-medium">Order #{order.orderNumber}</span>
                            </div>
                            {order.customerName && (
                              <p className="text-sm text-gray-600">
                                Customer: {order.customerName}
                              </p>
                            )}
                            {order.deliveredAt && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Calendar className="w-4 h-4" />
                                {format(new Date(order.deliveredAt), "MMM d, yyyy h:mm a")}
                              </div>
                            )}
                          </div>

                          {/* Receipt Preview */}
                          <div className="space-y-2">
                            {order.formattedReceiptImage || order.receiptImage ? (
                              <button
                                onClick={() =>
                                  setSelectedReceipt(
                                    order.formattedReceiptImage || order.receiptImage
                                  )
                                }
                                className="w-full flex items-center justify-center gap-2 p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded border border-blue-200 transition-colors text-sm font-medium"
                              >
                                <ImageIcon className="w-4 h-4" />
                                View Receipt
                              </button>
                            ) : (
                              <div className="p-2 bg-gray-200 text-gray-500 rounded text-sm text-center">
                                No receipt available
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Receipt Modal */}
      {selectedReceipt && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedReceipt(null)}
        >
          <div
            className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h3 className="font-semibold">Receipt</h3>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <img
                src={selectedReceipt}
                alt="Receipt"
                className="w-full h-auto rounded"
              />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
