import { Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User, Session, RefreshToken } from './entities';
import { UsersService } from './users.service';

@Module({
  providers: [
    {
      provide: UsersService,
      useFactory: (dataSource: DataSource) => new UsersService(
        dataSource.getRepository(User),
        dataSource.getRepository(Session),
        dataSource.getRepository(RefreshToken),
        dataSource,
      ),
      inject: ['AUTH_DATA_SOURCE'],
    },
  ],
  exports: [UsersService],
})
export class UsersModule {}