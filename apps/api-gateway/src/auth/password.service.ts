import { Injectable, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { Session } from '../users/entities/session.entity';

@Injectable()
export class PasswordService {
  private readonly SALT_ROUNDS = 12;

  constructor(
    private dataSource: DataSource,
  ) {}

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.dataSource.getRepository(User).findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    user.passwordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);
    user.passwordChangedAt = new Date();
    await this.dataSource.getRepository(User).save(user);

    await this.dataSource.getRepository(Session).delete({ userId });

    return { message: 'Password changed successfully' };
  }

  async handleFailedLogin(
    user: User,
    onLoginAttempt: (email: string, ip?: string, success?: boolean, reason?: string) => Promise<void>,
    ipAddress?: string,
  ) {
    user.failedLoginAttempts += 1;

    if (user.failedLoginAttempts >= 5) {
      const lockDuration = Math.min(2 ** (user.failedLoginAttempts - 5) * 60 * 1000, 30 * 60 * 1000);
      user.lockedUntil = new Date(Date.now() + lockDuration);
    }

    await this.dataSource.getRepository(User).save(user);
    await onLoginAttempt(user.email, ipAddress, false, 'invalid_password');
  }

  async handleSuccessfulLogin(
    user: User,
    onLoginAttempt: (email: string, ip?: string, success?: boolean, reason?: string) => Promise<void>,
  ) {
    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    user.lastLoginAt = new Date();
    await this.dataSource.getRepository(User).save(user);
  }

  hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}