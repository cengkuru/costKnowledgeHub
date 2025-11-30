'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorMessage } from '@/components/ErrorMessage';
import { resourcesApi } from '@/lib/api';
import { Resource, ContentStatus } from '@/lib/types';
import { isAuthenticated } from '@/lib/auth';

export default function ResourcesPage() {
  const router = useRouter();
  const [resources, setResources] = useState<Resource[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);
  const [statusFilter, setStatusFilter] = useState<ContentStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    loadResources();
  }, [router, page, statusFilter, typeFilter, searchQuery]);

  const loadResources = async () => {
    setIsLoading(true);
    setError('');

    try {
      const filters: Record<string, string> = {};
      if (statusFilter) filters.status = statusFilter;
      if (typeFilter) filters.type = typeFilter;
      if (searchQuery) filters.search = searchQuery;

      const response = await resourcesApi.list(page, limit, filters);
      setResources(response.data);
      setTotal(response.total);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load resources'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await resourcesApi.delete(id);
      setResources(resources.filter((r) => r._id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete resource'
      );
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <Layout>
      <div>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Resources</h1>
          <Link
            href="/resources/new"
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            Create Resource
          </Link>
        </div>

        {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="search"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Search
              </label>
              <input
                id="search"
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by title or description..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Status
              </label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as ContentStatus | '');
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">All Statuses</option>
                <option value="published">Published</option>
                <option value="pending_review">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="archived">Archived</option>
                <option value="rejected">Rejected</option>
                <option value="discovered">Discovered</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="type"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Type
              </label>
              <select
                id="type"
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="guidance">Guidance</option>
                <option value="case_study">Case Study</option>
                <option value="assurance_report">Assurance Report</option>
                <option value="tool">Tool</option>
                <option value="template">Template</option>
                <option value="research">Research</option>
                <option value="news">News</option>
                <option value="training">Training</option>
                <option value="policy">Policy</option>
              </select>
            </div>
          </div>
        </div>

        {/* Resources Table */}
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <>
            <div className="bg-white rounded-lg shadow overflow-hidden">
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
                        Language
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {resources.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-4 text-center text-gray-500"
                        >
                          No resources found
                        </td>
                      </tr>
                    ) : (
                      resources.map((resource) => (
                        <tr
                          key={resource._id}
                          className="border-b border-gray-200 hover:bg-gray-50"
                        >
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {resource.title}
                            </div>
                            <div className="text-sm text-gray-500">
                              {resource.url}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {resource.resourceType}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <StatusBadge status={resource.status} />
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {resource.language}
                          </td>
                          <td className="px-6 py-4 text-sm space-x-2">
                            <Link
                              href={`/resources/${resource._id}`}
                              className="text-primary-600 hover:text-primary-700 font-medium"
                            >
                              Edit
                            </Link>
                            <button
                              onClick={() => setDeleteConfirm(resource._id)}
                              className="text-red-600 hover:text-red-700 font-medium"
                            >
                              Delete
                            </button>

                            {deleteConfirm === resource._id && (
                              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
                                  <h3 className="text-lg font-semibold mb-4">
                                    Confirm Deletion
                                  </h3>
                                  <p className="text-gray-600 mb-6">
                                    Are you sure you want to delete this resource?
                                    This action cannot be undone.
                                  </p>
                                  <div className="flex gap-4 justify-end">
                                    <button
                                      onClick={() => setDeleteConfirm(null)}
                                      className="px-4 py-2 bg-gray-300 text-gray-900 rounded-md hover:bg-gray-400 transition-colors"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleDelete(resource._id)
                                      }
                                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex justify-center items-center gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-4 py-2 bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300 disabled:opacity-50 transition-colors"
                >
                  Previous
                </button>

                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (p) => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`px-3 py-2 rounded-md transition-colors ${
                          page === p
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                </div>

                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300 disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
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
