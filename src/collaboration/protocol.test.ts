import { describe, it, expect } from 'vitest';
import {
  // Message type constants
  MESSAGE_SYNC,
  MESSAGE_AWARENESS,
  MESSAGE_AUTH,
  MESSAGE_DOC_LIST,
  MESSAGE_DOC_GET,
  MESSAGE_DOC_SAVE,
  MESSAGE_DOC_DELETE,
  MESSAGE_DOC_EVENT,
  MESSAGE_ERROR,
  MESSAGE_AUTH_RESPONSE,
  MESSAGE_JOIN_DOC,
  MESSAGE_AUTH_LOGIN,
  MESSAGE_DOC_SHARE,
  MESSAGE_DOC_TRANSFER,
  // Error codes
  ERR_ACCESS_DENIED,
  ERR_DOC_NOT_FOUND,
  ERR_NOT_AUTHENTICATED,
  ERR_DELETE_FORBIDDEN,
  ERR_EDIT_FORBIDDEN,
  ERR_VIEW_FORBIDDEN,
  // Functions
  encodeMessage,
  decodeMessageType,
  decodePayload,
  generateRequestId,
  hasErrorCode,
  isPermissionError,
  getMessageChannel,
  isCRDTMessage,
  isAuthMessage,
  isDocumentMessage,
  isRequestMessage,
  getMessageTypeName,
  // Types
  type AuthLoginRequest,
  type AuthResponse,
  type DocListRequest,
  type DocListResponse,
  type DocGetRequest,
  type DocSaveRequest,
  type DocDeleteRequest,
  type DocEvent,
  type JoinDocRequest,
  type ShareEntry,
  type DocShareRequest,
  type DocTransferRequest,
  type ErrorResponse,
} from './protocol';

describe('Protocol Message Types', () => {
  it('has correct message type values', () => {
    expect(MESSAGE_SYNC).toBe(0);
    expect(MESSAGE_AWARENESS).toBe(1);
    expect(MESSAGE_AUTH).toBe(2);
    expect(MESSAGE_DOC_LIST).toBe(3);
    expect(MESSAGE_DOC_GET).toBe(4);
    expect(MESSAGE_DOC_SAVE).toBe(5);
    expect(MESSAGE_DOC_DELETE).toBe(6);
    expect(MESSAGE_DOC_EVENT).toBe(7);
    expect(MESSAGE_ERROR).toBe(8);
    expect(MESSAGE_AUTH_RESPONSE).toBe(9);
    expect(MESSAGE_JOIN_DOC).toBe(10);
    expect(MESSAGE_AUTH_LOGIN).toBe(11);
    expect(MESSAGE_DOC_SHARE).toBe(12);
    expect(MESSAGE_DOC_TRANSFER).toBe(13);
  });
});

