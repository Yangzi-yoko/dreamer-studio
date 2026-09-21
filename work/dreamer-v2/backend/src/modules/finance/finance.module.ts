import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { SystemModule } from '../system/system.module';

@Module({
  imports: [TypeOrmModule.forFeature([]), SystemModule],
  controllers: [FinanceController],
  providers: [FinanceService],
})
export class FinanceModule {}
