import { BusinessException } from '../exceptions/business.exception';

export interface MemberIdentity {
  memberId?: number;
}

export function resolveMemberId(dto: { memberId?: number }, member?: MemberIdentity): number | undefined {
  if (member?.memberId != null) {
    if (dto.memberId != null && dto.memberId !== member.memberId) {
      throw new BusinessException('会员身份校验失败，请重新登录', 40101);
    }
    return member.memberId;
  }
  if (dto.memberId != null) {
    throw new BusinessException('请先登录会员', 40100);
  }
  return undefined;
}