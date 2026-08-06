import { Body, Controller, Get, Param, ParseIntPipe, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../system/permissions.guard';
import { Permissions } from '../system/permissions.decorator';
import { TimeSlotService } from './time-slot.service';
import { SaveTimeSlotsDto } from './dto/save-time-slot.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('rental/studios/:studioId/time-slots')
export class TimeSlotController {
  constructor(private readonly timeSlotService: TimeSlotService) {}

  @Get()
  @Permissions('rental:studio:list')
  list(@Param('studioId', ParseIntPipe) studioId: number) {
    return this.timeSlotService.listByStudio(studioId);
  }

  @Put()
  @Permissions('rental:studio:update')
  save(@Param('studioId', ParseIntPipe) studioId: number, @Body() dto: SaveTimeSlotsDto) {
    return this.timeSlotService.saveMany(studioId, dto);
  }
}
