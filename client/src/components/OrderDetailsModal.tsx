import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye } from "lucide-react";

interface Order {
  id: number;
  orderNumber: string;
  customerAddress?: string;
  customerPhone?: string;
  customerLatitude?: string;
  customerLongitude?: string;
}

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  orders: Order[];
  type: "inside" | "outside";
}

export function OrderDetailsModal({
  isOpen,
  onClose,
  title,
  orders,
  type,
}: OrderDetailsModalProps) {
  const borderColor = type === "inside" ? "border-green-200" : "border-orange-200";
  const headerBg = type === "inside" ? "bg-green-50" : "bg-orange-50";
  const headerText = type === "inside" ? "text-green-900" : "text-orange-900";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${headerText}`}>
            <Eye className="w-5 h-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {orders.length} order{orders.length !== 1 ? "s" : ""} {type === "inside" ? "inside" : "outside"} the competitor buffer zone
          </DialogDescription>
        </DialogHeader>

        <div className={`rounded-lg border ${borderColor} overflow-hidden`}>
          {orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={`${headerBg} sticky top-0`}>
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Order #</th>
                    <th className="px-4 py-3 text-left font-semibold">Address</th>
                    <th className="px-4 py-3 text-left font-semibold">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, idx) => (
                    <tr
                      key={order.id}
                      className={`border-t ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-gray-100 transition-colors`}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        #{order.orderNumber}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {order.customerAddress || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {order.customerPhone || "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              <p>No orders {type === "inside" ? "inside" : "outside"} the buffer zone</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
