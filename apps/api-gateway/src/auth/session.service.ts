import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Session } from '../users/entities/session.entity';

@Injectable()
export class SessionService {
  constructor(
    private dataSource: DataSource,
  ) {}

  async createSession(params: {
    userId: string;
    deviceId?: string;
    deviceName?: string;
    ipAddress?: string;
    userAgent?: string;
    refreshTokenHash: string;
    expiresAt: Date;
  }): Promise<Session> {
    return this.dataSource.getRepository(Session).save({
      userId: params.userId,
      deviceId: params.deviceId,
      deviceName: params.deviceName,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      refreshTokenHash: params.refreshTokenHash,
      expiresAt: params.expiresAt,
    });
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.dataSource.getRepository(Session).delete({ id: sessionId });
  }

  async deleteUserSessions(userId: string): Promise<void> {
    await this.dataSource.getRepository(Session).delete({ userId });
  }

  async recordLoginAttempt(
    email: string,
    ipAddress?: string,
    success?: boolean,
    reason?: string,
  ): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO login_attempts (email, ip_address, success, reason)
       VALUES ($1, $2, $3, $4)`,
      [email, ipAddress, success || false, reason],
    );
  }
}