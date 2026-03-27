/**
 * 🔐 ROLE-BASED COMPONENT WRAPPER
 * 
 * Senior Engineer Approach: Single component that efficiently handles
 * all role-based UI rendering and permission checking across the application.
 * 
 * Features:
 * - Unified permission checking
 * - Role-based conditional rendering
 * - Performance optimized with memoization
 * - TypeScript support with strong typing
 * - Fallback component support
 * - Multiple permission modes (ALL/ANY)
 * 
 * @version 2.0.0
 * @created 2025-08-27
 */

import React, { memo, useMemo } from 'react';

// ===========================
// TYPES & INTERFACES
// ===========================

export type UserRole = 'admin' | 'faculty' | 'student' | 'creator';

export type Permission = 
  // User Management
  | 'viewAllUsers' | 'createUser' | 'updateUser' | 'deleteUser'
  // College Management
  | 'viewAllColleges' | 'createCollege' | 'updateCollege' | 'deleteCollege'
  // Role Management
  | 'viewAllRoles' | 'createRole' | 'updateRole' | 'deleteRole'
  // Bounty Management
  | 'viewBounties' | 'viewAllBounties' | 'createBounty' | 'editBounty' | 'deleteBounty'
  // Reward Management
  | 'viewRewards' | 'viewAllRewards' | 'createReward' | 'updateReward' | 'deleteReward' | 'claimReward'
  // Point Request Management
  | 'submitPointRequest' | 'viewOwnPointRequests' | 'reviewPointRequests' | 'approvePointRequest' | 'denyPointRequest'
  | 'editOwnPointRequest' | 'deleteOwnPointRequest' | 'uploadEvidence' | 'viewEvidence'
  // Achievement Management
  | 'viewAllPointRequests' | 'viewAllAchievements' | 'manageAchievements'
  // Profile Management
  | 'viewOwnProfile' | 'updateOwnProfile';

export interface UserContextType {
  id: string;
  name: string;
  username: string;
  email?: string;
  role: UserRole;
  college_id?: number;
  is_active: boolean;
}

export interface RoleGuardProps {
  /** Required roles - user must have one of these roles */
  roles?: UserRole[];
  /** Required permissions - configurable based on mode */
  permissions?: Permission[];
  /** Permission checking mode: 'all' = user must have ALL permissions, 'any' = user must have ANY permission */
  mode?: 'all' | 'any';
  /** Component to render when access is denied */
  fallback?: React.ReactNode;
  /** Component to render when loading/checking permissions */
  loading?: React.ReactNode;
  /** Whether to show the fallback or hide completely when access denied */
  showFallback?: boolean;
  /** Custom permission check function */
  customCheck?: (user: UserContextType) => boolean;
  /** Children components to render when access is granted */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Enable debug logging */
  debug?: boolean;
}

// ===========================
// PERMISSION MAPPINGS
// Enhanced with all permissions from backend
// ===========================

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'viewAllUsers', 'createUser', 'updateUser', 'deleteUser',
    'viewAllColleges', 'createCollege', 'updateCollege', 'deleteCollege',
    'viewAllRoles', 'createRole', 'updateRole', 'deleteRole',
    'viewAllBounties', 'createBounty', 'editBounty', 'deleteBounty',
    'viewAllRewards', 'createReward', 'updateReward', 'deleteReward',
    'viewAllPointRequests', 'viewAllAchievements', 'manageAchievements'
  ],
  faculty: [
    'viewOwnProfile', 'updateOwnProfile',
    'viewBounties', 'editBounty',
    'viewRewards',
    'reviewPointRequests', 'approvePointRequest', 'denyPointRequest', 'viewEvidence'
  ],
  student: [
    'viewOwnProfile', 'updateOwnProfile',
    'viewBounties',
    'viewRewards', 'claimReward',
    'submitPointRequest', 'viewOwnPointRequests', 'editOwnPointRequest', 
    'deleteOwnPointRequest', 'uploadEvidence'
  ],
  creator: [
    'viewAllColleges', 'createCollege', 'updateCollege', 'deleteCollege',
    'viewAllRoles', 'createRole', 'updateRole', 'deleteRole',
    'viewAllRewards', 'createReward', 'updateReward', 'deleteReward',
    'viewAllBounties', 'createBounty', 'editBounty', 'deleteBounty'
  ]
};

// ===========================
// PERMISSION CHECKING UTILITIES
// ===========================

/**
 * Check if user has specific permission
 */
