
import { ReactNode } from 'react';
import { usePermissions, type PermissionType } from '@/hooks/use-permissions';

type PermissionGateProps = {
  permission: PermissionType;
  businessUnitId?: string;
  children: ReactNode;
  fallback?: ReactNode;
};

/**
 * A component that conditionally renders its children based on user permissions
 */
export function PermissionGate({ 
  permission, 
  businessUnitId, 
  children, 
  fallback 
}: PermissionGateProps) {
  const { canPerformAction } = usePermissions();
  
  const hasAccess = canPerformAction(permission, businessUnitId);
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  return fallback ? <>{fallback}</> : null;
}
