export const Permissions = {
  ORDERS_CREATE: 'orders.create',
  ORDERS_READ: 'orders.read',
  ORDERS_UPDATE: 'orders.update',
  ORDERS_CANCEL: 'orders.cancel',

  VEHICLES_READ: 'vehicles.read',
  VEHICLES_UPDATE: 'vehicles.update',
  VEHICLES_ASSIGN: 'vehicles.assign',
  VEHICLES_RELEASE: 'vehicles.release',

  TRACKING_READ: 'tracking.read',

  ROUTES_READ: 'routes.read',
  ROUTES_CALCULATE: 'routes.calculate',

  INVOICES_READ: 'invoices.read',
  INVOICES_UPDATE: 'invoices.update',

  DISPATCH_READ: 'dispatch.read',
  DISPATCH_EXECUTE: 'dispatch.execute',
  DISPATCH_CANCEL: 'dispatch.cancel',

  USERS_MANAGE: 'users.manage',

  SETTINGS_MANAGE: 'settings.manage',
} as const;

export type PermissionKey = keyof typeof Permissions;
export type PermissionValue = typeof Permissions[PermissionKey];