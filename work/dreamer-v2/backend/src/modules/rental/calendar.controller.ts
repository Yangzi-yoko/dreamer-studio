import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../system/permissions.guard';
import { Permissions } from '../system/permissions.decorator';
import { BookingService } from './booking.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('rental/studios/:studioId/calendar')
export class CalendarController {
  constructor(private readonly bookingService: BookingService) {}

  @Get()
  @Permissions('rental:booking:list')
  calendar(@Param('studioId', ParseIntPipe) studioId: number, @Query('month') month: string) {
    return this.bookingService.calendar(studioId, month);
  }
}
