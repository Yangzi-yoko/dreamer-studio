import { Body, Controller, Get, Headers, Post, UseGuards } from '@nestjs/common';
import { MemberAuthService } from './member-auth.service';
import { MemberAuthGuard } from './member-auth.guard';
import { CurrentMember, CurrentMemberPayload } from './current-member.decorator';

@Controller('member-auth')
export class MemberAuthController {
  constructor(private readonly authService: MemberAuthService) {}

  @Post('register')
  register(
    @Body() dto: { phone: string; nickname: string },
    @Headers('x-forwarded-for') forwarded: string,
    @Headers('x-device-fingerprint') fingerprint: string,
  ) {
    const ip = (forwarded || 'unknown').split(',')[0].trim();
    return this.authService.register(dto.phone, dto.nickname, ip, fingerprint || 'unknown');
  }

  @Post('login')
  login(@Body() dto: { phone: string }) {
    return this.authService.login(dto.phone);
  }

  @UseGuards(MemberAuthGuard)
  @Get('me')
  me(@CurrentMember() member: CurrentMemberPayload) {
    return member;
  }
}
