import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SaveCouponDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name!: string;

  @IsIn(['amount', 'discount'])
  type!: 'amount' | 'discount';

  @IsInt()
  value!: number;

  @IsInt()
  minSpendYuan!: number;

  @IsInt()
  totalCount!: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
