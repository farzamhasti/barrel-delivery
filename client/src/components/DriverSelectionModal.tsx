import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Truck } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface DriverSelectionModalProps {
  isOpen: boolean;
  orderId: number;
  onClose: () => void;
  onAssign: (driverId: number) => void;
}

export function DriverSelectionModal({
  isOpen,
  orderId,
  onClose,
  onAssign,
}: DriverSelectionModalProps) {
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  // Fetch online drivers
  const { data: drivers = [] } = trpc.drivers.list.useQuery();
  const onlineDrivers = drivers.filter((d: any) => d.status === "online");

  // Mutation for assigning order
  const assignMutation = trpc.orders.assignDriver.useMutation({
    onSuccess: () => {
      if (selectedDriverId) {
        onAssign(selectedDriverId);
      }
      setSelectedDriverId(null);
      setIsAssigning(false);
      onClose();
    },
    onError: (error: any) => {
      console.error("Failed to assign order:", error);
      const errorMsg = error?.message || "Failed to assign order to driver";
      alert(errorMsg);
      setIsAssigning(false);
    },
  });

  const handleAssign = async () => {
    if (!selectedDriverId) return;

    setIsAssigning(true);
    try {
      await assignMutation.mutateAsync({
        orderId,
        driverId: selectedDriverId,
      });
    } catch (error) {
      console.error("Error assigning order:", error);
      setIsAssigning(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Order to Driver</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {onlineDrivers.length === 0 ? (
            <Card className="p-4 text-center">
              <p className="text-muted-foreground">No online drivers available</p>
            </Card>
          ) : (
            onlineDrivers.map((driver: any) => (
              <Card
                key={driver.id}
                className={`p-4 cursor-pointer transition-all border-2 ${
                  selectedDriverId === driver.id
                    ? "border-accent bg-accent/5"
                    : "border-border hover:border-accent/50"
                }`}
                onClick={() => setSelectedDriverId(driver.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-foreground">{driver.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {driver.vehicleType}
                    </p>
                  </div>
                  <Badge className="bg-green-500 hover:bg-green-600">Online</Badge>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    <span>{driver.phone}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Truck className="w-4 h-4" />
                    <span>{driver.licenseNumber}</span>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedDriverId || isAssigning}
            className="bg-accent hover:bg-accent/90"
          >
            {isAssigning ? "Assigning..." : "Assign Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
