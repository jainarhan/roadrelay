import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useTheme } from '../context/ThemeContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpDown, AlertCircle } from 'lucide-react';

interface FuelEfficiencyRow {
  vehicleId: string;
  regNumber: string;
  name: string;
  totalDistance: number;
  totalLiters: number;
  efficiency: number | null;
}

interface FleetUtilizationRow {
  vehicleType: string;
  totalVehicles: number;
  activeVehicles: number;
  utilizationPct: number;
}

interface OperationalCostRow {
  vehicleId: string;
  regNumber: string;
  name: string;
  totalFuelCost: number;
  totalMaintenanceCost: number;
  totalOperationalCost: number;
}

interface VehicleRoiRow {
  vehicleId: string;
  regNumber: string;
  name: string;
  totalRevenue: number;
  totalCost: number;
  acquisitionCost: number | null;
  roi: number | null;
  roiPercent: number | null;
}

type ReportType = 'fuel' | 'utilization' | 'cost' | 'roi';

export const Reports: React.FC = () => {
  const { theme } = useTheme();
  const [activeReport, setActiveReport] = useState<ReportType>('fuel');
  
  // Sorting states
  const [sortField, setSortField] = useState<string>('');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Queries
  const { data: fuelData, isLoading: isFuelLoading, isError: isFuelError } = useQuery({
    queryKey: ['report-fuel-efficiency'],
    queryFn: () => api.get<{ status: string; report: FuelEfficiencyRow[] }>('/reports/fuel-efficiency'),
    enabled: activeReport === 'fuel',
  });

  const { data: utilizationData, isLoading: isUtilLoading, isError: isUtilError } = useQuery({
    queryKey: ['report-fleet-utilization'],
    queryFn: () => api.get<{ status: string; report: FleetUtilizationRow[] }>('/reports/fleet-utilization'),
    enabled: activeReport === 'utilization',
  });

  const { data: costData, isLoading: isCostLoading, isError: isCostError } = useQuery({
    queryKey: ['report-operational-cost'],
    queryFn: () => api.get<{ status: string; report: OperationalCostRow[] }>('/reports/operational-cost'),
    enabled: activeReport === 'cost',
  });

  const { data: roiData, isLoading: isRoiLoading, isError: isRoiError } = useQuery({
    queryKey: ['report-vehicle-roi'],
    queryFn: () => api.get<{ status: string; report: VehicleRoiRow[] }>('/reports/vehicle-roi'),
    enabled: activeReport === 'roi',
  });

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const getSortedData = (data: any[]) => {
    if (!sortField) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      if (aVal === null || aVal === undefined) return sortAsc ? 1 : -1;
      if (bVal === null || bVal === undefined) return sortAsc ? -1 : 1;
      
      if (typeof aVal === 'string') {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortAsc ? aVal - bVal : bVal - aVal;
    });
  };

  // Recharts colors dynamically assigned depending on active theme
  const chartStyles = {
    gridColor: theme === 'dark' ? '#374151' : '#E5E7EB',
    axisColor: theme === 'dark' ? '#9CA3AF' : '#374151',
    barColor: theme === 'dark' ? '#FFFFFF' : '#000000',
    tooltipBg: theme === 'dark' ? '#1F2937' : '#FFFFFF',
    tooltipBorder: theme === 'dark' ? '#374151' : '#E5E7EB',
    tooltipLabel: theme === 'dark' ? '#9CA3AF' : '#374151',
    tooltipText: theme === 'dark' ? '#F3F4F6' : '#111827',
    cursorColor: theme === 'dark' ? 'rgba(55, 65, 81, 0.3)' : '#F9FAFB',
  };

  const renderFuelReport = () => {
    if (isFuelLoading) return <div className="py-12 text-center text-gray-500 dark:text-gray-400 font-medium">Loading fuel efficiency reports...</div>;
    if (isFuelError || !fuelData) return renderErrorMsg();

    const sorted = getSortedData(fuelData.report);
    // Filter out entries with null efficiency for the chart
    const chartData = fuelData.report
      .filter((r) => r.efficiency !== null)
      .map((r) => ({
        name: r.name,
        'Efficiency (km/L)': r.efficiency,
      }));

    return (
      <div className="space-y-8">
        {chartData.length > 0 && (
          <div className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">Fuel Efficiency by Vehicle</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartStyles.gridColor} />
                  <XAxis dataKey="name" stroke={chartStyles.axisColor} fontSize={11} tickLine={false} />
                  <YAxis stroke={chartStyles.axisColor} fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: chartStyles.tooltipBg, borderColor: chartStyles.tooltipBorder }}
                    labelStyle={{ color: chartStyles.tooltipLabel, fontWeight: 'bold' }}
                    itemStyle={{ color: chartStyles.tooltipText }}
                    cursor={{ fill: chartStyles.cursorColor }}
                  />
                  <Bar dataKey="Efficiency (km/L)" fill={chartStyles.barColor} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[11px]">
                <th className="px-6 py-3 border-r border-gray-200 dark:border-gray-700">
                  <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-black dark:hover:text-white">
                    Vehicle <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-6 py-3 border-r border-gray-200 dark:border-gray-700 text-right">
                  <button onClick={() => toggleSort('totalDistance')} className="flex items-center gap-1 justify-end w-full hover:text-black dark:hover:text-white">
                    Distance <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-6 py-3 border-r border-gray-200 dark:border-gray-700 text-right">
                  <button onClick={() => toggleSort('totalLiters')} className="flex items-center gap-1 justify-end w-full hover:text-black dark:hover:text-white">
                    Liters <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-6 py-3 text-right">
                  <button onClick={() => toggleSort('efficiency')} className="flex items-center gap-1 justify-end w-full hover:text-black dark:hover:text-white">
                    Efficiency <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400 font-medium">No vehicle data available.</td>
                </tr>
              ) : (
                sorted.map((r) => (
                  <tr key={r.vehicleId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700">
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{r.name}</div>
                      <div className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-0.5">{r.regNumber}</div>
                    </td>
                    <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 text-right font-medium text-gray-900 dark:text-gray-100">{r.totalDistance.toLocaleString()} km</td>
                    <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 text-right font-medium text-gray-900 dark:text-gray-100">{r.totalLiters.toLocaleString()} L</td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-gray-100">
                      {r.efficiency !== null ? `${r.efficiency.toFixed(2)} km/L` : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderUtilReport = () => {
    if (isUtilLoading) return <div className="py-12 text-center text-gray-500 dark:text-gray-400 font-medium">Loading fleet utilization reports...</div>;
    if (isUtilError || !utilizationData) return renderErrorMsg();

    const sorted = getSortedData(utilizationData.report);

    return (
      <div className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[11px]">
              <th className="px-6 py-3 border-r border-gray-200 dark:border-gray-700">
                <button onClick={() => toggleSort('vehicleType')} className="flex items-center gap-1 hover:text-black dark:hover:text-white">
                  Vehicle Type <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-6 py-3 border-r border-gray-200 dark:border-gray-700 text-right">
                <button onClick={() => toggleSort('totalVehicles')} className="flex items-center gap-1 justify-end w-full hover:text-black dark:hover:text-white">
                  Total Active <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-6 py-3 border-r border-gray-200 dark:border-gray-700 text-right">
                <button onClick={() => toggleSort('activeVehicles')} className="flex items-center gap-1 justify-end w-full hover:text-black dark:hover:text-white">
                  In Use (Trip/Shop) <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-6 py-3 text-right">
                <button onClick={() => toggleSort('utilizationPct')} className="flex items-center gap-1 justify-end w-full hover:text-black dark:hover:text-white">
                  Utilization Rate <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400 font-medium">No type-wise utilization data.</td>
              </tr>
            ) : (
              sorted.map((r) => (
                <tr key={r.vehicleType} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 font-semibold text-gray-900 dark:text-gray-100">{r.vehicleType}</td>
                  <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 text-right font-medium text-gray-900 dark:text-gray-100">{r.totalVehicles}</td>
                  <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 text-right font-medium text-gray-900 dark:text-gray-100">{r.activeVehicles}</td>
                  <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-gray-100">{r.utilizationPct}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderCostReport = () => {
    if (isCostLoading) return <div className="py-12 text-center text-gray-500 dark:text-gray-400 font-medium">Loading operational costs...</div>;
    if (isCostError || !costData) return renderErrorMsg();

    const sorted = getSortedData(costData.report);

    return (
      <div className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[11px]">
              <th className="px-6 py-3 border-r border-gray-200 dark:border-gray-700">
                <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-black dark:hover:text-white">
                  Vehicle <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-6 py-3 border-r border-gray-200 dark:border-gray-700 text-right">
                <button onClick={() => toggleSort('totalFuelCost')} className="flex items-center gap-1 justify-end w-full hover:text-black dark:hover:text-white">
                  Fuel cost <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-6 py-3 border-r border-gray-200 dark:border-gray-700 text-right">
                <button onClick={() => toggleSort('totalMaintenanceCost')} className="flex items-center gap-1 justify-end w-full hover:text-black dark:hover:text-white">
                  Maintenance Cost <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-6 py-3 text-right">
                <button onClick={() => toggleSort('totalOperationalCost')} className="flex items-center gap-1 justify-end w-full hover:text-black dark:hover:text-white">
                  Total cost <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400 font-medium">No operational cost data.</td>
              </tr>
            ) : (
              sorted.map((r) => (
                <tr key={r.vehicleId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">{r.name}</div>
                    <div className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-0.5">{r.regNumber}</div>
                  </td>
                  <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 text-right font-medium text-gray-900 dark:text-gray-100">${r.totalFuelCost.toLocaleString()}</td>
                  <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 text-right font-medium text-gray-900 dark:text-gray-100">${r.totalMaintenanceCost.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-gray-100">${r.totalOperationalCost.toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderRoiReport = () => {
    if (isRoiLoading) return <div className="py-12 text-center text-gray-500 dark:text-gray-400 font-medium">Loading ROI statistics...</div>;
    if (isRoiError || !roiData) return renderErrorMsg();

    const sorted = getSortedData(roiData.report);
    // Filter chart data to exclude null acquisitionCost/ROI
    const chartData = roiData.report
      .filter((r) => r.roiPercent !== null)
      .map((r) => ({
        name: r.name,
        'ROI (%)': r.roiPercent,
      }));

    return (
      <div className="space-y-8">
        {chartData.length > 0 && (
          <div className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">Vehicle ROI Rate (%)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartStyles.gridColor} />
                  <XAxis dataKey="name" stroke={chartStyles.axisColor} fontSize={11} tickLine={false} />
                  <YAxis stroke={chartStyles.axisColor} fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: chartStyles.tooltipBg, borderColor: chartStyles.tooltipBorder }}
                    labelStyle={{ color: chartStyles.tooltipLabel, fontWeight: 'bold' }}
                    itemStyle={{ color: chartStyles.tooltipText }}
                    cursor={{ fill: chartStyles.cursorColor }}
                  />
                  <Bar dataKey="ROI (%)" fill={chartStyles.barColor} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[11px]">
                <th className="px-6 py-3 border-r border-gray-200 dark:border-gray-700">
                  <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-black dark:hover:text-white">
                    Vehicle <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-6 py-3 border-r border-gray-200 dark:border-gray-700 text-right">
                  <button onClick={() => toggleSort('totalRevenue')} className="flex items-center gap-1 justify-end w-full hover:text-black dark:hover:text-white">
                    Revenue <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-6 py-3 border-r border-gray-200 dark:border-gray-700 text-right">
                  <button onClick={() => toggleSort('totalCost')} className="flex items-center gap-1 justify-end w-full hover:text-black dark:hover:text-white">
                    Total Cost <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-6 py-3 border-r border-gray-200 dark:border-gray-700 text-right">
                  <button onClick={() => toggleSort('acquisitionCost')} className="flex items-center gap-1 justify-end w-full hover:text-black dark:hover:text-white">
                    Acquisition Cost <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-6 py-3 text-right">
                  <button onClick={() => toggleSort('roiPercent')} className="flex items-center gap-1 justify-end w-full hover:text-black dark:hover:text-white">
                    Return on Investment <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400 font-medium">No ROI data.</td>
                </tr>
              ) : (
                sorted.map((r) => (
                  <tr key={r.vehicleId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700">
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{r.name}</div>
                      <div className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-0.5">{r.regNumber}</div>
                    </td>
                    <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 text-right font-medium text-gray-900 dark:text-gray-100">${r.totalRevenue.toLocaleString()}</td>
                    <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 text-right font-medium text-gray-900 dark:text-gray-100">${r.totalCost.toLocaleString()}</td>
                    <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 text-right font-medium text-gray-900 dark:text-gray-100">
                      {r.acquisitionCost !== null ? `$${r.acquisitionCost.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-gray-100">
                      {r.roiPercent !== null ? `${r.roiPercent >= 0 ? '+' : ''}${r.roiPercent}% (${r.roi})` : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderErrorMsg = () => (
    <div className="border border-red-200 dark:border-red-950 bg-red-50 dark:bg-red-950/20 p-4 text-sm text-red-600 dark:text-red-400 flex items-center gap-2 max-w-md">
      <AlertCircle className="h-5 w-5 shrink-0" />
      <span>Failed to compile report summaries. Please verify database connection.</span>
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Operational Reports</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 font-medium">Generate operational analyses, cost logs, and investment returns.</p>
      </div>

      {/* Report Tab Selectors */}
      <div className="mb-6 flex gap-4 border-b border-gray-300 dark:border-gray-700 overflow-x-auto">
        <button
          onClick={() => { setActiveReport('fuel'); setSortField(''); }}
          className={`pb-2.5 text-xs font-bold border-b-2 tracking-wide uppercase shrink-0 ${
            activeReport === 'fuel' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-450 dark:hover:text-white'
          }`}
        >
          Fuel Efficiency
        </button>
        <button
          onClick={() => { setActiveReport('utilization'); setSortField(''); }}
          className={`pb-2.5 text-xs font-bold border-b-2 tracking-wide uppercase shrink-0 ${
            activeReport === 'utilization' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-450 dark:hover:text-white'
          }`}
        >
          Type-wise Utilization
        </button>
        <button
          onClick={() => { setActiveReport('cost'); setSortField(''); }}
          className={`pb-2.5 text-xs font-bold border-b-2 tracking-wide uppercase shrink-0 ${
            activeReport === 'cost' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-450 dark:hover:text-white'
          }`}
        >
          Operational Cost
        </button>
        <button
          onClick={() => { setActiveReport('roi'); setSortField(''); }}
          className={`pb-2.5 text-xs font-bold border-b-2 tracking-wide uppercase shrink-0 ${
            activeReport === 'roi' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-450 dark:hover:text-white'
          }`}
        >
          Vehicle ROI
        </button>
      </div>

      {/* Render active report view */}
      {activeReport === 'fuel' && renderFuelReport()}
      {activeReport === 'utilization' && renderUtilReport()}
      {activeReport === 'cost' && renderCostReport()}
      {activeReport === 'roi' && renderRoiReport()}
    </div>
  );
};
export default Reports;
