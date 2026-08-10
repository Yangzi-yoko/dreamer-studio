import { IsInt } from 'class-validator';

export class RedeemPointsCouponDto {
  @IsInt()
  id!: number;
}