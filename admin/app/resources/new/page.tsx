'use client';

import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { ResourceForm } from '@/components/ResourceForm';
import { resourcesApi } from '@/lib/api';
import { Resource } from '@/lib/types';
import { isAuthenticated } from '@/lib/auth';
import { useEffect } from 'react';

export default function CreateResourcePage() {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    }
  }, [router]);

  const handleSubmit = async (data: Partial<Resource>) => {
    const newResource = await resourcesApi.create(data);
    router.push(`/resources/${newResource._id}`);
  };

  return (
    <Layout>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Create Resource</h1>
        <ResourceForm onSubmit={handleSubmit} />
      </div>
    </Layout>
  );
}
