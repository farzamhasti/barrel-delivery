import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface RegionStat {
  region: string;
  count: number;
}

interface RegionStatsTableProps {
  regionStats: RegionStat[];
}

export function RegionStatsTable({ regionStats }: RegionStatsTableProps) {
  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-semibold">Region</TableHead>
            <TableHead className="text-right font-semibold">Orders Delivered</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {regionStats.map((stat) => (
            <TableRow key={stat.region}>
              <TableCell className="font-medium">{stat.region}</TableCell>
              <TableCell className="text-right">{stat.count}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
