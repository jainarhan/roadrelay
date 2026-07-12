import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface Trip {
  id: string;
  source: string;
  destination: string;
  cargoWeight: number;
  plannedDistance: number;
  status: string;
  dispatchedAt: string | null;
  driverId: string;
}

export const MyTrips: React.FC = () => {
  const { user } = useAuth();

  const { data: tripsData, isLoading } = useQuery({
    queryKey: ['trips'],
    queryFn: () => api.get<{ status: string; trips: Trip[] }>('/trips'),
    enabled: !!user?.driverId, // Only fetch if user has a linked driverId
  });

  const formatDateDisplay = (dateString: string | null) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const base = "px-2.5 py-1 text-xs font-semibold uppercase tracking-wider border ";
    switch (status) {
      case 'DRAFT':
        return <span className={`${base} bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700`}>Scheduled</span>;
      case 'DISPATCHED':
        return <span className={`${base} bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-900/50`}>Active</span>;
      case 'COMPLETED':
        return <span className={`${base} bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-900/50`}>Completed</span>;
      case 'CANCELLED':
        return <span className={`${base} bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-900/50`}>Cancelled</span>;
      default:
        return <span className={`${base} bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600`}>{status}</span>;
    }
  };

  // 1. Edge Case: Driver role user has no linked driverId
  if (!user?.driverId) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">My Trips</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">View and track your assigned delivery routes.</p>
        </div>
        <div className="border border-amber-300 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 p-6 text-sm text-amber-800 dark:text-amber-400 shadow-sm font-semibold">
          Your account isn't linked to a driver profile — contact your fleet manager.
        </div>
      </div>
    );
  }

  const trips = tripsData?.trips || [];
  const myTrips = trips.filter((t) => t.driverId === user.driverId);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">My Trips</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">View and track your assigned delivery routes.</p>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-gray-500 dark:text-gray-400 font-medium">Loading your trip assignments...</div>
      ) : (
        <div className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[11px]">
                <th className="px-6 py-3 border-r border-gray-200 dark:border-gray-700">Source</th>
                <th className="px-6 py-3 border-r border-gray-200 dark:border-gray-700">Destination</th>
                <th className="px-6 py-3 border-r border-gray-200 dark:border-gray-700 text-right">Cargo Weight</th>
                <th className="px-6 py-3 border-r border-gray-200 dark:border-gray-700">Status</th>
                <th className="px-6 py-3">Dispatched At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {myTrips.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400 font-medium">
                    No trips currently assigned to you.
                  </td>
                </tr>
              ) : (
                myTrips.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 font-medium text-gray-900 dark:text-gray-100">{t.source}</td>
                    <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 font-medium text-gray-900 dark:text-gray-100">{t.destination}</td>
                    <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 text-right font-medium text-gray-900 dark:text-gray-100">
                      {t.cargoWeight.toLocaleString()} kg
                    </td>
                    <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700">{getStatusBadge(t.status)}</td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{formatDateDisplay(t.dispatchedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MyTrips;
