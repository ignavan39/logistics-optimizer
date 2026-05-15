import { Module } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RbacGuard } from './rbac.guard';

@Module({
  providers: [JwtAuthGuard, RbacGuard],
  exports: [JwtAuthGuard, RbacGuard],
})
export class GuardsModule {}