describe('encodeMessage', () => {
  it('encodes a simple string payload', () => {
    const data = encodeMessage(MESSAGE_AUTH, 'test-token');

    expect(data[0]).toBe(MESSAGE_AUTH);
    const json = new TextDecoder().decode(data.slice(1));
    expect(JSON.parse(json)).toBe('test-token');
  });

  it('encodes an object payload', () => {
    const payload: DocListRequest = { requestId: 'req-123' };
    const data = encodeMessage(MESSAGE_DOC_LIST, payload);

    expect(data[0]).toBe(MESSAGE_DOC_LIST);
    const json = new TextDecoder().decode(data.slice(1));
    expect(JSON.parse(json)).toEqual({ requestId: 'req-123' });
  });

  it('encodes complex nested objects', () => {
    const payload: DocSaveRequest = {
      requestId: 'req-456',
      document: {
        id: 'doc-1',
        name: 'Test Document',
        shapes: { 'shape-1': { id: 'shape-1', type: 'rectangle', x: 0, y: 0 } },
        shapeOrder: ['shape-1'],
        connections: {},
        pages: [],
        currentPageId: 'page-1',
        createdAt: 1000,
        modifiedAt: 2000,
      } as any,
    };
    const data = encodeMessage(MESSAGE_DOC_SAVE, payload);

    expect(data[0]).toBe(MESSAGE_DOC_SAVE);
    const decoded = JSON.parse(new TextDecoder().decode(data.slice(1)));
    expect(decoded.requestId).toBe('req-456');
    expect(decoded.document.id).toBe('doc-1');
    expect(decoded.document.name).toBe('Test Document');
  });

  it('encodes login credentials', () => {
    const payload: AuthLoginRequest = { username: 'admin', password: 'secret123' };
    const data = encodeMessage(MESSAGE_AUTH_LOGIN, payload);

    expect(data[0]).toBe(MESSAGE_AUTH_LOGIN);
    const decoded = JSON.parse(new TextDecoder().decode(data.slice(1)));
    expect(decoded).toEqual({ username: 'admin', password: 'secret123' });
  });

  it('encodes share request with multiple entries', () => {
    const shares: ShareEntry[] = [
      { userId: 'user-1', userName: 'Alice', permission: 'editor' },
      { userId: 'user-2', userName: 'Bob', permission: 'viewer' },
    ];
    const payload: DocShareRequest = { requestId: 'req-789', docId: 'doc-1', shares };
    const data = encodeMessage(MESSAGE_DOC_SHARE, payload);

    expect(data[0]).toBe(MESSAGE_DOC_SHARE);
    const decoded = JSON.parse(new TextDecoder().decode(data.slice(1)));
    expect(decoded.shares).toHaveLength(2);
    expect(decoded.shares[0].permission).toBe('editor');
  });

  it('encodes transfer request', () => {
    const payload: DocTransferRequest = {
      requestId: 'req-transfer',
      docId: 'doc-1',
      newOwnerId: 'user-new',
      newOwnerName: 'New Owner',
    };
    const data = encodeMessage(MESSAGE_DOC_TRANSFER, payload);

    expect(data[0]).toBe(MESSAGE_DOC_TRANSFER);
    const decoded = JSON.parse(new TextDecoder().decode(data.slice(1)));
    expect(decoded.newOwnerId).toBe('user-new');
    expect(decoded.newOwnerName).toBe('New Owner');
  });

  it('handles unicode characters', () => {
    const payload = { name: '测试文档 📝', description: 'Ünïcödé tëst' };
    const data = encodeMessage(MESSAGE_DOC_SAVE, payload);

    const decoded = JSON.parse(new TextDecoder().decode(data.slice(1)));
    expect(decoded.name).toBe('测试文档 📝');
    expect(decoded.description).toBe('Ünïcödé tëst');
  });

  it('handles empty objects', () => {
    const data = encodeMessage(MESSAGE_DOC_LIST, {});

    expect(data[0]).toBe(MESSAGE_DOC_LIST);
    expect(JSON.parse(new TextDecoder().decode(data.slice(1)))).toEqual({});
  });

  it('handles null values in payload', () => {
    const payload = { requestId: 'req-1', error: null };
    const data = encodeMessage(MESSAGE_ERROR, payload);

    const decoded = JSON.parse(new TextDecoder().decode(data.slice(1)));
    expect(decoded.error).toBeNull();
  });
});

describe('decodeMessageType', () => {
  it('decodes message type from Uint8Array', () => {
    const data = encodeMessage(MESSAGE_DOC_GET, { requestId: 'test' });
    expect(decodeMessageType(data)).toBe(MESSAGE_DOC_GET);
  });

  it('decodes message type from ArrayBuffer', () => {
    const data = encodeMessage(MESSAGE_AUTH_RESPONSE, { success: true });
    expect(decodeMessageType(data.buffer)).toBe(MESSAGE_AUTH_RESPONSE);
  });

  it('returns null for empty data', () => {
    expect(decodeMessageType(new Uint8Array(0))).toBeNull();
    expect(decodeMessageType(new ArrayBuffer(0))).toBeNull();
  });

  it('handles all message types', () => {
    const types = [
      MESSAGE_SYNC,
      MESSAGE_AWARENESS,
      MESSAGE_AUTH,
      MESSAGE_DOC_LIST,
      MESSAGE_DOC_GET,
      MESSAGE_DOC_SAVE,
      MESSAGE_DOC_DELETE,
      MESSAGE_DOC_EVENT,
      MESSAGE_ERROR,
      MESSAGE_AUTH_RESPONSE,
      MESSAGE_JOIN_DOC,
      MESSAGE_AUTH_LOGIN,
      MESSAGE_DOC_SHARE,
      MESSAGE_DOC_TRANSFER,
    ];

    for (const type of types) {
      const data = encodeMessage(type, {});
      expect(decodeMessageType(data)).toBe(type);
    }
  });
});

