import React from 'react';
import { useAuth } from '../context/AuthContext';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">Welcome to TransitOps operational command center.</p>
      </div>

      <div className="border border-gray-300 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Current Session Details</h2>
        <div className="grid grid-cols-2 gap-4 max-w-lg text-sm">
          <div className="font-semibold text-gray-600">Logged In User:</div>
          <div className="text-gray-900">{user.email}</div>
          
          <div className="font-semibold text-gray-600">Assigned Role:</div>
          <div className="font-mono text-gray-900 bg-gray-100 px-2 py-0.5 inline-block text-xs uppercase tracking-wider">
            {user.role}
          </div>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
