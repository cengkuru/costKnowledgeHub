'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorMessage } from '@/components/ErrorMessage';
import { resourcesApi } from '@/lib/api';
import { Resource, User } from '@/lib/types';
import { isAuthenticated } from '@/lib/auth';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    pending: 0,
    archived: 0,
  });
  const [recentResources, setRecentResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    loadDashboardData();
  }, [router]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Load recent resources
      const resourcesResponse = await resourcesApi.list(1, 5);
      setRecentResources(resourcesResponse.data);

      // Calculate stats
      const allResources = await resourcesApi.list(1, 1000);
      const resources = allResources.data;

      setStats({
        total: allResources.total,
        published: resources.filter((r) => r.status === 'published').length,
        pending: resources.filter(
          (r) => r.status === 'pending_review' || r.status === 'discovered'
        ).length,
        archived: resources.filter((r) => r.status === 'archived').length,
      });

      // Set mock user
      setUser({
        id: '1',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load dashboard data'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }

  return (
    <Layout userEmail={user?.email}>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

        {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard label="Total Resources" value={stats.total} color="blue" />
          <StatCard label="Published" value={stats.published} color="green" />
          <StatCard label="Pending Review" value={stats.pending} color="yellow" />
          <StatCard label="Archived" value={stats.archived} color="gray" />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/resources/new"
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              Create Resource
            </Link>
            <Link
              href="/resources"
              className="px-4 py-2 bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300 transition-colors"
            >
              Manage Resources
            </Link>
            <Link
              href="/categories"
              className="px-4 py-2 bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300 transition-colors"
            >
              Manage Categories
            </Link>
          </div>
        </div>

        {/* Recent Resources */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Resources
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentResources.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      No resources yet
                    </td>
                  </tr>
                ) : (
                  recentResources.map((resource) => (
                    <tr
                      key={resource._id}
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {resource.title}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {resource.resourceType}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <StatusBadge status={resource.status} />
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Link
                          href={`/resources/${resource._id}`}
                          className="text-primary-600 hover:text-primary-700 font-medium"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'blue' | 'green' | 'yellow' | 'gray';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    gray: 'bg-gray-50 border-gray-200',
  };

  const textColor = {
    blue: 'text-blue-900',
    green: 'text-green-900',
    yellow: 'text-yellow-900',
    gray: 'text-gray-900',
  };

  return (
    <div className={`rounded-lg border ${colorClasses[color]} p-6`}>
      <p className={`text-sm font-medium ${textColor[color]} mb-2`}>{label}</p>
      <p className={`text-3xl font-bold ${textColor[color]}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusStyles = {
    published: 'bg-green-100 text-green-800',
    approved: 'bg-green-100 text-green-800',
    pending_review: 'bg-yellow-100 text-yellow-800',
    discovered: 'bg-yellow-100 text-yellow-800',
    archived: 'bg-gray-100 text-gray-800',
    rejected: 'bg-red-100 text-red-800',
  };

  const style =
    statusStyles[status as keyof typeof statusStyles] ||
    'bg-gray-100 text-gray-800';

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${style}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
