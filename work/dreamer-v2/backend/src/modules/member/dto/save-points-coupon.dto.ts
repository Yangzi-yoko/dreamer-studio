import { IsBoolean, IsInt, IsOptional } from 'class-validator';

export class SavePointsCouponDto {
  @IsInt()
  couponId!: number;

  @IsInt()
  point!: number;

  @IsInt()
  stock!: number;

  @IsOptional()
  @IsInt()
  limitPerUser?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  sort?: number;
}