describe('decodePayload', () => {
  it('decodes string payload', () => {
    const data = encodeMessage(MESSAGE_AUTH, 'my-token');
    const payload = decodePayload<string>(data);
    expect(payload).toBe('my-token');
  });

  it('decodes object payload', () => {
    const original: AuthResponse = {
      success: true,
      userId: 'user-1',
      username: 'testuser',
      role: 'admin',
      token: 'jwt-token',
      tokenExpiresAt: 1234567890,
    };
    const data = encodeMessage(MESSAGE_AUTH_RESPONSE, original);
    const payload = decodePayload<AuthResponse>(data);

    expect(payload.success).toBe(true);
    expect(payload.userId).toBe('user-1');
    expect(payload.username).toBe('testuser');
    expect(payload.role).toBe('admin');
    expect(payload.token).toBe('jwt-token');
    expect(payload.tokenExpiresAt).toBe(1234567890);
  });

  it('decodes from ArrayBuffer', () => {
    const original: DocGetRequest = { requestId: 'req-1', docId: 'doc-1' };
    const data = encodeMessage(MESSAGE_DOC_GET, original);
    const payload = decodePayload<DocGetRequest>(data.buffer);

    expect(payload.requestId).toBe('req-1');
    expect(payload.docId).toBe('doc-1');
  });

  it('decodes document list response', () => {
    const original: DocListResponse = {
      requestId: 'req-list',
      documents: [
        { id: 'doc-1', name: 'Doc 1', createdAt: 1000, modifiedAt: 2000, ownerId: 'user-1', ownerName: 'User 1' },
        { id: 'doc-2', name: 'Doc 2', createdAt: 3000, modifiedAt: 4000, ownerId: 'user-2', ownerName: 'User 2' },
      ],
    };
    const data = encodeMessage(MESSAGE_DOC_LIST, original);
    const payload = decodePayload<DocListResponse>(data);

    expect(payload.documents).toHaveLength(2);
    expect(payload.documents[0]?.name).toBe('Doc 1');
    expect(payload.documents[1]?.name).toBe('Doc 2');
  });

  it('decodes document event', () => {
    const original: DocEvent = {
      eventType: 'updated',
      docId: 'doc-1',
      userId: 'user-1',
      metadata: { id: 'doc-1', name: 'Updated Doc', createdAt: 1000, modifiedAt: 5000, ownerId: 'user-1', ownerName: 'User 1' },
    };
    const data = encodeMessage(MESSAGE_DOC_EVENT, original);
    const payload = decodePayload<DocEvent>(data);

    expect(payload.eventType).toBe('updated');
    expect(payload.docId).toBe('doc-1');
    expect(payload.metadata?.name).toBe('Updated Doc');
  });

  it('throws for message too short', () => {
    expect(() => decodePayload(new Uint8Array(0))).toThrow('Message too short');
    expect(() => decodePayload(new Uint8Array(1))).toThrow('Message too short');
  });

  it('throws for invalid JSON', () => {
    const invalidData = new Uint8Array([MESSAGE_DOC_GET, 0x7b, 0x7b]); // Invalid JSON "{{"
    expect(() => decodePayload(invalidData)).toThrow();
  });
});

describe('generateRequestId', () => {
  it('generates unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateRequestId());
    }
    expect(ids.size).toBe(100);
  });

  it('starts with req- prefix', () => {
    const id = generateRequestId();
    expect(id.startsWith('req-')).toBe(true);
  });

  it('contains timestamp component', () => {
    const beforeTime = Date.now();
    const id = generateRequestId();
    const afterTime = Date.now();

    // Extract timestamp from ID (format: req-{timestamp}-{random})
    const parts = id.split('-');
    const timestamp = parseInt(parts[1]!, 10);

    expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
    expect(timestamp).toBeLessThanOrEqual(afterTime);
  });
});

