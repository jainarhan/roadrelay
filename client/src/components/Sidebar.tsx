import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { RoleGate } from './RoleGate';
import { LayoutDashboard, Truck, Users, MapPin, Wrench, Fuel, BarChart3, LogOut } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const activeStyle = "flex items-center gap-3 bg-gray-200 text-black px-3 py-2 text-sm font-semibold border-l-4 border-black";
  const inactiveStyle = "flex items-center gap-3 text-gray-700 hover:bg-gray-100 px-3 py-2 text-sm font-medium border-l-4 border-transparent";

  return (
    <div className="flex h-screen w-64 flex-col border-r border-gray-300 bg-white">
      {/* Header */}
      <div className="border-b border-gray-300 px-6 py-4">
        <span className="text-lg font-bold tracking-wider text-black uppercase">TransitOps</span>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 space-y-1 py-4">
        <NavLink
          to="/"
          className={({ isActive }) => (isActive ? activeStyle : inactiveStyle)}
        >
          <LayoutDashboard className="h-4 w-4 text-gray-500" />
          Dashboard
        </NavLink>

        <RoleGate roles={['FLEET_MANAGER']}>
          <NavLink
            to="/vehicles"
            className={({ isActive }) => (isActive ? activeStyle : inactiveStyle)}
          >
            <Truck className="h-4 w-4 text-gray-500" />
            Vehicles
          </NavLink>
        </RoleGate>

        <RoleGate roles={['FLEET_MANAGER', 'SAFETY_OFFICER']}>
          <NavLink
            to="/drivers"
            className={({ isActive }) => (isActive ? activeStyle : inactiveStyle)}
          >
            <Users className="h-4 w-4 text-gray-500" />
            Drivers
          </NavLink>
        </RoleGate>

        <RoleGate roles={['FLEET_MANAGER']}>
          <NavLink
            to="/trips"
            className={({ isActive }) => (isActive ? activeStyle : inactiveStyle)}
          >
            <MapPin className="h-4 w-4 text-gray-500" />
            Trips
          </NavLink>
        </RoleGate>

        <RoleGate roles={['FLEET_MANAGER', 'SAFETY_OFFICER']}>
          <NavLink
            to="/maintenance"
            className={({ isActive }) => (isActive ? activeStyle : inactiveStyle)}
          >
            <Wrench className="h-4 w-4 text-gray-500" />
            Maintenance
          </NavLink>
        </RoleGate>

        <RoleGate roles={['FLEET_MANAGER', 'FINANCIAL_ANALYST']}>
          <NavLink
            to="/fuel-expenses"
            className={({ isActive }) => (isActive ? activeStyle : inactiveStyle)}
          >
            <Fuel className="h-4 w-4 text-gray-500" />
            Fuel & Expenses
          </NavLink>
        </RoleGate>

        <RoleGate roles={['FLEET_MANAGER', 'FINANCIAL_ANALYST']}>
          <NavLink
            to="/reports"
            className={({ isActive }) => (isActive ? activeStyle : inactiveStyle)}
          >
            <BarChart3 className="h-4 w-4 text-gray-500" />
            Reports
          </NavLink>
        </RoleGate>
      </nav>

      {/* User Info & Logout */}
      <div className="border-t border-gray-300 bg-gray-50 p-4">
        <div className="mb-3">
          <div className="truncate text-sm font-semibold text-gray-900">{user.email}</div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-0.5">
            {user.role.replace('_', ' ')}
          </div>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 border border-gray-300 bg-white py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
        >
          <LogOut className="h-3 w-3" />
          SIGN OUT
        </button>
      </div>
    </div>
  );
};
