import { Field, ObjectType } from '@nestjs/graphql';
import { UserModel } from '../auth/user.model';
import { SiteModel } from './site.model';

@ObjectType('AdminSite')
export class AdminSiteModel extends SiteModel {
  @Field(() => UserModel)
  owner!: UserModel;
}
