import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SaveMemberTagDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  color?: string;
}
