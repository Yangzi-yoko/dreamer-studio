import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SavePackageCardDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name!: string;

  @IsInt()
  totalTimes!: number;

  @IsInt()
  priceYuan!: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
