'use client';

import { useState } from 'react';
import { Resource, ContentStatus } from '@/lib/types';
import { ErrorMessage } from './ErrorMessage';
import { SuccessMessage } from './SuccessMessage';

interface ResourceFormProps {
  initialData?: Partial<Resource>;
  onSubmit: (data: Partial<Resource>) => Promise<void>;
  isLoading?: boolean;
}

const RESOURCE_TYPES = [
  'guidance',
  'case_study',
  'assurance_report',
  'tool',
  'template',
  'research',
  'news',
  'training',
  'policy',
];

const STATUSES: ContentStatus[] = [
  'discovered',
  'pending_review',
  'approved',
  'published',
  'archived',
  'rejected',
];

const LANGUAGES = ['en', 'es', 'fr', 'pt', 'uk', 'id', 'vi', 'th'];

const ACCESS_LEVELS = ['public', 'members', 'internal'];

export function ResourceForm({
  initialData,
  onSubmit,
  isLoading = false,
}: ResourceFormProps) {
  const [formData, setFormData] = useState<Partial<Resource>>(
    initialData || {
      title: '',
      description: '',
      url: '',
      slug: '',
      resourceType: 'guidance',
      status: 'pending_review',
      language: 'en',
      accessLevel: 'public',
      countryPrograms: [],
      themes: [],
      oc4idsAlignment: [],
      workstreams: [],
      audience: [],
      publicationDate: new Date().toISOString().split('T')[0],
      lastVerified: new Date().toISOString().split('T')[0],
    }
  );

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.title?.trim()) {
      setError('Title is required');
      return;
    }
    if (!formData.description?.trim()) {
      setError('Description is required');
      return;
    }
    if (!formData.url?.trim()) {
      setError('URL is required');
      return;
    }
    if (!formData.slug?.trim()) {
      setError('Slug is required');
      return;
    }

    try {
      // Keep dates as ISO strings for API
      const submitData = {
        ...formData,
        publicationDate: formData.publicationDate
          ? new Date(formData.publicationDate as string).toISOString()
          : new Date().toISOString(),
        lastVerified: formData.lastVerified
          ? new Date(formData.lastVerified as string).toISOString()
          : new Date().toISOString(),
      };

      await onSubmit(submitData);
      setSuccess('Resource saved successfully!');

      // Reset form on success for new resources
      if (!initialData?._id) {
        setFormData({
          title: '',
          description: '',
          url: '',
          slug: '',
          resourceType: 'guidance',
          status: 'pending_review',
          language: 'en',
          accessLevel: 'public',
          countryPrograms: [],
          themes: [],
          oc4idsAlignment: [],
          workstreams: [],
          audience: [],
          publicationDate: new Date().toISOString().split('T')[0],
          lastVerified: new Date().toISOString().split('T')[0],
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save resource');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg shadow p-6">
      {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}
      {success && (
        <SuccessMessage message={success} onDismiss={() => setSuccess('')} />
      )}

      {/* Core Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Title *
          </label>
          <input
            id="title"
            type="text"
            name="title"
            value={formData.title || ''}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Resource title"
          />
        </div>

        <div>
          <label
            htmlFor="slug"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Slug *
          </label>
          <input
            id="slug"
            type="text"
            name="slug"
            value={formData.slug || ''}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="resource-slug"
          />
        </div>

        <div>
          <label
            htmlFor="url"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            URL *
          </label>
          <input
            id="url"
            type="url"
            name="url"
            value={formData.url || ''}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="https://example.com"
          />
        </div>

        <div>
          <label
            htmlFor="resourceType"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Resource Type
          </label>
          <select
            id="resourceType"
            name="resourceType"
            value={formData.resourceType || 'guidance'}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {RESOURCE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Description *
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description || ''}
          onChange={handleChange}
          required
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          placeholder="Resource description"
        />
      </div>

      {/* Status & Access */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label
            htmlFor="status"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Status
          </label>
          <select
            id="status"
            name="status"
            value={formData.status || 'pending_review'}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="language"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Language
          </label>
          <select
            id="language"
            name="language"
            value={formData.language || 'en'}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="accessLevel"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Access Level
          </label>
          <select
            id="accessLevel"
            name="accessLevel"
            value={formData.accessLevel || 'public'}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {ACCESS_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label
            htmlFor="publicationDate"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Publication Date
          </label>
          <input
            id="publicationDate"
            type="date"
            name="publicationDate"
            value={
              formData.publicationDate
                ? formData.publicationDate.toString().split('T')[0]
                : ''
            }
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div>
          <label
            htmlFor="lastVerified"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Last Verified
          </label>
          <input
            id="lastVerified"
            type="date"
            name="lastVerified"
            value={
              formData.lastVerified
                ? formData.lastVerified.toString().split('T')[0]
                : ''
            }
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors font-medium"
        >
          {isLoading ? 'Saving...' : 'Save Resource'}
        </button>
      </div>
    </form>
  );
}
