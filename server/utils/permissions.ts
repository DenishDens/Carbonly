
import { UserRole } from "@shared/schema";
import type { User, BusinessUnit } from "@shared/schema";

// Define permission types
export const Permission = {
  VIEW_BUSINESS_UNIT: 'view_business_unit',
  MANAGE_BUSINESS_UNIT: 'manage_business_unit',
  UPLOAD_DATA: 'upload_data',
  APPROVE_DATA: 'approve_data',
  MANAGE_USERS: 'manage_users',
  VIEW_FINANCIALS: 'view_financials',
  MANAGE_SUBSCRIPTION: 'manage_subscription',
} as const;

export type PermissionType = typeof Permission[keyof typeof Permission];

// Role-based permission map
const rolePermissions: Record<string, PermissionType[]> = {
  [UserRole.ADMIN]: [
    Permission.VIEW_BUSINESS_UNIT,
    Permission.MANAGE_BUSINESS_UNIT,
    Permission.UPLOAD_DATA,
    Permission.APPROVE_DATA,
    Permission.MANAGE_USERS,
    Permission.VIEW_FINANCIALS,
    Permission.MANAGE_SUBSCRIPTION,
  ],
  [UserRole.BUSINESS_UNIT_MANAGER]: [
    Permission.VIEW_BUSINESS_UNIT,
    Permission.MANAGE_BUSINESS_UNIT,
    Permission.UPLOAD_DATA,
    Permission.APPROVE_DATA,
    Permission.MANAGE_USERS,
    Permission.VIEW_FINANCIALS,
  ],
  [UserRole.TEAM_MEMBER]: [
    Permission.VIEW_BUSINESS_UNIT,
    Permission.UPLOAD_DATA,
  ],
  [UserRole.AUDITOR]: [
    Permission.VIEW_BUSINESS_UNIT,
    Permission.VIEW_FINANCIALS,
  ],
};

/**
 * Check if a user has a specific permission
 */
export function hasPermission(user: User, permission: PermissionType): boolean {
  if (!user || !user.role) return false;
  
  const permissions = rolePermissions[user.role];
  return permissions?.includes(permission) || false;
}

/**
 * Check if a user has access to a specific business unit
 */
export function hasBusinessUnitAccess(user: User, businessUnitId: string, businessUnits?: BusinessUnit[]): boolean {
  // Admins have access to all business units
  if (user.role === UserRole.ADMIN) return true;
  
  // For other roles, they need to be explicitly assigned
  if (user.role === UserRole.BUSINESS_UNIT_MANAGER) {
    return user.businessUnitId === businessUnitId || 
           businessUnits?.some(bu => bu.id === businessUnitId && bu.managerId === user.id) || false;
  }
  
  // Team members can only access their assigned business unit
  if (user.role === UserRole.TEAM_MEMBER || user.role === UserRole.AUDITOR) {
    return user.businessUnitId === businessUnitId;
  }
  
  return false;
}

/**
 * Checks if a user can perform an action on a business unit
 */
export function canPerformAction(
  user: User, 
  permission: PermissionType, 
  businessUnitId?: string, 
  businessUnits?: BusinessUnit[]
): boolean {
  // First check if user has the permission based on role
  if (!hasPermission(user, permission)) return false;
  
  // If businessUnitId is provided, check if user has access to it
  if (businessUnitId) {
    return hasBusinessUnitAccess(user, businessUnitId, businessUnits);
  }
  
  return true;
}

/**
 * Get all business units a user has access to
 */
export function getAccessibleBusinessUnits(user: User, allBusinessUnits: BusinessUnit[]): BusinessUnit[] {
  if (user.role === UserRole.ADMIN) {
    return allBusinessUnits;
  }
  
  if (user.role === UserRole.BUSINESS_UNIT_MANAGER) {
    return allBusinessUnits.filter(
      bu => bu.managerId === user.id || bu.id === user.businessUnitId
    );
  }
  
  // Team members and auditors only see their assigned BU
  if (user.businessUnitId) {
    return allBusinessUnits.filter(bu => bu.id === user.businessUnitId);
  }
  
  return [];
}
