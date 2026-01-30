/**
 * DocumentPermissionsDialog component
 *
 * Modal dialog for managing document ownership and access permissions.
 * Only document owners can access this dialog.
 */

import { useState, useCallback, useEffect } from 'react';
import { useTeamStore } from '../store/teamStore';
import { useUserStore } from '../store/userStore';
import { useTeamDocumentStore } from '../store/teamDocumentStore';
import { useDocumentRegistry } from '../store/documentRegistry';
import type { Permission, RemoteDocument } from '../types/DocumentRegistry';
import type { TeamMember } from '../types/Auth';
import './DocumentPermissionsDialog.css';

interface DocumentPermissionsDialogProps {
  /** Document ID to manage */
  documentId: string;
  /** Close callback */
  onClose: () => void;
}

interface TeamMemberPermission {
  userId: string;
  username: string;
  permission: Permission;
}

export function DocumentPermissionsDialog({ documentId, onClose }: DocumentPermissionsDialogProps) {
  const entries = useDocumentRegistry((s) => s.entries);
  const updateRecord = useDocumentRegistry((s) => s.updateRecord);
  const members = useTeamStore((s) => s.members);
  const currentUser = useUserStore((s) => s.currentUser);
  const updateDocumentShares = useTeamDocumentStore((s) => s.updateDocumentShares);
  const transferDocumentOwnership = useTeamDocumentStore((s) => s.transferDocumentOwnership);

  const [memberPermissions, setMemberPermissions] = useState<TeamMemberPermission[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transferToUserId, setTransferToUserId] = useState<string | null>(null);

  const entry = entries[documentId];
  const record = entry?.record as RemoteDocument | undefined;

  // Initialize member permissions from team
  useEffect(() => {
    if (!record || record.type !== 'remote') return;

    // Build initial permissions list from team members
    const perms: TeamMemberPermission[] = members
      .filter((m: TeamMember) => m.user.id !== currentUser?.id) // Exclude self
      .map((m: TeamMember) => ({
        userId: m.user.id,
        username: m.user.displayName || m.user.username,
        permission: 'viewer' as Permission, // Default to viewer; in real impl, fetch from server
      }));

    setMemberPermissions(perms);
  }, [members, currentUser?.id, record]);

  const handlePermissionChange = useCallback((userId: string, permission: Permission) => {
    setMemberPermissions((prev) =>
      prev.map((m) => (m.userId === userId ? { ...m, permission } : m))
    );
  }, []);

  const handleTransferOwnership = useCallback((userId: string) => {
    setTransferToUserId(userId);
  }, []);

  const handleConfirmTransfer = useCallback(async () => {
    if (!transferToUserId || !record) return;

    setIsSaving(true);
    setError(null);

    try {
      const newOwner = memberPermissions.find((m) => m.userId === transferToUserId);
      if (newOwner) {
        // Call server to transfer ownership
        await transferDocumentOwnership(documentId, newOwner.userId, newOwner.username);

        // Update local registry (server will also broadcast event)
        updateRecord(documentId, {
          permission: 'editor', // Current user becomes editor
          ownerName: newOwner.username,
        });
      }

      setTransferToUserId(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to transfer ownership');
    } finally {
      setIsSaving(false);
    }
  }, [transferToUserId, record, memberPermissions, documentId, transferDocumentOwnership, updateRecord, onClose]);

  const handleSave = useCallback(async () => {
    if (!record) return;

    setIsSaving(true);
    setError(null);

    try {
      // Convert permissions to share format
      const shares = memberPermissions.map((m) => ({
        userId: m.userId,
        userName: m.username,
        permission: m.permission === 'owner' ? 'edit' : m.permission === 'editor' ? 'edit' : 'view',
      }));

      // Send to server
      await updateDocumentShares(documentId, shares);

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save permissions');
    } finally {
      setIsSaving(false);
    }
  }, [record, memberPermissions, documentId, updateDocumentShares, onClose]);

  if (!record || record.type !== 'remote') {
    return (
      <div className="document-permissions-dialog__overlay" onClick={onClose}>
        <div className="document-permissions-dialog" onClick={(e) => e.stopPropagation()}>
          <p>Document not found or not a team document.</p>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="document-permissions-dialog__overlay" onClick={onClose}>
      <div className="document-permissions-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="document-permissions-dialog__header">
          <h3>Manage Permissions</h3>
          <button className="document-permissions-dialog__close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="document-permissions-dialog__content">
          <div className="document-permissions-dialog__doc-info">
            <span className="document-permissions-dialog__doc-name">{record.name}</span>
            <span className="document-permissions-dialog__doc-owner">Owner: {record.ownerName}</span>
          </div>

          {error && <div className="document-permissions-dialog__error">{error}</div>}

          {/* Transfer ownership confirmation */}
          {transferToUserId && (
            <div className="document-permissions-dialog__transfer-confirm">
              <p>
                Transfer ownership to{' '}
                <strong>{memberPermissions.find((m) => m.userId === transferToUserId)?.username}</strong>?
              </p>
              <p className="document-permissions-dialog__transfer-warning">
                You will lose owner privileges and become an editor.
              </p>
              <div className="document-permissions-dialog__transfer-actions">
                <button
                  className="document-permissions-dialog__btn document-permissions-dialog__btn--danger"
                  onClick={handleConfirmTransfer}
                  disabled={isSaving}
                >
                  {isSaving ? 'Transferring...' : 'Confirm Transfer'}
                </button>
                <button
                  className="document-permissions-dialog__btn"
                  onClick={() => setTransferToUserId(null)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {!transferToUserId && (
            <>
              <div className="document-permissions-dialog__section">
                <h4>Team Access</h4>
                {memberPermissions.length === 0 ? (
                  <p className="document-permissions-dialog__empty">No other team members</p>
                ) : (
                  <ul className="document-permissions-dialog__members">
                    {memberPermissions.map((member) => (
                      <li key={member.userId} className="document-permissions-dialog__member">
                        <span className="document-permissions-dialog__member-name">{member.username}</span>
                        <select
                          className="document-permissions-dialog__permission-select"
                          value={member.permission}
                          onChange={(e) => handlePermissionChange(member.userId, e.target.value as Permission)}
                        >
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                        </select>
                        <button
                          className="document-permissions-dialog__transfer-btn"
                          onClick={() => handleTransferOwnership(member.userId)}
                          title="Transfer ownership"
                        >
                          👑
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="document-permissions-dialog__actions">
                <button
                  className="document-permissions-dialog__btn document-permissions-dialog__btn--primary"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button className="document-permissions-dialog__btn" onClick={onClose} disabled={isSaving}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default DocumentPermissionsDialog;
