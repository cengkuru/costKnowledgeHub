'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { ResourceForm } from '@/components/ResourceForm';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorMessage } from '@/components/ErrorMessage';
import { resourcesApi } from '@/lib/api';
import { Resource } from '@/lib/types';
import { isAuthenticated } from '@/lib/auth';

export default function EditResourcePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [resource, setResource] = useState<Resource | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    if (!id) return;

    loadResource();
  }, [router, id]);

  const loadResource = async () => {
    if (!id) return;

    setIsLoading(true);
    setError('');

    try {
      const data = await resourcesApi.get(id);
      setResource(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load resource'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (data: Partial<Resource>) => {
    if (!id) return;

    await resourcesApi.update(id, data);
    await loadResource();
  };

  if (isLoading) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }

  if (error || !resource) {
    return (
      <Layout>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Edit Resource
          </h1>
          {error && (
            <ErrorMessage message={error} onDismiss={() => setError('')} />
          )}
          <Link href="/resources" className="text-primary-600 hover:text-primary-700">
            Back to Resources
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Edit Resource</h1>
          <Link
            href="/resources"
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            Back to Resources
          </Link>
        </div>

        <ResourceForm initialData={resource} onSubmit={handleSubmit} />

        {/* Additional Info */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Resource Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-900">ID:</span>
              <span className="text-gray-600 ml-2">{resource._id}</span>
            </div>
            <div>
              <span className="font-medium text-gray-900">Created:</span>
              <span className="text-gray-600 ml-2">
                {new Date(resource.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-900">Updated:</span>
              <span className="text-gray-600 ml-2">
                {new Date(resource.updatedAt).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-900">Status:</span>
              <span className="text-gray-600 ml-2">{resource.status}</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
