import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function ReservationManagement() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    eventType: "",
    numberOfPeople: "",
    details: "",
    eventDate: "",
    eventTime: "",
  });

  const { data: reservations = [], refetch } = trpc.reservations.list.useQuery();
  const createMutation = trpc.reservations.create.useMutation({
    onSuccess: () => {
      toast.success("Reservation created successfully");
      setFormData({
        eventType: "",
        numberOfPeople: "",
        details: "",
        eventDate: "",
        eventTime: "",
      });
      setIsOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create reservation: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.eventType || !formData.numberOfPeople || !formData.eventDate || !formData.eventTime) {
      toast.error("Please fill in all required fields");
      return;
    }

    createMutation.mutate({
      eventType: formData.eventType,
      numberOfPeople: parseInt(formData.numberOfPeople),
      details: formData.details,
      eventDate: formData.eventDate,
      eventTime: formData.eventTime,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Reservations</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Reservation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Reservation</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Event Type *</label>
                <Input
                  placeholder="e.g., Birthday, Anniversary, Wedding"
                  value={formData.eventType}
                  onChange={(e) =>
                    setFormData({ ...formData, eventType: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Number of People *</label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Enter number of people"
                  value={formData.numberOfPeople}
                  onChange={(e) =>
                    setFormData({ ...formData, numberOfPeople: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Event Date *</label>
                <Input
                  type="date"
                  value={formData.eventDate}
                  onChange={(e) =>
                    setFormData({ ...formData, eventDate: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Event Time *</label>
                <Input
                  type="time"
                  value={formData.eventTime}
                  onChange={(e) =>
                    setFormData({ ...formData, eventTime: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Details</label>
                <Textarea
                  placeholder="e.g., Only pizza and salad, Custom menu, etc."
                  value={formData.details}
                  onChange={(e) =>
                    setFormData({ ...formData, details: e.target.value })
                  }
                />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Reservation"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {reservations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No reservations yet
          </div>
        ) : (
          reservations.map((reservation) => (
            <ReservationCard key={reservation.id} reservation={reservation} onRefresh={refetch} />
          ))
        )}
      </div>
    </div>
  );
}

function ReservationCard({
  reservation,
  onRefresh,
}: {
  reservation: any;
  onRefresh: () => void;
}) {
  const updateStatusMutation = trpc.reservations.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Reservation status updated");
      onRefresh();
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{reservation.eventType}</h3>
          <p className="text-sm text-muted-foreground">
            {reservation.numberOfPeople} people
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            reservation.status === "completed"
              ? "bg-green-100 text-green-800"
              : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {reservation.status}
        </span>
      </div>

      {reservation.details && (
        <p className="text-sm text-muted-foreground">{reservation.details}</p>
      )}

      <div className="flex items-center gap-4 text-sm">
        <span className="text-muted-foreground">
          📅 {new Date(reservation.eventDate).toLocaleDateString()}
        </span>
        <span className="text-muted-foreground">
          🕐 {reservation.eventTime}
        </span>
      </div>

      {reservation.status === "pending" && (
        <Button
          size="sm"
          variant="default"
          onClick={() =>
            updateStatusMutation.mutate({
              id: reservation.id,
              status: "completed",
            })
          }
          disabled={updateStatusMutation.isPending}
        >
          {updateStatusMutation.isPending ? "Updating..." : "Mark as Done"}
        </Button>
      )}
    </div>
  );
}
