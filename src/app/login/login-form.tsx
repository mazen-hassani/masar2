'use client';

import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

export default function LoginForm(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pre-populate with test tenant for development
  const [showTestCredentials, setShowTestCredentials] = useState(false);

  const testCredentials = [
    {
      email: 'admin@ministry-health.test',
      password: 'admin',
      tenantId: 'test-tenant-1',
      role: 'Admin',
    },
    {
      email: 'pm@ministry-health.test',
      password: 'pm',
      tenantId: 'test-tenant-1',
      role: 'Project Manager',
    },
    {
      email: 'sponsor@ministry-health.test',
      password: 'sponsor',
      tenantId: 'test-tenant-1',
      role: 'Sponsor',
    },
    {
      email: 'finance@ministry-health.test',
      password: 'finance',
      tenantId: 'test-tenant-1',
      role: 'Finance',
    },
  ];

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        tenantId,
        redirect: false,
      });

      if (result?.error) {
        setErrorMessage(result.error);
      } else if (result?.ok) {
        router.push('/');
      }
    } catch (err) {
      setErrorMessage('An unexpected error occurred');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  }

  function setTestCredential(cred: {
    email: string;
    password: string;
    tenantId: string;
  }): void {
    setEmail(cred.email);
    setPassword(cred.password);
    setTenantId(cred.tenantId);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-6 shadow-md">
        <div>
          <h1 className="text-center text-3xl font-bold text-gray-900">
            Masar Portfolio Manager
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to your account
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
            Authentication failed. Please check your credentials.
          </div>
        )}

        {errorMessage && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="tenantId" className="block text-sm font-medium text-gray-700">
              Tenant ID
            </label>
            <input
              id="tenantId"
              type="text"
              required
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              placeholder="e.g., ministry-health"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Development/Testing Helpers */}
        <div className="border-t border-gray-200 pt-6">
          <button
            type="button"
            onClick={() => setShowTestCredentials(!showTestCredentials)}
            className="w-full text-center text-sm text-blue-600 hover:text-blue-700"
          >
            {showTestCredentials ? 'Hide' : 'Show'} Test Credentials (Development)
          </button>

          {showTestCredentials && (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-gray-600">
                Click to use test credentials (only available after running seed):
              </p>
              {testCredentials.map((cred) => (
                <button
                  key={cred.email}
                  type="button"
                  onClick={() => setTestCredential(cred)}
                  className="block w-full rounded bg-gray-100 px-3 py-2 text-left text-xs hover:bg-gray-200"
                >
                  <div className="font-medium text-gray-900">{cred.role}</div>
                  <div className="text-gray-600">{cred.email}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
