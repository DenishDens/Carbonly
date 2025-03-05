
import { Request, Response, NextFunction } from 'express';
import { Permission, canPerformAction } from '../utils/permissions';
import { storage } from '../storage';

/**
 * Middleware to require authentication for routes
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
}

/**
 * Middleware to check if user has a specific permission
 */
export function requirePermission(permission: typeof Permission[keyof typeof Permission]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (!canPerformAction(req.user, permission)) {
      return res.status(403).json({ message: 'Permission denied' });
    }
    
    next();
  };
}

/**
 * Middleware to check if user has access to a business unit
 */
export function requireBusinessUnitAccess(businessUnitIdParam: string = 'id') {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const businessUnitId = req.params[businessUnitIdParam];
    if (!businessUnitId) {
      return res.status(400).json({ message: 'Business unit ID is required' });
    }
    
    const units = await storage.getBusinessUnits(req.user.organizationId);
    if (!canPerformAction(req.user, Permission.VIEW_BUSINESS_UNIT, businessUnitId, units)) {
      return res.status(403).json({ message: 'Access to this business unit is denied' });
    }
    
    next();
  };
}
