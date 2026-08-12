import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class SavePackageCardDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name!: string;

  @IsInt()
  @Min(1)
  totalMinutes!: number;

  @IsInt()
  priceYuan!: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
