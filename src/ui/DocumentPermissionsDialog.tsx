/**
 * DocumentPermissionsDialog component
 *
 * Modal dialog for managing document ownership and access permissions.
 * Only document owners can access this dialog.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useTeamStore } from '../store/teamStore';
import { useUserStore } from '../store/userStore';
import { useTeamDocumentStore } from '../store/teamDocumentStore';
import { useDocumentRegistry } from '../store/documentRegistry';
import type { Permission, RemoteDocument } from '../types/DocumentRegistry';
import type { DocumentShare } from '../types/Document';
import type { TeamMember } from '../types/Auth';
import './DocumentPermissionsDialog.css';

interface DocumentPermissionsDialogProps {
  /** Document ID to manage */
  documentId: string;
  /** Close callback */
  onClose: () => void;
}

interface MemberAccess {
  userId: string;
  username: string;
  permission: 'view' | 'edit' | 'none';
  isOnTeam: boolean;
}

export function DocumentPermissionsDialog({ documentId, onClose }: DocumentPermissionsDialogProps) {
  const entries = useDocumentRegistry((s) => s.entries);
  const updateRecord = useDocumentRegistry((s) => s.updateRecord);
  const members = useTeamStore((s) => s.members);
  const currentUser = useUserStore((s) => s.currentUser);
  const updateDocumentShares = useTeamDocumentStore((s) => s.updateDocumentShares);
  const transferDocumentOwnership = useTeamDocumentStore((s) => s.transferDocumentOwnership);
  const teamDocuments = useTeamDocumentStore((s) => s.teamDocuments);

  const [accessList, setAccessList] = useState<MemberAccess[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [transferToUserId, setTransferToUserId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const entry = entries[documentId];
  const record = entry?.record as RemoteDocument | undefined;
  
  // Get document metadata which includes sharedWith
  const docMetadata = teamDocuments[documentId];

  // Build the unified access list from team members and existing shares
  useEffect(() => {
    if (!record || record.type !== 'remote') return;

    const existingShares: DocumentShare[] = docMetadata?.sharedWith ?? [];
    const shareMap = new Map<string, DocumentShare>();
    existingShares.forEach((s) => shareMap.set(s.userId, s));

    // Build access list from team members
    const list: MemberAccess[] = members
      .filter((m: TeamMember) => m.user.id !== currentUser?.id && m.user.id !== record.ownerId)
      .map((m: TeamMember) => {
        const existingShare = shareMap.get(m.user.id);
        return {
          userId: m.user.id,
          username: m.user.displayName || m.user.username,
          permission: existingShare?.permission ?? 'none',
          isOnTeam: true,
        };
      });

    // Add any shares that aren't in current team members (offline users)
    existingShares.forEach((share) => {
      if (!list.some((m) => m.userId === share.userId) && share.userId !== currentUser?.id && share.userId !== record.ownerId) {
        list.push({
          userId: share.userId,
          username: share.userName,
          permission: share.permission,
          isOnTeam: false,
        });
      }
    });

    setAccessList(list);
    setHasChanges(false);
  }, [members, currentUser?.id, record, docMetadata]);

  // Count users with access
  const accessCounts = useMemo(() => {
    const editors = accessList.filter((m) => m.permission === 'edit').length;
    const viewers = accessList.filter((m) => m.permission === 'view').length;
    return { editors, viewers, total: editors + viewers };
  }, [accessList]);

  const handlePermissionChange = useCallback((userId: string, permission: 'view' | 'edit' | 'none') => {
    setAccessList((prev) =>
      prev.map((m) => (m.userId === userId ? { ...m, permission } : m))
    );
    setHasChanges(true);
    setError(null);
    setSuccessMessage(null);
  }, []);

  const handleGrantAllView = useCallback(() => {
    setAccessList((prev) =>
      prev.map((m) => (m.permission === 'none' ? { ...m, permission: 'view' } : m))
    );
    setHasChanges(true);
  }, []);

  const handleRevokeAll = useCallback(() => {
    setAccessList((prev) =>
      prev.map((m) => ({ ...m, permission: 'none' }))
    );
    setHasChanges(true);
  }, []);

  const handleTransferOwnership = useCallback((userId: string) => {
    setTransferToUserId(userId);
  }, []);

  const handleConfirmTransfer = useCallback(async () => {
    if (!transferToUserId || !record) return;

    setIsSaving(true);
    setError(null);

    try {
      const newOwner = accessList.find((m) => m.userId === transferToUserId);
      if (newOwner) {
        await transferDocumentOwnership(documentId, newOwner.userId, newOwner.username);

        updateRecord(documentId, {
          permission: 'editor' as Permission,
          ownerName: newOwner.username,
          ownerId: newOwner.userId,
        });
        
        setSuccessMessage(`Ownership transferred to ${newOwner.username}`);
      }

      setTransferToUserId(null);
      // Don't close - let user see the result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to transfer ownership');
    } finally {
      setIsSaving(false);
    }
  }, [transferToUserId, record, accessList, documentId, transferDocumentOwnership, updateRecord]);

  const handleSave = useCallback(async () => {
    if (!record) return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Build shares list - only include users with actual access
      const shares = accessList
        .filter((m) => m.permission !== 'none')
        .map((m) => ({
          userId: m.userId,
          userName: m.username,
          permission: m.permission,
        }));

      await updateDocumentShares(documentId, shares);
      
      setSuccessMessage(`Permissions saved (${shares.length} user${shares.length !== 1 ? 's' : ''} with access)`);
      setHasChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save permissions');
    } finally {
      setIsSaving(false);
    }
  }, [record, accessList, documentId, updateDocumentShares]);

  if (!record || record.type !== 'remote') {
    return (
      <div className="document-permissions-dialog__overlay" onClick={onClose}>
        <div className="document-permissions-dialog" onClick={(e) => e.stopPropagation()}>
          <div className="document-permissions-dialog__header">
            <h3>Manage Access</h3>
            <button className="document-permissions-dialog__close" onClick={onClose}>×</button>
          </div>
          <div className="document-permissions-dialog__content">
            <p className="document-permissions-dialog__empty">Document not found or not a team document.</p>
            <div className="document-permissions-dialog__actions">
              <button className="document-permissions-dialog__btn" onClick={onClose}>Close</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="document-permissions-dialog__overlay" onClick={onClose}>
      <div className="document-permissions-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="document-permissions-dialog__header">
          <h3>Manage Access</h3>
          <button className="document-permissions-dialog__close" onClick={onClose}>×</button>
        </div>

        <div className="document-permissions-dialog__content">
          {/* Document info */}
          <div className="document-permissions-dialog__doc-info">
            <div className="document-permissions-dialog__doc-name">{record.name}</div>
            <div className="document-permissions-dialog__doc-meta">
              <span className="document-permissions-dialog__owner-badge">👑 {record.ownerName}</span>
              <span className="document-permissions-dialog__access-count">
                {accessCounts.total} user{accessCounts.total !== 1 ? 's' : ''} with access
                {accessCounts.editors > 0 && ` (${accessCounts.editors} editor${accessCounts.editors !== 1 ? 's' : ''})`}
              </span>
            </div>
          </div>

          {/* Messages */}
          {error && <div className="document-permissions-dialog__error">{error}</div>}
          {successMessage && <div className="document-permissions-dialog__success">{successMessage}</div>}

          {/* Transfer ownership confirmation */}
          {transferToUserId && (
            <div className="document-permissions-dialog__transfer-confirm">
              <p>
                Transfer ownership to{' '}
                <strong>{accessList.find((m) => m.userId === transferToUserId)?.username}</strong>?
              </p>
              <p className="document-permissions-dialog__transfer-warning">
                ⚠️ You will lose owner privileges and become an editor. This action cannot be undone.
              </p>
              <div className="document-permissions-dialog__transfer-actions">
                <button
                  className="document-permissions-dialog__btn document-permissions-dialog__btn--danger"
                  onClick={handleConfirmTransfer}
                  disabled={isSaving}
                >
                  {isSaving ? 'Transferring...' : 'Transfer Ownership'}
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
              {/* Quick actions */}
              <div className="document-permissions-dialog__quick-actions">
                <button
                  className="document-permissions-dialog__quick-btn"
                  onClick={handleGrantAllView}
                  title="Grant view access to all team members"
                >
                  Grant All View
                </button>
                <button
                  className="document-permissions-dialog__quick-btn document-permissions-dialog__quick-btn--danger"
                  onClick={handleRevokeAll}
                  title="Revoke all access"
                >
                  Revoke All
                </button>
              </div>

              {/* Team members list */}
              <div className="document-permissions-dialog__section">
                <h4>Team Members</h4>
                {accessList.length === 0 ? (
                  <p className="document-permissions-dialog__empty">No other team members available</p>
                ) : (
                  <ul className="document-permissions-dialog__members">
                    {accessList.map((member) => (
                      <li
                        key={member.userId}
                        className={`document-permissions-dialog__member ${member.permission !== 'none' ? 'document-permissions-dialog__member--has-access' : ''} ${!member.isOnTeam ? 'document-permissions-dialog__member--offline' : ''}`}
                      >
                        <div className="document-permissions-dialog__member-info">
                          <span className="document-permissions-dialog__member-name">
                            {member.username}
                            {!member.isOnTeam && <span className="document-permissions-dialog__offline-badge">offline</span>}
                          </span>
                        </div>
                        <div className="document-permissions-dialog__member-controls">
                          <select
                            className="document-permissions-dialog__permission-select"
                            value={member.permission}
                            onChange={(e) => handlePermissionChange(member.userId, e.target.value as 'view' | 'edit' | 'none')}
                          >
                            <option value="none">No Access</option>
                            <option value="view">Viewer</option>
                            <option value="edit">Editor</option>
                          </select>
                          {member.permission !== 'none' && (
                            <button
                              className="document-permissions-dialog__transfer-btn"
                              onClick={() => handleTransferOwnership(member.userId)}
                              title="Transfer ownership to this user"
                            >
                              👑
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Actions */}
              <div className="document-permissions-dialog__actions">
                <button
                  className="document-permissions-dialog__btn document-permissions-dialog__btn--primary"
                  onClick={handleSave}
                  disabled={isSaving || !hasChanges}
                >
                  {isSaving ? 'Saving...' : hasChanges ? 'Save Changes' : 'No Changes'}
                </button>
                <button
                  className="document-permissions-dialog__btn"
                  onClick={onClose}
                  disabled={isSaving}
                >
                  {hasChanges ? 'Cancel' : 'Close'}
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
