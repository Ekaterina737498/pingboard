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

  @Field()
  createdAt!: Date;
}