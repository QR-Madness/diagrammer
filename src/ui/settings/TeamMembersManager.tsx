/**
 * Team Members Manager
 *
 * Admin panel for managing team members:
 * - List all users (name, role, last active)
 * - Add new user button with modal form
 * - Per-user actions: Change Role, Reset Password, Delete
 * - Role dropdown: admin, editor, viewer
 * - Confirmation dialogs for destructive actions
 */

import { useState, useEffect, useCallback } from 'react';
import { useUserStore } from '../../store/userStore';
import { useTeamStore } from '../../store/teamStore';
import { UserRole, TeamMember } from '../../types/Auth';
import { isTauri } from '../../tauri/commands';
import './TeamMembersManager.css';

/**
 * User info returned from backend (without password hash)
 */
interface UserInfo {
  id: string;
  display_name: string;
  username: string;
  role: 'admin' | 'user';
  created_at: number;
  last_login_at?: number;
}

/**
 * Format a timestamp as a relative time string.
 */
function formatRelativeTime(timestamp: number | undefined): string {
  if (!timestamp) return 'Never';

  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

/**
 * Role badge component
 */
function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span className={`role-badge role-${role}`}>
      {role}
    </span>
  );
}

/**
 * Online status indicator
 */
function OnlineIndicator({ online }: { online: boolean }) {
  return (
    <span className={`online-indicator ${online ? 'online' : 'offline'}`} />
  );
}

