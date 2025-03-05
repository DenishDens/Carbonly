
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';

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
  'admin': [
    Permission.VIEW_BUSINESS_UNIT,
    Permission.MANAGE_BUSINESS_UNIT,
    Permission.UPLOAD_DATA,
    Permission.APPROVE_DATA,
    Permission.MANAGE_USERS,
    Permission.VIEW_FINANCIALS,
    Permission.MANAGE_SUBSCRIPTION,
  ],
  'business_unit_manager': [
    Permission.VIEW_BUSINESS_UNIT,
    Permission.MANAGE_BUSINESS_UNIT,
    Permission.UPLOAD_DATA,
    Permission.APPROVE_DATA,
    Permission.MANAGE_USERS,
    Permission.VIEW_FINANCIALS,
  ],
  'team_member': [
    Permission.VIEW_BUSINESS_UNIT,
    Permission.UPLOAD_DATA,
  ],
  'auditor': [
    Permission.VIEW_BUSINESS_UNIT,
    Permission.VIEW_FINANCIALS,
  ],
};

export function usePermissions() {
  const { user } = useAuth();
  
  // Get business units
  const { data: businessUnits = [] } = useQuery({
    queryKey: ['/api/business-units'],
    enabled: !!user,
  });
  
  const hasPermission = (permission: PermissionType): boolean => {
    if (!user || !user.role) return false;
    
    const permissions = rolePermissions[user.role];
    return permissions?.includes(permission) || false;
  };
  
  const hasBusinessUnitAccess = (businessUnitId: string): boolean => {
    if (!user || !businessUnitId) return false;
    
    // Admins have access to all business units
    if (user.role === 'admin') return true;
    
    // Business Unit Managers access their assigned BUs
    if (user.role === 'business_unit_manager') {
      return user.businessUnitId === businessUnitId ||
             businessUnits.some(bu => bu.id === businessUnitId && bu.managerId === user.id);
    }
    
    // Team members and auditors only access their assigned BU
    return user.businessUnitId === businessUnitId;
  };
  
  const canPerformAction = (
    permission: PermissionType, 
    businessUnitId?: string
  ): boolean => {
    // First check if user has the permission based on role
    if (!hasPermission(permission)) return false;
    
    // If businessUnitId is provided, check if user has access to it
    if (businessUnitId) {
      return hasBusinessUnitAccess(businessUnitId);
    }
    
    return true;
  };
  
  return {
    hasPermission,
    hasBusinessUnitAccess,
    canPerformAction,
    Permission,
  };
}
