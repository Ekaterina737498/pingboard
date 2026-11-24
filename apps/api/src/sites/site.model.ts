import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Site')
export class SiteModel {
  @Field()
  id!: string;

  @Field()
  name!: string;

  @Field()
  url!: string;

  @Field()
  isActive!: boolean;

  @Field()
  createdAt!: Date;
}