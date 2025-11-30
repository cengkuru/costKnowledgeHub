'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { ErrorMessage } from '@/components/ErrorMessage';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await authApi.login(email, password);
      router.push('/');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Login failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cost-blue flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-cost-white rounded-2xl shadow-xl p-8">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-cost-red rounded-2xl flex items-center justify-center text-white">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-cost-dark mb-2 text-center">
          CoST Admin
        </h1>
        <p className="text-center text-cost-medium mb-8">
          Sign in to your account
        </p>

        {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-cost-dark mb-2"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-cost-light/50 rounded-md focus:ring-2 focus:ring-cost-blue focus:border-transparent transition-all"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-cost-dark mb-2"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-cost-light/50 rounded-md focus:ring-2 focus:ring-cost-blue focus:border-transparent transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-cost-red text-white font-medium rounded-md hover:bg-cost-red-600 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-cost-light/30">
          <p className="text-center text-sm text-cost-medium mb-3">
            Need access? Contact your CoST administrator.
          </p>
          <a
            href="https://infrastructuretransparency.org/contact/"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-sm text-cost-blue hover:text-cost-blue-700 font-medium transition-colors"
          >
            Request Admin Access →
          </a>
        </div>
      </div>
    </div>
  );
}
