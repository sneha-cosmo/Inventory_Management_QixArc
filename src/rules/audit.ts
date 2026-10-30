/**
 * Pure Domain Rules: Strict 6-Field Audit Log Event Constructor
 */
import { Clock } from './clock';

export interface AuditEventParams {
  action: string;             // 1. Action Type
  entityType: string;         // 2. Entity Model Type (Item Reference)
  entityId: string;           // 2b. Entity ID (Item Reference)
  details: string;            // 3. Description
  operatorName?: string;      // 4. User
  operatorRole?: string;      // 5. Role
  operatorId?: string;
  customTimestamp?: string;   // 6. Timestamp (defaults to Clock.getCurrentDate().toISOString())
}

export interface StrictAuditEvent {
  id: string;
  timestamp: string;          // Field 1: Timestamp
  operatorName: string;       // Field 2: User
  user: string;               // Alias for Field 2: User
  operatorRole: string;       // Field 3: Role
  role: string;               // Alias for Field 3: Role
  action: string;             // Field 4: Action Type
  details: string;            // Field 5: Description
  description: string;        // Alias for Field 5: Description
  entityId: string;           // Field 6: Item Reference ID
  entityType: string;         // Field 6b: Item Reference Type
  itemReference: string;      // Alias: `${entityType}:${entityId}`
  operatorId?: string;
}

/**
 * Creates a verified 6-field audit log record ensuring all required audit fields are present.
 */
export function createAuditEvent(params: AuditEventParams): StrictAuditEvent {
  const timestamp = params.customTimestamp || Clock.getCurrentDate().toISOString();
  const operatorName = params.operatorName?.trim() || 'System Operator';
  const operatorRole = params.operatorRole?.trim() || 'system';
  const action = params.action?.trim() || 'Unknown Action';
  const details = params.details?.trim() || 'No description provided';
  const entityId = params.entityId?.trim() || 'N/A';
  const entityType = params.entityType?.trim() || 'General';

  return {
    id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp,
    operatorName,
    user: operatorName,
    operatorRole,
    role: operatorRole,
    action,
    details,
    description: details,
    entityId,
    entityType,
    itemReference: `${entityType}:${entityId}`,
    operatorId: params.operatorId
  };
}
