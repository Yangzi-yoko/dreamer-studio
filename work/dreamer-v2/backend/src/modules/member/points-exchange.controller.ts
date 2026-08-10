import { Body, Controller, Get, Param, ParseIntPipe, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../system/permissions.guard';
import { Permissions } from '../system/permissions.decorator';
import { PointsExchangeService } from './points-exchange.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('member/point-exchanges')
export class PointsExchangeController {
  constructor(private readonly exchangeService: PointsExchangeService) {}

  @Permissions('member:point-order:list')
  @Get('admin')
  pageAdmin(@Query('status') status?: string, @Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    return this.exchangeService.pageAdmin(status, Number(page), Number(pageSize));
  }

  @Permissions('member:point-order:ship')
  @Put(':id/ship')
  ship(@Param('id', ParseIntPipe) id: number, @Body() dto: { adminNote?: string }) {
    return this.exchangeService.ship(id, dto.adminNote);
  }

  @Permissions('member:point-order:complete')
  @Put(':id/complete')
  complete(@Param('id', ParseIntPipe) id: number) {
    return this.exchangeService.complete(id);
  }

  @Permissions('member:point-order:cancel')
  @Put(':id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number, @Body() dto: { reason?: string }) {
    return this.exchangeService.cancel(id, dto.reason);
  }
}