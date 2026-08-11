import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../system/permissions.guard';
import { Permissions } from '../system/permissions.decorator';
import { MemberAuthGuard } from '../member-auth/member-auth.guard';
import { CurrentMember, CurrentMemberPayload } from '../member-auth/current-member.decorator';
import { MemberActivityService } from './member-activity.service';
import { SaveActivityDto } from './dto/save-activity.dto';

@Controller('member/activities')
export class MemberActivityController {
  constructor(private readonly activityService: MemberActivityService) {}

  @Get()
  pagePublished(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10,
    @Query('memberId') memberId?: number,
  ) {
    return this.activityService.pagePublished(Number(page), Number(pageSize), memberId ? Number(memberId) : undefined);
  }

  @UseGuards(MemberAuthGuard)
  @Post(':id/register')
  register(@Param('id', ParseIntPipe) id: number, @CurrentMember() member: CurrentMemberPayload) {
    return this.activityService.register(member.memberId, id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('admin')
  @Permissions('member:activity:list')
  pageAdmin(@Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    return this.activityService.pageAdmin(Number(page), Number(pageSize));
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post()
  @Permissions('member:activity:create')
  create(@Body() dto: SaveActivityDto) {
    return this.activityService.create(dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Put(':id')
  @Permissions('member:activity:update')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: SaveActivityDto) {
    return this.activityService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get(':id/registrations')
  @Permissions('member:activity:list')
  registrations(@Param('id', ParseIntPipe) id: number, @Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    return this.activityService.pageRegistrations(id, Number(page), Number(pageSize));
  }
}