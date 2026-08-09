import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../system/permissions.guard';
import { Permissions } from '../system/permissions.decorator';
import { DashboardService } from './dashboard.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('panel-data')
  @Permissions('dashboard')
  panelData() {
    return this.dashboardService.panel().then((panel) => ({ panel }));
  }

  @Get('line-data/:type')
  @Permissions('dashboard')
  lineData(@Param('type') type: any) {
    return this.dashboardService.line(type).then((line) => ({ dates: line.dates, ...line.series[type as 'newVisits'] }));
  }

  @Get('radar-data')
  @Permissions('dashboard')
  radarData() {
    return this.dashboardService.radar();
  }

  @Get('pie-data')
  @Permissions('dashboard')
  pieData() {
    return this.dashboardService.pie();
  }

  @Get('bar-data')
  @Permissions('dashboard')
  barData() {
    return this.dashboardService.bar();
  }

  @Get('transactions')
  @Permissions('dashboard')
  transactions() {
    return this.dashboardService.transactions();
  }
}