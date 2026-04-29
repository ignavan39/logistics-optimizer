import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersService } from './users.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [ConfigModule, DatabaseModule.forRoot()],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}