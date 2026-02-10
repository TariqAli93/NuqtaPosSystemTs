/**
 * IPC Permission Guard Service
 * Enforces RBAC at IPC boundary before handlers execute use cases.
 * Validates JWT access tokens and checks permissions.
 */

import { PermissionService, UserRole, JwtService } from '@nuqtaplus/core';
import { PermissionDeniedError } from '@nuqtaplus/core';
import { userContextService } from './UserContextService.js';

/**
 * Guard configuration for an IPC handler
 */
export interface GuardConfig {
  permission: string; // e.g., 'sales:create'
  requireAuth?: boolean; // default: true
  allowRoles?: UserRole[]; // Optional: if set, check against these roles instead of permission matrix
  accessToken?: string; // Optional: for future token validation
}

/**
 * Check if current user has required permission
 * @throws PermissionDeniedError if user lacks permission
 */
export function requirePermission(config: GuardConfig): void {
  // Check authentication
  if (config.requireAuth !== false) {
    const userId = userContextService.getUserId();
    if (!userId) {
      throw new PermissionDeniedError('User is not authenticated', { required: config.permission });
    }
  }

  // Check permission
  const context = userContextService.getContext();
  if (!context) {
    throw new PermissionDeniedError('User context not found', { required: config.permission });
  }

  const role = context.role as UserRole;

  // If allowRoles is specified, check against role list instead of permission matrix
  if (config.allowRoles) {
    if (!config.allowRoles.includes(role)) {
      throw new PermissionDeniedError(`Permission denied: ${config.permission}`, {
        required: config.permission,
        userRole: role,
        allowedRoles: config.allowRoles,
      });
    }
    return; // Role is in allowList, permission granted
  }

  // Otherwise, check permission matrix
  const hasPermission = PermissionService.hasPermission(role, config.permission);

  if (!hasPermission) {
    throw new PermissionDeniedError(`Permission denied: ${config.permission}`, {
      required: config.permission,
      userRole: role,
    });
  }
}

/**
 * Check if current user has any of the provided permissions
 * @throws PermissionDeniedError if user lacks all permissions
 */
export function requireAnyPermission(permissions: string[]): void {
  const context = userContextService.getContext();
  if (!context) {
    throw new PermissionDeniedError('User context not found', { required: permissions });
  }

  const role = context.role as UserRole;
  const hasAny = PermissionService.hasAnyPermission(role, permissions);

  if (!hasAny) {
    throw new PermissionDeniedError(
      `Insufficient permissions. Required one of: ${permissions.join(', ')}`,
      {
        required: permissions,
        userRole: role,
      }
    );
  }
}

/**
 * Create a guarded async handler wrapper
 * Executes guard before running handler
 */
export function createGuardedHandler<T>(
  config: GuardConfig,
  handler: () => Promise<T>
): () => Promise<T> {
  return async () => {
    requirePermission(config);
    return await handler();
  };
}

/**
 * Get current user's role
 * @returns role or null if not authenticated
 */
export function getCurrentRole(): UserRole | null {
  const context = userContextService.getContext();
  return (context?.role as UserRole) || null;
}

/**
 * Get current user ID
 * @returns userId or null if not authenticated
 */
export function getCurrentUserId(): number | null {
  return userContextService.getUserId();
}
