import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../system/permissions.guard';
import { Permissions } from '../system/permissions.decorator';
import { FinanceService } from './finance.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('overview')
  @Permissions('dashboard')
  overview(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.financeService.overview(startDate, endDate);
  }

  @Get('revenue-trend')
  @Permissions('dashboard')
  revenueTrend(@Query('days') days = 30) {
    return this.financeService.revenueTrend(Number(days));
  }

  @Get('revenue-by-source')
  @Permissions('dashboard')
  revenueBySource(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.financeService.revenueBySource(startDate, endDate);
  }

  @Get('transactions')
  @Permissions('dashboard')
  transactions(@Query('page') page = 1, @Query('pageSize') pageSize = 20, @Query('type') type?: string) {
    return this.financeService.transactions(Number(page), Number(pageSize), type);
  }
}
