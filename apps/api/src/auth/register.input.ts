import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsEmail, Matches, MaxLength, MinLength } from 'class-validator';

@InputType()
export class RegisterInput {
  @Field()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;

  @Field()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/[A-Za-zА-Яа-я]/, { message: 'Password must contain a letter' })
  @Matches(/[0-9]/, { message: 'Password must contain a digit' })
  password!: string;
}