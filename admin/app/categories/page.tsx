'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorMessage } from '@/components/ErrorMessage';
import { SuccessMessage } from '@/components/SuccessMessage';
import { categoriesApi } from '@/lib/api';
import { Category } from '@/lib/types';
import { isAuthenticated } from '@/lib/auth';

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    loadCategories();
  }, [router]);

  const loadCategories = async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await categoriesApi.list();
      setCategories(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load categories'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name.trim()) {
      setError('Category name is required');
      return;
    }

    try {
      if (editingId) {
        await categoriesApi.update(editingId, formData);
        setSuccess('Category updated successfully');
      } else {
        await categoriesApi.create(formData);
        setSuccess('Category created successfully');
      }

      setFormData({ name: '', description: '' });
      setEditingId(null);
      setShowForm(false);
      await loadCategories();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save category'
      );
    }
  };

  const handleEdit = (category: Category) => {
    setFormData({ name: category.name, description: category.description || '' });
    setEditingId(category._id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (
      !window.confirm(
        'Are you sure you want to delete this category? This action cannot be undone.'
      )
    ) {
      return;
    }

    try {
      await categoriesApi.delete(id);
      setSuccess('Category deleted successfully');
      await loadCategories();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete category'
      );
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', description: '' });
    setEditingId(null);
    setShowForm(false);
  };

  if (isLoading) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }

  return (
    <Layout>
      <div>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              Create Category
            </button>
          )}
        </div>

        {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}
        {success && (
          <SuccessMessage message={success} onDismiss={() => setSuccess('')} />
        )}

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              {editingId ? 'Edit Category' : 'Create Category'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Name *
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Category name"
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Category description"
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors font-medium"
                >
                  {editingId ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-2 bg-gray-300 text-gray-900 rounded-md hover:bg-gray-400 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Categories List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      No categories found
                    </td>
                  </tr>
                ) : (
                  categories.map((category) => (
                    <tr
                      key={category._id}
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {category.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {category.description || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm space-x-3">
                        <button
                          onClick={() => handleEdit(category)}
                          className="text-primary-600 hover:text-primary-700 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(category._id)}
                          className="text-red-600 hover:text-red-700 font-medium"
                        >
                          Delete
                        </button>
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
