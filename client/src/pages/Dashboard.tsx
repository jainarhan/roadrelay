import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Truck, Navigation, CheckCircle, ShieldAlert, AlertCircle, RefreshCw } from 'lucide-react';

interface DashboardSummary {
  activeVehicles: number;
  availableVehicles: number;
  vehiclesInMaintenance: number;
  activeTrips: number;
  pendingTrips: number;
  driversOnDuty: number;
  fleetUtilization: number;
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  const { data: summaryData, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.get<{ status: string; summary: DashboardSummary }>('/dashboard/summary'),
    refetchInterval: 30000, // Auto-refetch every 30 seconds
  });

  const summary = summaryData?.summary;

  const formatRole = (role?: string) => {
    if (!role) return '';
    return role.replace('_', ' ');
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Welcome back, <span className="font-semibold text-black">{user?.email}</span> (
            <span className="text-xs uppercase tracking-wider text-gray-700 font-bold">
              {formatRole(user?.role)}
            </span>
            ).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} />
            {isFetching ? 'REFRESHING...' : 'REFRESH'}
          </button>
          <span className="text-[10px] text-gray-500 font-medium italic">Auto-refreshes every 30s</span>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-gray-500 font-medium">Aggregating live fleet metrics...</div>
      ) : isError || !summary ? (
        <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-600 flex items-center gap-2 max-w-md">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>Failed to load live dashboard aggregates. Please check server connections.</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* HEADLINE: Fleet Utilization Card */}
          <div className="border-2 border-black bg-white p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Headline Metric</span>
                <h2 className="text-lg font-bold text-gray-900 uppercase tracking-tight">Fleet Utilization</h2>
                <p className="text-xs text-gray-600 max-w-md">
                  Percentage of non-retired vehicles actively dispatched on trips or currently receiving shop maintenance.
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-5xl font-extrabold tracking-tight text-black">{summary.fleetUtilization}%</span>
              </div>
            </div>
            
            {/* Simple progress bar */}
            <div className="mt-6 w-full bg-gray-200 h-4 border border-black overflow-hidden">
              <div
                className="bg-black h-full transition-all duration-500"
                style={{ width: `${Math.min(summary.fleetUtilization, 100)}%` }}
              />
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Active Vehicles Card */}
            <div className="border border-gray-300 bg-white p-6 shadow-sm flex items-start gap-4">
              <div className="bg-gray-100 p-3 text-gray-800 border border-gray-200">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Active Fleet</span>
                <div className="text-2xl font-bold text-gray-900 mt-1">{summary.activeVehicles}</div>
                <div className="text-xs text-gray-600 mt-1 font-medium">Non-retired fleet vehicles</div>
              </div>
            </div>

            {/* Available Vehicles Card */}
            <div className="border border-gray-300 bg-white p-6 shadow-sm flex items-start gap-4">
              <div className="bg-green-50 p-3 text-green-700 border border-green-200">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Available Vehicles</span>
                <div className="text-2xl font-bold text-green-700 mt-1">{summary.availableVehicles}</div>
                <div className="text-xs text-gray-600 mt-1 font-medium">Ready for dispatch scheduling</div>
              </div>
            </div>

            {/* Vehicles in Shop Card */}
            <div className="border border-gray-300 bg-white p-6 shadow-sm flex items-start gap-4">
              <div className="bg-amber-50 p-3 text-amber-700 border border-amber-200">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">In Shop Maintenance</span>
                <div className="text-2xl font-bold text-amber-700 mt-1">{summary.vehiclesInMaintenance}</div>
                <div className="text-xs text-gray-600 mt-1 font-medium">Active shop checkups & repairs</div>
              </div>
            </div>

            {/* Active Trips Card */}
            <div className="border border-gray-300 bg-white p-6 shadow-sm flex items-start gap-4">
              <div className="bg-blue-50 p-3 text-blue-700 border border-blue-200">
                <Navigation className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Dispatched Trips</span>
                <div className="text-2xl font-bold text-blue-700 mt-1">{summary.activeTrips}</div>
                <div className="text-xs text-gray-600 mt-1 font-medium">Trips currently in transit</div>
              </div>
            </div>

            {/* Pending Trips Card */}
            <div className="border border-gray-300 bg-white p-6 shadow-sm flex items-start gap-4">
              <div className="bg-gray-100 p-3 text-gray-600 border border-gray-200">
                <Navigation className="h-6 w-6 rotate-90" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Draft Trips</span>
                <div className="text-2xl font-bold text-gray-900 mt-1">{summary.pendingTrips}</div>
                <div className="text-xs text-gray-600 mt-1 font-medium">Scheduled but not dispatched</div>
              </div>
            </div>

            {/* Drivers On Duty Card */}
            <div className="border border-gray-300 bg-white p-6 shadow-sm flex items-start gap-4">
              <div className="bg-blue-50 p-3 text-blue-700 border border-blue-200">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Drivers On Trip</span>
                <div className="text-2xl font-bold text-blue-700 mt-1">{summary.driversOnDuty}</div>
                <div className="text-xs text-gray-600 mt-1 font-medium">Currently driving active routes</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Dashboard;
