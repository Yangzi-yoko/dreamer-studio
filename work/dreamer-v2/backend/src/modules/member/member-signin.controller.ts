import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { MemberAuthGuard } from '../member-auth/member-auth.guard';
import { MemberSigninService } from './member-signin.service';

@Controller('member/signin')
export class MemberSigninController {
  constructor(private readonly signinService: MemberSigninService) {}

  @Post('checkin')
  checkin(@Body() dto: { memberId: number }) {
    return this.signinService.checkin(dto.memberId);
  }

  @UseGuards(MemberAuthGuard)
  @Get(':memberId')
  page(@Param('memberId', ParseIntPipe) memberId: number, @Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    return this.signinService.page(memberId, Number(page), Number(pageSize));
  }
}