export function TeamMembersManager() {
  const currentUser = useUserStore((state) => state.currentUser);
  const onlineMembers = useTeamStore((state) => state.members);
  const serverMode = useTeamStore((state) => state.serverMode);

  const [isTauriEnv, setIsTauriEnv] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState<UserInfo[]>([]);

  // Modal states
  const [addUserModal, setAddUserModal] = useState(false);
  const [editRoleModal, setEditRoleModal] = useState<TeamMember | null>(null);
  const [resetPasswordModal, setResetPasswordModal] = useState<TeamMember | null>(null);
  const [deleteUserModal, setDeleteUserModal] = useState<TeamMember | null>(null);
  const [changeOwnPasswordModal, setChangeOwnPasswordModal] = useState(false);

  // Form states
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('user');
  const [selectedRole, setSelectedRole] = useState<UserRole>('user');
  const [resetPassword, setResetPassword] = useState('');
  const [ownNewPassword, setOwnNewPassword] = useState('');
  const [ownConfirmPassword, setOwnConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Load users from backend
  const loadUsers = useCallback(async () => {
    if (!isTauri()) return;

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const users = await invoke<UserInfo[]>('list_users');
      setRegisteredUsers(users);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }, []);

  // Check if running in Tauri and load users
  useEffect(() => {
    const tauriEnv = isTauri();
    setIsTauriEnv(tauriEnv);

    if (tauriEnv) {
      loadUsers();
    }
  }, [loadUsers]);

  // Reset form when modals close
  const resetAddUserForm = () => {
    setNewUsername('');
    setNewDisplayName('');
    setNewPassword('');
    setNewRole('user');
    setFormError(null);
  };

  const handleAddUser = useCallback(async () => {
    if (!newUsername.trim() || !newPassword.trim()) {
      setFormError('Username and password are required');
      return;
    }

    setIsLoading(true);
    setFormError(null);

    try {
      if (!isTauriEnv) {
        setFormError('User management only available in desktop app');
        return;
      }

      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('create_user', {
        username: newUsername.trim(),
        displayName: newDisplayName.trim() || newUsername.trim(),
        password: newPassword,
        role: newRole,
      });

      // Success - close modal, reset form, and refresh list
      setAddUserModal(false);
      resetAddUserForm();
      await loadUsers();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to create user';
      setFormError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [newUsername, newDisplayName, newPassword, newRole, isTauriEnv, loadUsers]);

  const handleChangeRole = useCallback(async () => {
    if (!editRoleModal) return;

    setIsLoading(true);
    setFormError(null);

    try {
      if (!isTauriEnv) {
        setFormError('User management only available in desktop app');
        return;
      }

      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('update_user_role', {
        userId: editRoleModal.user.id,
        newRole: selectedRole,
      });

      // Success - close modal and refresh list
      setEditRoleModal(null);
      await loadUsers();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to update role';
      setFormError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [editRoleModal, selectedRole, isTauriEnv, loadUsers]);

  const handleResetPassword = useCallback(async () => {
    if (!resetPasswordModal || !resetPassword.trim()) return;

    setIsLoading(true);
    setFormError(null);

    try {
      if (!isTauriEnv) {
        setFormError('User management only available in desktop app');
        return;
      }

      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('reset_user_password', {
        userId: resetPasswordModal.user.id,
        newPassword: resetPassword,
      });

      // Success - close modal
      setResetPasswordModal(null);
      setResetPassword('');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to reset password';
      setFormError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [resetPasswordModal, resetPassword, isTauriEnv]);

  const handleDeleteUser = useCallback(async () => {
    if (!deleteUserModal) return;

    setIsLoading(true);
    setFormError(null);

    try {
      if (!isTauriEnv) {
        setFormError('User management only available in desktop app');
        return;
      }

      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('delete_user', {
        userId: deleteUserModal.user.id,
      });

      // Success - close modal and refresh list
      setDeleteUserModal(null);
      await loadUsers();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to delete user';
      setFormError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [deleteUserModal, isTauriEnv, loadUsers]);

  const handleChangeOwnPassword = useCallback(async () => {
    if (!ownNewPassword.trim() || !currentUser) return;

    if (ownNewPassword !== ownConfirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    if (ownNewPassword.length < 6) {
      setFormError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    setFormError(null);

    try {
      if (!isTauriEnv) {
        setFormError('Password change only available in desktop app');
        return;
      }

      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('reset_user_password', {
        userId: currentUser.id,
        newPassword: ownNewPassword,
      });

      // Success - close modal
      setChangeOwnPasswordModal(false);
      setOwnNewPassword('');
      setOwnConfirmPassword('');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to change password';
      setFormError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [ownNewPassword, ownConfirmPassword, currentUser, isTauriEnv]);

  const openEditRoleModal = (member: TeamMember) => {
    setSelectedRole(member.user.role);
    setFormError(null);
    setEditRoleModal(member);
  };

  // User management is available on the host machine (Tauri app)
  // Show when hosting or when offline (to prepare users before hosting)
  // Clients cannot manage users - they must connect to the host
  if (!isTauriEnv || serverMode === 'client') {
    return null;
  }

  return (
    <div className="team-members-manager">
      <div className="team-members-header">
        <h4 className="settings-group-title">Team Members</h4>
        <button
          className="add-user-button"
          onClick={() => {
            resetAddUserForm();
            setAddUserModal(true);
          }}
          disabled={!isTauriEnv}
        >
          + Add User
        </button>
      </div>

      {/* Members list */}
      <div className="team-members-list">
        {registeredUsers.length === 0 ? (
          <div className="team-members-empty">
            No team members yet. Add a user to get started.
          </div>
        ) : (
          registeredUsers.map((userInfo) => {
            const isSelf = userInfo.id === currentUser?.id;
            // Check if user is online by looking in onlineMembers
            const onlineMember = onlineMembers.find(m => m.user.id === userInfo.id);
            const isOnline = onlineMember?.online ?? false;
            const lastSeenAt = onlineMember?.lastSeenAt ?? userInfo.last_login_at;

            // Convert UserInfo to TeamMember format for modals
            const member: TeamMember = {
              user: {
                id: userInfo.id,
                displayName: userInfo.display_name,
                username: userInfo.username,
                role: userInfo.role,
                createdAt: userInfo.created_at,
                ...(userInfo.last_login_at !== undefined && { lastLoginAt: userInfo.last_login_at }),
              },
              online: isOnline,
              ...(lastSeenAt !== undefined && { lastSeenAt }),
            };

            return (
              <div key={userInfo.id} className="team-member-item">
                <div className="member-info">
                  <div className="member-name-row">
                    <OnlineIndicator online={isOnline} />
                    <span className="member-name">{userInfo.display_name}</span>
                    <RoleBadge role={userInfo.role} />
                    {isSelf && <span className="member-you">(You)</span>}
                  </div>
                  <div className="member-meta">
                    <span className="member-username">@{userInfo.username}</span>
                    <span className="member-separator">-</span>
                    <span className="member-last-seen">
                      Last active: {formatRelativeTime(lastSeenAt)}
                    </span>
                  </div>
                </div>

                {isSelf ? (
                  <div className="member-actions">
                    <button
                      className="member-action-button"
                      onClick={() => {
                        setFormError(null);
                        setOwnNewPassword('');
                        setOwnConfirmPassword('');
                        setChangeOwnPasswordModal(true);
                      }}
                      title="Change Password"
                    >
                      Change Password
                    </button>
                  </div>
                ) : (
                  <div className="member-actions">
                    <button
                      className="member-action-button"
                      onClick={() => openEditRoleModal(member)}
                      title="Change Role"
                    >
                      Role
                    </button>
                    <button
                      className="member-action-button"
                      onClick={() => {
                        setFormError(null);
                        setResetPassword('');
                        setResetPasswordModal(member);
                      }}
                      title="Reset Password"
                    >
                      Reset
                    </button>
                    <button
                      className="member-action-button danger"
                      onClick={() => {
                        setFormError(null);
                        setDeleteUserModal(member);
                      }}
                      title="Delete User"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add User Modal */}
      {addUserModal && (
        <div className="modal-overlay" onClick={() => setAddUserModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Add New User</h3>

            <div className="modal-form">
              <div className="form-group">
                <label className="form-label">Username *</label>
                <input
                  type="text"
                  className="modal-input"
                  placeholder="username"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Display Name</label>
                <input
                  type="text"
                  className="modal-input"
                  placeholder="Display Name"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password *</label>
                <input
                  type="password"
                  className="modal-input"
                  placeholder="Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  className="modal-select"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {formError && (
                <div className="modal-error">{formError}</div>
              )}
            </div>

            <div className="modal-actions">
              <button
                className="modal-button secondary"
                onClick={() => setAddUserModal(false)}
              >
                Cancel
              </button>
              <button
                className="modal-button primary"
                onClick={handleAddUser}
                disabled={isLoading || !newUsername.trim() || !newPassword.trim()}
              >
                {isLoading ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {editRoleModal && (
        <div className="modal-overlay" onClick={() => setEditRoleModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Change Role</h3>
            <p className="modal-message">
              Change role for <strong>{editRoleModal.user.displayName}</strong>
            </p>

            <div className="modal-form">
              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  className="modal-select"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {formError && (
                <div className="modal-error">{formError}</div>
              )}
            </div>

            <div className="modal-actions">
              <button
                className="modal-button secondary"
                onClick={() => setEditRoleModal(null)}
              >
                Cancel
              </button>
              <button
                className="modal-button primary"
                onClick={handleChangeRole}
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordModal && (
        <div className="modal-overlay" onClick={() => setResetPasswordModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Reset Password</h3>
            <p className="modal-message">
              Reset password for <strong>{resetPasswordModal.user.displayName}</strong>
            </p>

            <div className="modal-form">
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  className="modal-input"
                  placeholder="New password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  autoFocus
                />
              </div>

              {formError && (
                <div className="modal-error">{formError}</div>
              )}
            </div>

            <div className="modal-actions">
              <button
                className="modal-button secondary"
                onClick={() => setResetPasswordModal(null)}
              >
                Cancel
              </button>
              <button
                className="modal-button primary"
                onClick={handleResetPassword}
                disabled={isLoading || !resetPassword.trim()}
              >
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {deleteUserModal && (
        <div className="modal-overlay" onClick={() => setDeleteUserModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Delete User?</h3>
            <p className="modal-message">
              Are you sure you want to delete <strong>{deleteUserModal.user.displayName}</strong>?
              This action cannot be undone.
            </p>

            {formError && (
              <div className="modal-error">{formError}</div>
            )}

            <div className="modal-actions">
              <button
                className="modal-button secondary"
                onClick={() => setDeleteUserModal(null)}
              >
                Cancel
              </button>
              <button
                className="modal-button danger"
                onClick={handleDeleteUser}
                disabled={isLoading}
              >
                {isLoading ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Own Password Modal */}
      {changeOwnPasswordModal && (
        <div className="modal-overlay" onClick={() => setChangeOwnPasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Change Your Password</h3>
            <p className="modal-message">
              Enter a new password for your account.
            </p>

            <div className="modal-form">
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  className="modal-input"
                  placeholder="New password (min 6 characters)"
                  value={ownNewPassword}
                  onChange={(e) => setOwnNewPassword(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input
                  type="password"
                  className="modal-input"
                  placeholder="Confirm new password"
                  value={ownConfirmPassword}
                  onChange={(e) => setOwnConfirmPassword(e.target.value)}
                />
              </div>

              {formError && (
                <div className="modal-error">{formError}</div>
              )}
            </div>

            <div className="modal-actions">
              <button
                className="modal-button secondary"
                onClick={() => setChangeOwnPasswordModal(false)}
              >
                Cancel
              </button>
              <button
                className="modal-button primary"
                onClick={handleChangeOwnPassword}
                disabled={isLoading || !ownNewPassword.trim() || !ownConfirmPassword.trim()}
              >
                {isLoading ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeamMembersManager;
