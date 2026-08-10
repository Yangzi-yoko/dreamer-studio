import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SavePointsProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name!: string;

  @IsOptional()
  @IsString()
  cover?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  point!: number;

  @IsInt()
  stock!: number;

  @IsOptional()
  @IsInt()
  limitPerUser?: number;

  @IsOptional()
  @IsIn(['enabled', 'disabled'])
  status?: string;

  @IsOptional()
  @IsInt()
  sort?: number;
}