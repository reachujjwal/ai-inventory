export const ROLES = {
    ADMIN: 'admin',
    BRANCH_MANAGER: 'branch_manager',
    BRANCH_CASHIER: 'branch_cashier',
    USER: 'user',
    TENANT: 'tenant'
};

export const PERMISSIONS = {
    MODULE_USERS: 'users',
    MODULE_PRODUCTS: 'products',
    MODULE_INVENTORY: 'inventory',
    MODULE_CATEGORIES: 'categories',
    MODULE_SALES: 'sales',
    MODULE_ORDERS: 'orders',
    MODULE_PERMISSIONS: 'permissions',
    MODULE_COUPONS: 'coupons',
    MODULE_REWARDS: 'rewards'
};

/**
 * Checks if a user has a specific permission for a module.
 * @param userPermissions Array of permission objects from user context
 * @param module Name of the module (e.g., 'products')
 * @param action Skill to check (e.g., 'can_view', 'can_add')
 */
export const hasPermission = (userPermissions: any[] | undefined, module: string, action: string = 'can_view') => {
    if (!userPermissions) return false;
    const perm = userPermissions.find(p => p.module === module);
    return perm ? !!perm[action] : false;
};

// Define static permissions for roles (fallback if dynamic perms are missing)
const STATIC_PERMISSIONS: Record<string, string[]> = {
    [ROLES.USER]: [PERMISSIONS.MODULE_SALES, PERMISSIONS.MODULE_ORDERS, PERMISSIONS.MODULE_REWARDS, PERMISSIONS.MODULE_COUPONS],
    [ROLES.TENANT]: [
        PERMISSIONS.MODULE_PRODUCTS,
        PERMISSIONS.MODULE_INVENTORY,
        PERMISSIONS.MODULE_ORDERS,
        PERMISSIONS.MODULE_CATEGORIES,
        PERMISSIONS.MODULE_SALES,  // View-only for their product sales
        PERMISSIONS.MODULE_COUPONS,
        PERMISSIONS.MODULE_REWARDS
    ],
    [ROLES.BRANCH_MANAGER]: [
        PERMISSIONS.MODULE_USERS,
        PERMISSIONS.MODULE_PRODUCTS,
        PERMISSIONS.MODULE_INVENTORY,
        PERMISSIONS.MODULE_CATEGORIES,
        PERMISSIONS.MODULE_SALES,
        PERMISSIONS.MODULE_ORDERS
    ],
    [ROLES.BRANCH_CASHIER]: [
        PERMISSIONS.MODULE_PRODUCTS,
        PERMISSIONS.MODULE_INVENTORY,
        PERMISSIONS.MODULE_SALES,
        PERMISSIONS.MODULE_ORDERS
    ]
};

/**
 * Backwards compatible access check, or for simple module-level checks.
 */
export const canAccess = (userRole: string | undefined, modulePermissions: string[] | string, userPermissions?: any[]) => {
    if (!userRole) return false;
    if (userRole === ROLES.ADMIN) return true; // Admins ALWAYS have access

    // If dynamic permissions are provided, use them
    if (userPermissions && typeof modulePermissions === 'string') {
        return hasPermission(userPermissions, modulePermissions, 'can_view');
    }

    // Fallback to role-based check if no dynamic perms
    if (Array.isArray(modulePermissions)) {
        return modulePermissions.includes(userRole);
    }

    // Check static permissions map
    if (typeof modulePermissions === 'string') {
        const rolePerms = STATIC_PERMISSIONS[userRole];
        if (rolePerms && rolePerms.includes(modulePermissions)) {
            return true;
        }
    }

    return false;
};
