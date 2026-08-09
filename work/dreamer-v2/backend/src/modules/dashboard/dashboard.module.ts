import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemModule } from '../system/system.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([]), SystemModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}