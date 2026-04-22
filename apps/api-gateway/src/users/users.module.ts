import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, Session, RefreshToken } from './entities';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Session, RefreshToken])],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}