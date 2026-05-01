'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { trpc } from '@/lib/trpc';
import { Trash2, Edit2, Plus, Calendar, Users, FileText, Tag } from 'lucide-react';
import { CustomDateTimePicker } from '@/components/CustomDateTimePicker';

export function Reservations() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    reservationDate: '',
    partySize: '',
    specialRequests: '',
  });

  const { data: allReservations = [], refetch } = trpc.reservations.getAll.useQuery();
  const createMutation = trpc.reservations.create.useMutation();
  const updateMutation = trpc.reservations.update.useMutation();
  const deleteMutation = trpc.reservations.delete.useMutation();

  // Filter reservations by selected date
  const filteredReservations = selectedDate
    ? allReservations.filter((r: any) => {
        const reservationDate = new Date(r.reservationDate).toISOString().split('T')[0];
        return reservationDate === selectedDate;
      })
    : allReservations;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const reservationDate = new Date(formData.reservationDate);
      
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          customerName: formData.customerName,
          customerPhone: formData.customerPhone,
          customerEmail: formData.customerEmail,
          reservationDate,
          partySize: parseInt(formData.partySize),
          specialRequests: formData.specialRequests,
        });
      } else {
        await createMutation.mutateAsync({
          customerName: formData.customerName,
          customerPhone: formData.customerPhone,
          customerEmail: formData.customerEmail,
          reservationDate,
          partySize: parseInt(formData.partySize),
          specialRequests: formData.specialRequests,
        });
      }
      
      setFormData({ customerName: '', customerPhone: '', customerEmail: '', reservationDate: '', partySize: '', specialRequests: '' });
      setEditingId(null);
      setIsFormOpen(false);
      refetch();
      setSelectedDate(''); // Reset date filter after creating
    } catch (error) {
      console.error('Error saving reservation:', error);
    }
  };

  const handleEdit = (reservation: any) => {
    setEditingId(reservation.id);
    setFormData({
      customerName: reservation.customerName,
      customerPhone: reservation.customerPhone,
      customerEmail: reservation.customerEmail || '',
      reservationDate: new Date(reservation.reservationDate).toISOString().slice(0, 16),
      partySize: reservation.partySize.toString(),
      specialRequests: reservation.specialRequests || '',
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this reservation?')) {
      try {
        await deleteMutation.mutateAsync({ id });
        refetch();
      } catch (error) {
        console.error('Error deleting reservation:', error);
      }
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setFormData({ customerName: '', customerPhone: '', customerEmail: '', reservationDate: '', partySize: '', specialRequests: '' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Reservations</h2>
          <div className="mt-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
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
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsFormOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              New Reservation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Reservation' : 'Create New Reservation'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  <Tag className="h-4 w-4 inline mr-2" />
                  Customer Name
                </label>
                <Input
                  type="text"
                  placeholder="e.g., John Doe"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  <Users className="h-4 w-4 inline mr-2" />
                  Customer Phone
                </label>
                <Input
                  type="number"                  placeholder="e.g., 555-1234"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  required
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  <Calendar className="h-4 w-4 inline mr-2" />
                  Customer Email
                </label>
                <Input
                  type="email"
                  placeholder="e.g., john@example.com"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  <Calendar className="h-4 w-4 inline mr-2" />
                  Reservation Date & Time
                </label>
                <Input
                  type="datetime-local"
                  value={formData.reservationDate}
                  onChange={(e) => setFormData({ ...formData, reservationDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  <Users className="h-4 w-4 inline mr-2" />
                  Party Size
                </label>
                <Input
                  type="number"
                  placeholder="e.g., 20"
                  value={formData.partySize}
                  onChange={(e) => setFormData({ ...formData, partySize: e.target.value })}
                  required
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  <FileText className="h-4 w-4 inline mr-2" />
                  Special Requests
                </label>
                <textarea
                  placeholder="Special requests or notes"
                  value={formData.specialRequests}
                  onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md text-foreground bg-background"
                  rows={3}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleCloseForm} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                  {editingId ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Reservations Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Event Type</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">People</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Date & Time</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Description</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReservations && filteredReservations.length > 0 ? (
                filteredReservations.map((reservation: any) => (
                  <tr key={reservation.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-foreground">{reservation.eventType}</td>
                    <td className="px-6 py-4 text-sm text-foreground">{reservation.numberOfPeople}</td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {new Date(reservation.dateTime).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground max-w-xs truncate">
                      {reservation.description || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        reservation.status === 'Pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {reservation.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(reservation)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(reservation.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-muted-foreground">
                    No reservations yet. Create one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
