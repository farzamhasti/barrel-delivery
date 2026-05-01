import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';
import { CheckCircle2, Clock, Calendar, Users, FileText } from 'lucide-react';

export function KitchenReservations() {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const { data: allReservations = [], refetch } = trpc.reservations.getAll.useQuery();
  const markDoneMutation = trpc.reservations.markDone.useMutation();

  // Filter reservations by selected date
  const filteredReservations = selectedDate
    ? allReservations.filter((r: any) => {
        const reservationDate = new Date(r.dateTime).toISOString().split('T')[0];
        return reservationDate === selectedDate;
      })
    : allReservations;

  // Auto-refetch every 5 seconds to keep data in sync
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 5000);
    return () => clearInterval(interval);
  }, [refetch]);

  const handleMarkDone = async (id: number) => {
    try {
      await markDoneMutation.mutateAsync({ id });
      refetch();
    } catch (error) {
      console.error('Error marking reservation as done:', error);
    }
  };

  const pendingReservations = filteredReservations?.filter((r: any) => r.status === 'Pending') || [];
  const doneReservations = filteredReservations?.filter((r: any) => r.status === 'Done') || [];

  return (
    <div className="space-y-8">
      {/* Date Filter */}
      <div className="flex items-center gap-2 bg-muted/50 p-4 rounded-lg">
        <Calendar className="h-5 w-5 text-muted-foreground" />
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-40"
          placeholder="Filter by date"
        />
        {selectedDate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedDate('')}
            className="text-xs"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Pending Reservations Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-6 w-6 text-orange-600" />
          <h2 className="text-2xl font-bold text-foreground">Pending Reservations</h2>
          <span className="ml-auto bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-semibold">
            {pendingReservations.length}
          </span>
        </div>

        {pendingReservations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingReservations.map((reservation: any) => (
              <Card key={reservation.id} className="p-6 border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
                <div className="space-y-4">
                  {/* Customer Name */}
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{reservation.customerName}</h3>
                  </div>

                  {/* Details Grid */}
                  <div className="space-y-3">
                    {/* Party Size */}
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-xs text-muted-foreground">Party Size</p>
                        <p className="text-sm font-semibold text-foreground">{reservation.partySize} people</p>
                      </div>
                    </div>

                    {/* Reservation Date */}
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="text-xs text-muted-foreground">Reservation Date</p>
                        <p className="text-sm font-semibold text-foreground">
                          {new Date(reservation.reservationDate).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Special Requests */}
                    {reservation.specialRequests && (
                      <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Special Requests</p>
                          <p className="text-sm text-foreground">{reservation.specialRequests}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2 pt-2">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                      {reservation.status}
                    </span>
                  </div>

                  {/* Done Button */}
                  <Button
                    onClick={() => handleMarkDone(reservation.id)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark as Done
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No pending reservations at the moment.</p>
          </Card>
        )}
      </div>

      {/* Done Reservations Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
          <h2 className="text-2xl font-bold text-foreground">Completed Reservations</h2>
          <span className="ml-auto bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
            {doneReservations.length}
          </span>
        </div>

        {doneReservations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {doneReservations.map((reservation: any) => (
              <Card key={reservation.id} className="p-6 border-l-4 border-l-green-500 opacity-75">
                <div className="space-y-4">
                  {/* Customer Name */}
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{reservation.customerName}</h3>
                  </div>

                  {/* Details Grid */}
                  <div className="space-y-3">
                    {/* Party Size */}
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-xs text-muted-foreground">Party Size</p>
                        <p className="text-sm font-semibold text-foreground">{reservation.partySize} people</p>
                      </div>
                    </div>

                    {/* Reservation Date */}
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="text-xs text-muted-foreground">Reservation Date</p>
                        <p className="text-sm font-semibold text-foreground">
                          {new Date(reservation.reservationDate).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Special Requests */}
                    {reservation.specialRequests && (
                      <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Special Requests</p>
                          <p className="text-sm text-foreground">{reservation.specialRequests}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2 pt-2">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                      {reservation.status}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No completed reservations yet.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
