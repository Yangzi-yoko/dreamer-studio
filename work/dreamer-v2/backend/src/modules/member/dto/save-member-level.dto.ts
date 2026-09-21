import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SaveMemberLevelDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  name!: string;

  @IsInt()
  minSpendYuan!: number;

  @IsOptional()
  @IsInt()
  minOrders?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  sort?: number;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  icon?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  color?: string;

  @IsOptional()
  discount?: number;
}