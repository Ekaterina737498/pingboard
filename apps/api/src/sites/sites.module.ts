import { Module } from '@nestjs/common';
import { SitesResolver } from './sites.resolver';
import { SitesService } from './sites.service';
import { SiteFieldsResolver } from './site-fields.resolver';

@Module({
  providers: [SitesService, SitesResolver, SiteFieldsResolver],
})
export class SitesModule {}
