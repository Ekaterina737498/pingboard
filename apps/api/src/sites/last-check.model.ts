import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('LastCheck')
export class LastCheckModel {
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
