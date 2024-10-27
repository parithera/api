import { Module } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsMemberService } from './organizationMember.service';
import { OrganizationLoggerService } from './organizationLogger.service';
import { OrganizationMemberships } from 'src/entity/codeclarity/OrganizationMemberships';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from 'src/entity/codeclarity/Organization';
import { User } from 'src/entity/codeclarity/User';
import { Log } from 'src/entity/codeclarity/Log';

@Module({
    imports: [
        TypeOrmModule.forFeature([OrganizationMemberships, Organization, User, Log], 'codeclarity')
    ],
    providers: [OrganizationsService, OrganizationsMemberService, OrganizationLoggerService],
    controllers: [OrganizationsController]
})
export class OrganizationsModule {}