export function hasPermission(user: UserContextType | null, permission: Permission): boolean {
  if (!user || !user.is_active) return false;
  
  const userPermissions = ROLE_PERMISSIONS[user.role] || [];
  return userPermissions.includes(permission);
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(user: UserContextType | null, permissions: Permission[]): boolean {
  if (!user || !user.is_active || !permissions.length) return false;
  
  return permissions.some(permission => hasPermission(user, permission));
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(user: UserContextType | null, permissions: Permission[]): boolean {
  if (!user || !user.is_active || !permissions.length) return false;
  
  return permissions.every(permission => hasPermission(user, permission));
}

/**
 * Check if user has any of the specified roles
 */
export function hasRole(user: UserContextType | null, roles: UserRole[]): boolean {
  if (!user || !user.is_active || !roles.length) return false;
  
  return roles.includes(user.role);
}

/**
 * Get all permissions for a user's role
 */
export function getUserPermissions(user: UserContextType | null): Permission[] {
  if (!user || !user.is_active) return [];
  
  return ROLE_PERMISSIONS[user.role] || [];
}

// ===========================
// MOCK AUTH CONTEXT
// Replace with your actual auth context
// ===========================

const useAuth = () => {
  // This should be replaced with your actual auth context
  // For demonstration purposes, using localStorage
  const getUser = (): UserContextType | null => {
    try {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  };

  const user = getUser();
  
  return {
    user,
    isAuthenticated: !!user,
    hasPermission: (permission: Permission) => hasPermission(user, permission),
    hasAnyPermission: (permissions: Permission[]) => hasAnyPermission(user, permissions),
    hasAllPermissions: (permissions: Permission[]) => hasAllPermissions(user, permissions),
    hasRole: (roles: UserRole[]) => hasRole(user, roles),
    getUserPermissions: () => getUserPermissions(user)
  };
};

// ===========================
// MAIN ROLE GUARD COMPONENT
// ===========================

const RoleGuardComponent: React.FC<RoleGuardProps> = ({
  roles = [],
  permissions = [],
  mode = 'any',
  fallback = null,
  loading = null,
  showFallback = true,
  customCheck,
  children,
  className = '',
  debug = false
}) => {
  const { user, isAuthenticated } = useAuth();

  // Memoize permission checking for performance
  const hasAccess = useMemo(() => {
    if (debug) {
      console.log('RoleGuard: Checking access for user:', user);
      console.log('RoleGuard: Required roles:', roles);
      console.log('RoleGuard: Required permissions:', permissions);
      console.log('RoleGuard: Mode:', mode);
    }

    // If not authenticated, deny access
    if (!isAuthenticated || !user) {
      if (debug) console.log('RoleGuard: Access denied - not authenticated');
      return false;
    }

    // If user is inactive, deny access
    if (!user.is_active) {
      if (debug) console.log('RoleGuard: Access denied - user inactive');
      return false;
    }

    // Custom check takes precedence
    if (customCheck) {
      const customResult = customCheck(user);
      if (debug) console.log('RoleGuard: Custom check result:', customResult);
      return customResult;
    }

    // Check roles if specified
    let roleCheck = true;
    if (roles.length > 0) {
      roleCheck = hasRole(user, roles);
      if (debug) console.log('RoleGuard: Role check result:', roleCheck);
    }

    // Check permissions if specified
    let permissionCheck = true;
    if (permissions.length > 0) {
      permissionCheck = mode === 'all' 
        ? hasAllPermissions(user, permissions)
        : hasAnyPermission(user, permissions);
      if (debug) console.log('RoleGuard: Permission check result:', permissionCheck);
    }

    const finalResult = roleCheck && permissionCheck;
    if (debug) console.log('RoleGuard: Final access result:', finalResult);
    
    return finalResult;
  }, [user, isAuthenticated, roles, permissions, mode, customCheck, debug]);

  // Handle loading state
  if (!isAuthenticated && loading) {
    return <>{loading}</>;
  }

  // Handle access denied
  if (!hasAccess) {
    if (showFallback && fallback) {
      return <div className={className}>{fallback}</div>;
    }
    return null;
  }

  // Render children if access is granted
  return <div className={className}>{children}</div>;
};

// Memoize the component for performance
export const RoleGuard = memo(RoleGuardComponent);

// ===========================
// CONVENIENCE COMPONENTS
// ===========================

/**
 * Admin-only component wrapper
 */
export const AdminOnly: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}> = ({ children, fallback, className }) => (
  <RoleGuard 
    roles={['admin']} 
    fallback={fallback} 
    className={className}
  >
    {children}
  </RoleGuard>
);

/**
 * Faculty-only component wrapper
 */
export const FacultyOnly: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}> = ({ children, fallback, className }) => (
  <RoleGuard 
    roles={['faculty']} 
    fallback={fallback} 
    className={className}
  >
    {children}
  </RoleGuard>
);

/**
 * Student-only component wrapper
 */
export const StudentOnly: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}> = ({ children, fallback, className }) => (
  <RoleGuard 
    roles={['student']} 
    fallback={fallback} 
    className={className}
  >
    {children}
  </RoleGuard>
);