describe('Error Code Helpers', () => {
  describe('hasErrorCode', () => {
    it('detects error code at start of string', () => {
      expect(hasErrorCode('ERR_ACCESS_DENIED: You do not have access', ERR_ACCESS_DENIED)).toBe(true);
      expect(hasErrorCode('ERR_DOC_NOT_FOUND', ERR_DOC_NOT_FOUND)).toBe(true);
    });

    it('returns false when code not at start', () => {
      expect(hasErrorCode('Error: ERR_ACCESS_DENIED', ERR_ACCESS_DENIED)).toBe(false);
      expect(hasErrorCode('Some other error', ERR_ACCESS_DENIED)).toBe(false);
    });

    it('handles empty strings', () => {
      expect(hasErrorCode('', ERR_ACCESS_DENIED)).toBe(false);
    });
  });

  describe('isPermissionError', () => {
    it('detects all permission error types', () => {
      expect(isPermissionError('ERR_ACCESS_DENIED: No access')).toBe(true);
      expect(isPermissionError('ERR_DELETE_FORBIDDEN: Cannot delete')).toBe(true);
      expect(isPermissionError('ERR_EDIT_FORBIDDEN: Cannot edit')).toBe(true);
      expect(isPermissionError('ERR_VIEW_FORBIDDEN: Cannot view')).toBe(true);
      expect(isPermissionError('ERR_NOT_AUTHENTICATED: Please login')).toBe(true);
    });

    it('returns false for non-permission errors', () => {
      expect(isPermissionError('ERR_DOC_NOT_FOUND')).toBe(false);
      expect(isPermissionError('Network error')).toBe(false);
      expect(isPermissionError('Timeout')).toBe(false);
    });
  });
});

describe('Message Channel Classification', () => {
  describe('getMessageChannel', () => {
    it('classifies CRDT messages', () => {
      expect(getMessageChannel(MESSAGE_SYNC)).toBe('crdt');
      expect(getMessageChannel(MESSAGE_AWARENESS)).toBe('crdt');
    });

    it('classifies auth messages', () => {
      expect(getMessageChannel(MESSAGE_AUTH)).toBe('auth');
      expect(getMessageChannel(MESSAGE_AUTH_LOGIN)).toBe('auth');
      expect(getMessageChannel(MESSAGE_AUTH_RESPONSE)).toBe('auth');
    });

    it('classifies document messages', () => {
      expect(getMessageChannel(MESSAGE_DOC_LIST)).toBe('document');
      expect(getMessageChannel(MESSAGE_DOC_GET)).toBe('document');
      expect(getMessageChannel(MESSAGE_DOC_SAVE)).toBe('document');
      expect(getMessageChannel(MESSAGE_DOC_DELETE)).toBe('document');
      expect(getMessageChannel(MESSAGE_DOC_EVENT)).toBe('document');
      expect(getMessageChannel(MESSAGE_JOIN_DOC)).toBe('document');
      expect(getMessageChannel(MESSAGE_ERROR)).toBe('document');
    });

    it('defaults unknown types to document channel', () => {
      expect(getMessageChannel(99)).toBe('document');
      expect(getMessageChannel(255)).toBe('document');
    });
  });

  describe('isCRDTMessage', () => {
    it('returns true for CRDT messages', () => {
      expect(isCRDTMessage(MESSAGE_SYNC)).toBe(true);
      expect(isCRDTMessage(MESSAGE_AWARENESS)).toBe(true);
    });

    it('returns false for non-CRDT messages', () => {
      expect(isCRDTMessage(MESSAGE_AUTH)).toBe(false);
      expect(isCRDTMessage(MESSAGE_DOC_SAVE)).toBe(false);
    });
  });

  describe('isAuthMessage', () => {
    it('returns true for auth messages', () => {
      expect(isAuthMessage(MESSAGE_AUTH)).toBe(true);
      expect(isAuthMessage(MESSAGE_AUTH_LOGIN)).toBe(true);
      expect(isAuthMessage(MESSAGE_AUTH_RESPONSE)).toBe(true);
    });

    it('returns false for non-auth messages', () => {
      expect(isAuthMessage(MESSAGE_SYNC)).toBe(false);
      expect(isAuthMessage(MESSAGE_DOC_GET)).toBe(false);
    });
  });

  describe('isDocumentMessage', () => {
    it('returns true for document messages', () => {
      expect(isDocumentMessage(MESSAGE_DOC_LIST)).toBe(true);
      expect(isDocumentMessage(MESSAGE_DOC_GET)).toBe(true);
      expect(isDocumentMessage(MESSAGE_DOC_SAVE)).toBe(true);
      expect(isDocumentMessage(MESSAGE_DOC_DELETE)).toBe(true);
      expect(isDocumentMessage(MESSAGE_DOC_EVENT)).toBe(true);
      expect(isDocumentMessage(MESSAGE_JOIN_DOC)).toBe(true);
      expect(isDocumentMessage(MESSAGE_ERROR)).toBe(true);
    });

    it('returns false for non-document messages', () => {
      expect(isDocumentMessage(MESSAGE_SYNC)).toBe(false);
      expect(isDocumentMessage(MESSAGE_AUTH)).toBe(false);
    });
  });

  describe('isRequestMessage', () => {
    it('returns true for request/response messages', () => {
      expect(isRequestMessage(MESSAGE_DOC_LIST)).toBe(true);
      expect(isRequestMessage(MESSAGE_DOC_GET)).toBe(true);
      expect(isRequestMessage(MESSAGE_DOC_SAVE)).toBe(true);
      expect(isRequestMessage(MESSAGE_DOC_DELETE)).toBe(true);
      expect(isRequestMessage(MESSAGE_AUTH_LOGIN)).toBe(true);
    });

    it('returns false for non-request messages', () => {
      expect(isRequestMessage(MESSAGE_SYNC)).toBe(false);
      expect(isRequestMessage(MESSAGE_AWARENESS)).toBe(false);
      expect(isRequestMessage(MESSAGE_DOC_EVENT)).toBe(false);
      expect(isRequestMessage(MESSAGE_AUTH)).toBe(false);
    });
  });
});

