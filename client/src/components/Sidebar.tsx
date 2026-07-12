import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { RoleGate } from './RoleGate';
import { LayoutDashboard, Truck, Users, MapPin, Wrench, Fuel, BarChart3, LogOut, Sun, Moon } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  if (!user) return null;

  const activeStyle = "flex items-center gap-3 bg-gray-200 dark:bg-gray-700 text-black dark:text-white px-3 py-2 text-sm font-semibold border-l-4 border-black dark:border-white";
  const inactiveStyle = "flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-2 text-sm font-medium border-l-4 border-transparent";

  return (
    <div className="flex h-screen w-64 flex-col border-r border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors duration-200">
      {/* Header */}
      <div className="border-b border-gray-300 dark:border-gray-700 px-6 py-4">
        <span className="text-lg font-bold tracking-wider text-black dark:text-white uppercase">TransitOps</span>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 space-y-1 py-4">
        <NavLink
          to="/"
          className={({ isActive }) => (isActive ? activeStyle : inactiveStyle)}
        >
          <LayoutDashboard className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          Dashboard
        </NavLink>

        <RoleGate roles={['FLEET_MANAGER']}>
          <NavLink
            to="/vehicles"
            className={({ isActive }) => (isActive ? activeStyle : inactiveStyle)}
          >
            <Truck className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            Vehicles
          </NavLink>
        </RoleGate>

        <RoleGate roles={['FLEET_MANAGER', 'SAFETY_OFFICER']}>
          <NavLink
            to="/drivers"
            className={({ isActive }) => (isActive ? activeStyle : inactiveStyle)}
          >
            <Users className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            Drivers
          </NavLink>
        </RoleGate>

        <RoleGate roles={['FLEET_MANAGER']}>
          <NavLink
            to="/trips"
            className={({ isActive }) => (isActive ? activeStyle : inactiveStyle)}
          >
            <MapPin className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            Trips
          </NavLink>
        </RoleGate>

        <RoleGate roles={['DRIVER']}>
          <NavLink
            to="/my-trips"
            className={({ isActive }) => (isActive ? activeStyle : inactiveStyle)}
          >
            <MapPin className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            My Trips
          </NavLink>
        </RoleGate>

        <RoleGate roles={['FLEET_MANAGER', 'SAFETY_OFFICER']}>
          <NavLink
            to="/maintenance"
            className={({ isActive }) => (isActive ? activeStyle : inactiveStyle)}
          >
            <Wrench className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            Maintenance
          </NavLink>
        </RoleGate>

        <RoleGate roles={['FLEET_MANAGER', 'FINANCIAL_ANALYST']}>
          <NavLink
            to="/fuel-expenses"
            className={({ isActive }) => (isActive ? activeStyle : inactiveStyle)}
          >
            <Fuel className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            Fuel & Expenses
          </NavLink>
        </RoleGate>

        <RoleGate roles={['FLEET_MANAGER', 'FINANCIAL_ANALYST']}>
          <NavLink
            to="/reports"
            className={({ isActive }) => (isActive ? activeStyle : inactiveStyle)}
          >
            <BarChart3 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            Reports
          </NavLink>
        </RoleGate>
      </nav>

      {/* User Info & Logout */}
      <div className="border-t border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
        <div className="mb-3">
          <div className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{user.email}</div>
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-0.5">
            {user.role.replace('_', ' ')}
          </div>
        </div>
        <button
          onClick={toggleTheme}
          className="flex w-full items-center justify-center gap-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 mb-2"
        >
          {theme === 'light' ? (
            <>
              <Moon className="h-3 w-3" />
              DARK MODE
            </>
          ) : (
            <>
              <Sun className="h-3 w-3" />
              LIGHT MODE
            </>
          )}
        </button>
        <button
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <LogOut className="h-3 w-3" />
          SIGN OUT
        </button>
      </div>
    </div>
  );
};
