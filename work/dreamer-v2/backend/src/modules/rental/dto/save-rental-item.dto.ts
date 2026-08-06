import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SaveRentalItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  name!: string;

  @IsOptional()
  @IsString()
  images?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(['day', 'slot'])
  billingType!: 'day' | 'slot';

  @IsInt()
  unitPriceYuan!: number;

  @IsInt()
  depositYuan!: number;

  @IsInt()
  stock!: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  sort?: number;
}
