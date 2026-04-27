import { RolesService, PermissionsService } from './roles.service';

describe('RolesService', () => {
  it('should be defined', () => {
    expect(RolesService).toBeDefined();
  });

  it('should have listRoles method', () => {
    expect(RolesService.prototype).toHaveProperty('listRoles');
  });

  it('should have getRole method', () => {
    expect(RolesService.prototype).toHaveProperty('getRole');
  });
});

describe('PermissionsService', () => {
  it('should be defined', () => {
    expect(PermissionsService).toBeDefined();
  });

  it('should have listPermissions method', () => {
    expect(PermissionsService.prototype).toHaveProperty('listPermissions');
  });
});