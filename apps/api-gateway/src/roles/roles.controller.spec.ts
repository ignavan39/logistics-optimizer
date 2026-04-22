import { Test, TestingModule } from '@nestjs/testing';
import { RolesService, PermissionsService } from './roles.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { UserRole } from './entities/user-role.entity';

describe('RolesService', () => {
  let service: RolesService;

  const mockRoleRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((entity, data) => data),
    save: jest.fn((data) => Promise.resolve({ id: 'role-1', ...data })),
    delete: jest.fn(),
  };

  const mockPermissionRepository = {
    find: jest.fn(),
    findBy: jest.fn(),
  };

  const mockUserRoleRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    manager: {
      create: jest.fn((_, data) => data),
      save: jest.fn((_, data) => Promise.resolve(data)),
      query: jest.fn().mockResolvedValue([]),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: getRepositoryToken(Role), useValue: mockRoleRepository },
        { provide: getRepositoryToken(Permission), useValue: mockPermissionRepository },
        { provide: getRepositoryToken(UserRole), useValue: mockUserRoleRepository },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listRoles', () => {
    it('should return all roles', async () => {
      const roles = [{ id: 'role-1', name: 'admin' }];
      mockRoleRepository.find.mockResolvedValue(roles);

      const result = await service.listRoles();

      expect(result).toEqual(roles);
    });
  });

  describe('getRole', () => {
    it('should return role by id', async () => {
      const role = { id: 'role-1', name: 'admin' };
      mockRoleRepository.findOne.mockResolvedValue(role);

      const result = await service.getRole('role-1');

      expect(result).toEqual(role);
    });
  });

  describe('createRole', () => {
    it('should create a new role', async () => {
      const dto = { name: 'dispatcher', description: 'Can dispatch orders', permissions: [] };
      mockRoleRepository.save.mockResolvedValue({ id: 'role-1', ...dto });
      mockPermissionRepository.findBy.mockResolvedValue([]);

      const result = await service.createRole(dto);

      expect(result.name).toBe('dispatcher');
      expect(mockRoleRepository.create).toHaveBeenCalled();
    });
  });

  describe('deleteRole', () => {
    it('should delete role', async () => {
      await service.deleteRole('role-1');

      expect(mockUserRoleRepository.manager.query).toHaveBeenCalledTimes(2);
      expect(mockRoleRepository.delete).toHaveBeenCalledWith({ id: 'role-1' });
    });
  });

  describe('assignRoleToUser', () => {
    it('should assign role to user', async () => {
      mockUserRoleRepository.findOne.mockResolvedValue(null);

      const result = await service.assignRoleToUser('role-1', { userId: 'user-1', roleId: 'role-1' });

      expect(result.message).toBe('Role assigned successfully');
    });

    it('should return if role already assigned', async () => {
      mockUserRoleRepository.findOne.mockResolvedValue({ id: 'existing' });

      const result = await service.assignRoleToUser('role-1', { userId: 'user-1', roleId: 'role-1' });

      expect(result.message).toBe('Role already assigned');
    });
  });
});

describe('PermissionsService', () => {
  let service: PermissionsService;

  const mockPermissionRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((entity, data) => data),
    save: jest.fn((data) => Promise.resolve({ id: 'perm-1', ...data })),
    delete: jest.fn(),
    manager: {
      query: jest.fn().mockResolvedValue([]),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        { provide: getRepositoryToken(Permission), useValue: mockPermissionRepository },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listPermissions', () => {
    it('should return all permissions', async () => {
      const permissions = [{ id: 'perm-1', name: 'orders.create' }];
      mockPermissionRepository.find.mockResolvedValue(permissions);

      const result = await service.listPermissions();

      expect(result).toEqual(permissions);
    });
  });

  describe('createPermission', () => {
    it('should create a new permission', async () => {
      const dto = { name: 'orders.create', description: 'Can create orders' };
      mockPermissionRepository.save.mockResolvedValueOnce({ id: 'perm-1', ...dto });

      const result = await service.createPermission(dto);

      expect(result.name).toBe('orders.create');
    });
  });
});