import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

export class CreateItemRentalDto {
  @IsInt()
  itemId!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  customerName!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^1\d{10}$/)
  customerPhone!: string;

  @IsIn(['day', 'slot'])
  billingType!: 'day' | 'slot';

  @IsInt()
  @Min(1)
  quantity!: number;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate!: string;

  @IsInt()
  @Min(0)
  slotCount!: number;

  @IsOptional()
  @IsString()
  remark?: string;
}
