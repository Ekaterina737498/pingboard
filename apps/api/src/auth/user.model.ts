import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('User')
export class UserModel {
  @Field()
  id!: string;

  @Field()
  email!: string;

  @Field()
  role!: string;

  @Field()
  isBlocked!: boolean;

  @Field(() => Date, { nullable: true })
  emailVerifiedAt?: Date | null;

  @Field()
  createdAt!: Date;
}
