import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentMemberPayload {
  memberId: number;
}

export const CurrentMember = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentMemberPayload => ctx.switchToHttp().getRequest().user,
);
