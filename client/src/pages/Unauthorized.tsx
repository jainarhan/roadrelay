import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

export const Unauthorized: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-gray-50 p-6 text-center">
      <div className="border border-red-200 bg-red-50 p-8 max-w-md shadow-sm">
        <ShieldAlert className="mx-auto h-12 w-12 text-red-600 mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-sm text-gray-600 mb-6">
          Your role does not have the required permissions to access this page. If you believe this is a mistake, contact your administrator.
        </p>
        <button
          onClick={() => navigate('/')}
          className="bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800"
        >
          GO TO DASHBOARD
        </button>
      </div>
    </div>
  );
};
export default Unauthorized;
