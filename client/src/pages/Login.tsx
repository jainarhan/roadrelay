import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginInput } from 'shared';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get the target URL from navigation state, defaulting to dashboard
  const from = (location.state as any)?.from?.pathname || '/';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setApiError(null);
    setIsSubmitting(true);
    try {
      await login(data.email, data.password);
      navigate(from, { replace: true });
    } catch (error: any) {
      setApiError(error.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md border border-gray-300 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">TransitOps</h1>
          <p className="mt-1 text-sm text-gray-600">Sign in to manage your transit fleet</p>
        </div>

        {apiError && (
          <div className="mb-4 border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
              Email Address
            </label>
            <input
              type="email"
              {...register('email')}
              placeholder="e.g. manager@transitops.com"
              className="mt-1 block w-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600 font-medium">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
              Password
            </label>
            <input
              type="password"
              {...register('password')}
              placeholder="••••••••"
              className="mt-1 block w-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-600 font-medium">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-black py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:bg-gray-400"
          >
            {isSubmitting ? 'SIGNING IN...' : 'SIGN IN'}
          </button>
        </form>

        <div className="mt-6 border-t border-gray-200 pt-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Demo Accounts</h2>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div>
              <span className="font-medium text-gray-700">Fleet Manager:</span>
              <br />manager@transitops.com
            </div>
            <div>
              <span className="font-medium text-gray-700">Driver:</span>
              <br />driver@transitops.com
            </div>
            <div>
              <span className="font-medium text-gray-700">Safety Officer:</span>
              <br />safety@transitops.com
            </div>
            <div>
              <span className="font-medium text-gray-700">Financial Analyst:</span>
              <br />finance@transitops.com
            </div>
          </div>
          <p className="mt-2 text-[10px] text-gray-500 italic">Password for all is: Password123</p>
        </div>
      </div>
    </div>
  );
};
