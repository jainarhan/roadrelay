import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

export const Unauthorized: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-6 text-center transition-colors duration-200">
      <div className="border border-red-200 dark:border-red-950 bg-red-50 dark:bg-red-950/20 p-8 max-w-md shadow-sm">
        <ShieldAlert className="mx-auto h-12 w-12 text-red-600 dark:text-red-400 mb-4" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Access Denied</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Your role does not have the required permissions to access this page. If you believe this is a mistake, contact your administrator.
        </p>
        <button
          onClick={() => navigate('/')}
          className="bg-black dark:bg-white px-4 py-2 text-xs font-semibold text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100"
        >
          GO TO DASHBOARD
        </button>
      </div>
    </div>
  );
};
export default Unauthorized;
