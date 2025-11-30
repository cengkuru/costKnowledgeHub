'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorMessage } from '@/components/ErrorMessage';
import { SuccessMessage } from '@/components/SuccessMessage';
import { usersApi } from '@/lib/api';
import { User } from '@/lib/types';
import { isAuthenticated } from '@/lib/auth';

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    // Get current user ID from token
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserId(payload.id);
      } catch {
        // Ignore token parsing errors
      }
    }

    loadUsers();
  }, [router]);

  const loadUsers = async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await usersApi.list();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      await usersApi.create(formData);
      setSuccess('User created successfully. A welcome email with login credentials has been sent.');
      setFormData({ name: '', email: '' });
      setShowForm(false);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'user') => {
    if (userId === currentUserId) {
      setError('You cannot change your own role');
      return;
    }

    setError('');
    setSuccess('');

    try {
      await usersApi.updateRole(userId, newRole);
      setSuccess('User role updated successfully');
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const handleResendWelcome = async (userId: string, userName: string) => {
    if (!window.confirm(`Resend welcome email to ${userName}? This will generate a new temporary password.`)) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      await usersApi.resendWelcome(userId);
      setSuccess('Welcome email sent successfully with a new temporary password');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend welcome email');
    }
  };

  const handleDelete = async (userId: string, userName: string) => {
    if (userId === currentUserId) {
      setError('You cannot delete your own account');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      await usersApi.delete(userId);
      setSuccess('User deleted successfully');
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', email: '' });
    setShowForm(false);
    setError('');
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              + Add User
            </button>
          )}
        </div>

        {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}
        {success && <SuccessMessage message={success} onDismiss={() => setSuccess('')} />}

        {/* Create User Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Add New Admin User</h2>
            <p className="text-sm text-gray-600 mb-6">
              A temporary password will be generated and emailed to the user along with login instructions.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Name *
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors font-medium disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create User'}
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

        {/* Users List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Role</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Created</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {user.name}
                        {user.id === currentUserId && (
                          <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded">
                            You
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                      <td className="px-6 py-4 text-sm">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as 'admin' | 'user')}
                          disabled={user.id === currentUserId}
                          className={`px-2 py-1 border border-gray-300 rounded text-sm ${
                            user.id === currentUserId ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer'
                          }`}
                        >
                          <option value="admin">Admin</option>
                          <option value="user">User</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{formatDate(user.createdAt)}</td>
                      <td className="px-6 py-4 text-sm space-x-3">
                        <button
                          onClick={() => handleResendWelcome(user.id, user.name)}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                          title="Resend welcome email with new password"
                        >
                          Resend Email
                        </button>
                        <button
                          onClick={() => handleDelete(user.id, user.name)}
                          disabled={user.id === currentUserId}
                          className={`font-medium ${
                            user.id === currentUserId
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-red-600 hover:text-red-700'
                          }`}
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

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">About User Management</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>When you create a new user, they receive an email with their temporary password.</li>
            <li>Users should change their password after first login.</li>
            <li>Use &quot;Resend Email&quot; to send a new temporary password if needed.</li>
            <li>You cannot delete your own account or change your own role.</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
