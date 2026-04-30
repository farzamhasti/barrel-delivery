import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { trpc } from '@/lib/trpc';
import { Trash2, Edit2, Plus, Calendar, Users, FileText, Tag } from 'lucide-react';

export function Reservations() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    eventType: '',
    numberOfPeople: '',
    dateTime: '',
    description: '',
  });

  const { data: reservations, refetch } = trpc.reservations.getAll.useQuery();
  const createMutation = trpc.reservations.create.useMutation();
  const updateMutation = trpc.reservations.update.useMutation();
  const deleteMutation = trpc.reservations.delete.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const dateTime = new Date(formData.dateTime);
      
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          eventType: formData.eventType,
          numberOfPeople: parseInt(formData.numberOfPeople),
          dateTime,
          description: formData.description,
        });
      } else {
        await createMutation.mutateAsync({
          eventType: formData.eventType,
          numberOfPeople: parseInt(formData.numberOfPeople),
          dateTime,
          description: formData.description,
        });
      }
      
      setFormData({ eventType: '', numberOfPeople: '', dateTime: '', description: '' });
      setEditingId(null);
      setIsFormOpen(false);
      refetch();
    } catch (error) {
      console.error('Error saving reservation:', error);
    }
  };

  const handleEdit = (reservation: any) => {
    setEditingId(reservation.id);
    setFormData({
      eventType: reservation.eventType,
      numberOfPeople: reservation.numberOfPeople.toString(),
      dateTime: new Date(reservation.dateTime).toISOString().slice(0, 16),
      description: reservation.description || '',
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
    setFormData({ eventType: '', numberOfPeople: '', dateTime: '', description: '' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Reservations</h2>
        <Dialog open={isFormOpen} onOpenChange={(open) => !open && handleCloseForm()}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
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
                  Event Type
                </label>
                <Input
                  type="text"
                  placeholder="e.g., Birthday Party, Wedding"
                  value={formData.eventType}
                  onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  <Users className="h-4 w-4 inline mr-2" />
                  Number of People
                </label>
                <Input
                  type="number"
                  placeholder="e.g., 20"
                  value={formData.numberOfPeople}
                  onChange={(e) => setFormData({ ...formData, numberOfPeople: e.target.value })}
                  required
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  <Calendar className="h-4 w-4 inline mr-2" />
                  Date & Time
                </label>
                <Input
                  type="datetime-local"
                  value={formData.dateTime}
                  onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  <FileText className="h-4 w-4 inline mr-2" />
                  Description
                </label>
                <textarea
                  placeholder="Special requests or notes"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reservations && reservations.length > 0 ? (
                reservations.map((reservation: any) => (
                  <tr key={reservation.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-foreground">{reservation.eventType}</td>
                    <td className="px-6 py-4 text-sm text-foreground">{reservation.numberOfPeople}</td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {new Date(reservation.dateTime).toLocaleString()}
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
