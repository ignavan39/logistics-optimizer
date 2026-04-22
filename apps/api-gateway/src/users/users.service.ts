import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserStatus } from './entities/user.entity';
import { Session } from './entities/session.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { CreateUserDto, RegisterDto, ListUsersQueryDto, UpdateUserDto } from './dto/user.dto';


@Injectable()
export class UsersService {
  private readonly SALT_ROUNDS = 12;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    private dataSource: DataSource,
  ) {}

  async createUser(dto: CreateUserDto) {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);
    const user = this.userRepository.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      isActive: true,
      isVerified: true,
    });
    await this.userRepository.save(user);
    await this.assignDefaultRole(user.id);

    return {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  async register(dto: RegisterDto) {
    return this.createUser({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });
  }

  private async assignDefaultRole(userId: string) {
    await this.dataSource.query(
      `INSERT INTO user_roles (user_id, role_id, assigned_at)
       SELECT $1, r.id, NOW() FROM roles r WHERE r.name = 'dispatcher'`,
      [userId],
    );
  }

  async findUsers(options?: ListUsersQueryDto): Promise<{ users: any[]; total: number; limit: number; offset: number }> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    const params: any[] = [];
    const conditions: string[] = [];

    if (options?.search) {
      params.push(`%${options.search}%`);
      conditions.push(`(u.email ILIKE $${params.length} OR u.first_name ILIKE $${params.length} OR u.last_name ILIKE $${params.length})`);
    }

    if (options?.status) {
      params.push(options.status === UserStatus.ACTIVE);
      conditions.push(`u.is_active = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    params.unshift(limit, offset);
    const [users, countResult] = await Promise.all([
      this.dataSource.query(
        `SELECT u.id, u.email, u.first_name, u.last_name, u.is_active, u.is_verified, u.created_at
         FROM users u
         ${whereClause}
         ORDER BY u.created_at DESC
         LIMIT $1 OFFSET $2`,
        params,
      ),
      this.dataSource.query(
        `SELECT COUNT(*) as total FROM users u ${whereClause}`,
        params.slice(2),
      ),
    ]);

    return {
      users,
      total: parseInt(countResult[0]?.total || '0', 10),
      limit,
      offset,
    };
  }

  async findUserById(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'email', 'firstName', 'lastName', 'isActive', 'isVerified', 'createdAt'],
    });
    if (!user) return null;

    const roles = await this.getUserRoles(id);
    return { ...user, roles };
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) return null;

    if (dto.firstName) user.firstName = dto.firstName;
    if (dto.lastName) user.lastName = dto.lastName;
    if (dto.status) user.isActive = dto.status === UserStatus.ACTIVE;

    await this.userRepository.save(user);
    return { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName };
  }

  async deactivateUser(id: string) {
    await this.terminateUserSessions(id);
    await this.userRepository.update({ id }, { isActive: false });
  }

  async getUserSessions(userId: string) {
    return this.sessionRepository.find({
      where: { userId },
      select: ['id', 'deviceName', 'ipAddress', 'lastUsedAt', 'createdAt'],
      order: { lastUsedAt: 'DESC' },
    });
  }

  async terminateUserSessions(userId: string) {
    await this.sessionRepository.delete({ userId });
    await this.refreshTokenRepository.delete({ userId });
  }

  async getUserRoles(userId: string) {
    return this.dataSource.query(
      `SELECT r.id, r.name, r.description
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = $1`,
      [userId],
    );
  }
}