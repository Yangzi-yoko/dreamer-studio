import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../system/permissions.guard';
import { Permissions } from '../system/permissions.decorator';
import { MemberService } from './member.service';
import { SaveMemberDto } from './dto/save-member.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('member/members')
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @Get()
  @Permissions('member:list')
  page(@Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    return this.memberService.page(Number(page), Number(pageSize));
  }

  @Get(':id')
  @Permissions('member:list')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.memberService.findOne(id);
  }

  @Post()
  @Permissions('member:create')
  create(@Body() dto: SaveMemberDto) {
    return this.memberService.create(dto);
  }

  @Put(':id')
  @Permissions('member:update')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: SaveMemberDto) {
    return this.memberService.update(id, dto);
  }
}