/**
 * Creator-only component wrapper
 */
export const CreatorOnly: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}> = ({ children, fallback, className }) => (
  <RoleGuard 
    roles={['creator']} 
    fallback={fallback} 
    className={className}
  >
    {children}
  </RoleGuard>
);

/**
 * Multi-role component wrapper (admin, faculty, creator)
 */
export const StaffOnly: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}> = ({ children, fallback, className }) => (
  <RoleGuard 
    roles={['admin', 'faculty', 'creator']} 
    fallback={fallback} 
    className={className}
  >
    {children}
  </RoleGuard>
);

// ===========================
// HOOK FOR PERMISSION CHECKING
// ===========================

/**
 * Custom hook for permission checking in components
 */
export const usePermissions = () => {
  const { user } = useAuth();
  
  return useMemo(() => ({
    // User info
    user,
    isAuthenticated: !!user,
    
    // Permission checking functions
    hasPermission: (permission: Permission) => hasPermission(user, permission),
    hasAnyPermission: (permissions: Permission[]) => hasAnyPermission(user, permissions),
    hasAllPermissions: (permissions: Permission[]) => hasAllPermissions(user, permissions),
    hasRole: (roles: UserRole[]) => hasRole(user, roles),
    
    // Convenience role checks
    isAdmin: () => hasRole(user, ['admin']),
    isFaculty: () => hasRole(user, ['faculty']),
    isStudent: () => hasRole(user, ['student']),
    isCreator: () => hasRole(user, ['creator']),
    isStaff: () => hasRole(user, ['admin', 'faculty', 'creator']),
    
    // Get all user permissions
    getUserPermissions: () => getUserPermissions(user),
    
    // Permission categories
    canManageUsers: () => hasAnyPermission(user, ['createUser', 'updateUser', 'deleteUser']),
    canManageBounties: () => hasAnyPermission(user, ['createBounty', 'editBounty', 'deleteBounty']),
    canManageRewards: () => hasAnyPermission(user, ['createReward', 'updateReward', 'deleteReward']),
    canReviewPointRequests: () => hasPermission(user, 'reviewPointRequests'),
    canSubmitPointRequests: () => hasPermission(user, 'submitPointRequest'),
    canClaimRewards: () => hasPermission(user, 'claimReward')
  }), [user]);
};

// ===========================
// UTILITY COMPONENTS
// ===========================

/**
 * Loading placeholder component
 */
export const PermissionLoading: React.FC<{
  message?: string;
  className?: string;
}> = ({ 
  message = 'Checking permissions...', 
  className = 'text-gray-500 p-4' 
}) => (
  <div className={className}>
    <div className="animate-pulse">
      {message}
    </div>
  </div>
);

/**
 * Access denied component
 */
export const AccessDenied: React.FC<{
  message?: string;
  className?: string;
}> = ({ 
  message = 'You do not have permission to access this content.', 
  className = 'text-red-500 p-4 text-center' 
}) => (
  <div className={className}>
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-red-800 mb-2">Access Denied</h3>
      <p className="text-red-600">{message}</p>
    </div>
  </div>
);

// ===========================
// EXAMPLE USAGE COMPONENTS
// ===========================

/**
 * Example: Dashboard with role-based sections
 */
export const ExampleDashboard: React.FC = () => {
  const { isAdmin, isFaculty, isStudent, hasPermission } = usePermissions();

  return (
    <div className="dashboard">
      {/* Admin Section */}
      <AdminOnly fallback={<AccessDenied message="Admin access required" />}>
        <div className="admin-panel">
          <h2>Admin Dashboard</h2>
          {/* Admin-specific content */}
        </div>
      </AdminOnly>

      {/* Faculty Section */}
      <FacultyOnly>
        <div className="faculty-panel">
          <h2>Faculty Dashboard</h2>
          {/* Faculty-specific content */}
        </div>
      </FacultyOnly>

      {/* Student Section */}
      <StudentOnly>
        <div className="student-panel">
          <h2>Student Dashboard</h2>
          {/* Student-specific content */}
        </div>
      </StudentOnly>

      {/* Permission-based sections */}
      <RoleGuard 
        permissions={['createBounty']} 
        fallback={<p>Cannot create bounties</p>}
      >
        <button>Create New Bounty</button>
      </RoleGuard>

      <RoleGuard 
        permissions={['reviewPointRequests']} 
        mode="all"
      >
        <div>Point Request Review Panel</div>
      </RoleGuard>
    </div>
  );
};

export default RoleGuard;