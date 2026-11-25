import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('Check')
export class CheckModel {
  @Field()
  id!: string;

  @Field()
  ok!: boolean;

  @Field(() => Int, { nullable: true })
  statusCode?: number | null;

  @Field(() => Int, { nullable: true })
  responseTimeMs?: number | null;

  @Field(() => String, { nullable: true })
  error?: string | null;

  @Field()
  checkedAt!: Date;
}
