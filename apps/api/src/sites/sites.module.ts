import { Module } from '@nestjs/common';
import { SitesResolver } from './sites.resolver';
import { SitesService } from './sites.service';
import { SiteFieldsResolver } from './site-fields.resolver';
import { AdminSitesResolver } from './admin-sites.resolver';

@Module({
  providers: [
    SitesService,
    SitesResolver,
    SiteFieldsResolver,
    AdminSitesResolver,
  ],
})
export class SitesModule {}
