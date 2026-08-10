import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ExchangePointsDto {
  @IsInt()
  productId!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  receiverName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  receiverPhone!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  receiverAddress!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string;
}