describe('getMessageTypeName', () => {
  it('returns human-readable names for all known types', () => {
    expect(getMessageTypeName(MESSAGE_SYNC)).toBe('SYNC');
    expect(getMessageTypeName(MESSAGE_AWARENESS)).toBe('AWARENESS');
    expect(getMessageTypeName(MESSAGE_AUTH)).toBe('AUTH');
    expect(getMessageTypeName(MESSAGE_DOC_LIST)).toBe('DOC_LIST');
    expect(getMessageTypeName(MESSAGE_DOC_GET)).toBe('DOC_GET');
    expect(getMessageTypeName(MESSAGE_DOC_SAVE)).toBe('DOC_SAVE');
    expect(getMessageTypeName(MESSAGE_DOC_DELETE)).toBe('DOC_DELETE');
    expect(getMessageTypeName(MESSAGE_DOC_EVENT)).toBe('DOC_EVENT');
    expect(getMessageTypeName(MESSAGE_ERROR)).toBe('ERROR');
    expect(getMessageTypeName(MESSAGE_AUTH_RESPONSE)).toBe('AUTH_RESPONSE');
    expect(getMessageTypeName(MESSAGE_JOIN_DOC)).toBe('JOIN_DOC');
    expect(getMessageTypeName(MESSAGE_AUTH_LOGIN)).toBe('AUTH_LOGIN');
  });

  it('returns UNKNOWN for unknown types', () => {
    expect(getMessageTypeName(99)).toBe('UNKNOWN(99)');
    expect(getMessageTypeName(255)).toBe('UNKNOWN(255)');
  });
});

describe('Round-trip Encoding/Decoding', () => {
  it('preserves data through encode/decode cycle', () => {
    const payloads = [
      { requestId: 'req-1' },
      { success: true, token: 'jwt-abc123' },
      { docId: 'doc-1', name: 'Test', shapes: {} },
      { eventType: 'created', docId: 'doc-2', userId: 'user-1' },
      { shares: [{ userId: 'u1', userName: 'User 1', permission: 'editor' }] },
    ];

    for (const payload of payloads) {
      const encoded = encodeMessage(MESSAGE_DOC_SAVE, payload);
      const decoded = decodePayload(encoded);
      expect(decoded).toEqual(payload);
    }
  });

  it('preserves arrays correctly', () => {
    const payload = { items: [1, 2, 3, 'a', 'b', { nested: true }] };
    const encoded = encodeMessage(MESSAGE_DOC_LIST, payload);
    const decoded = decodePayload<typeof payload>(encoded);

    expect(decoded.items).toEqual([1, 2, 3, 'a', 'b', { nested: true }]);
  });

  it('preserves special number values', () => {
    const payload = { zero: 0, negative: -100, float: 3.14159 };
    const encoded = encodeMessage(MESSAGE_DOC_SAVE, payload);
    const decoded = decodePayload<typeof payload>(encoded);

    expect(decoded.zero).toBe(0);
    expect(decoded.negative).toBe(-100);
    expect(decoded.float).toBeCloseTo(3.14159);
  });

  it('preserves boolean values', () => {
    const payload = { trueVal: true, falseVal: false };
    const encoded = encodeMessage(MESSAGE_DOC_SAVE, payload);
    const decoded = decodePayload<typeof payload>(encoded);

    expect(decoded.trueVal).toBe(true);
    expect(decoded.falseVal).toBe(false);
  });
});
