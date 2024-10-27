import { Expose, Type } from 'class-transformer';
import { IsDefined, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OptionalTransform } from 'src/transformers/transformer';
import { TeamMember } from './TeamMember';
import { MemberRole } from './OrgMembership';

/********************************************/
/*             Database entities            */
/********************************************/

export class OrganizationMetaData {
    @ApiProperty()
    id: string;
    @ApiProperty()
    created_on: Date;
    @ApiProperty()
    vcs_integrations_added: boolean;
    @ApiProperty()
    integrations_added: boolean;
    @ApiProperty()
    projects_added: boolean;
    @ApiProperty()
    analyses_started: boolean;
}

export class OrganizationInfoForInvitee {
    @ApiProperty()
    id: string;
    @ApiProperty()
    name: string;
    @ApiProperty()
    description: string;
    @ApiProperty()
    color_scheme: string;
    @ApiProperty()
    created_on: Date;
    @ApiProperty()
    created_by?: TeamMember;
    @ApiProperty()
    invite_created_by?: TeamMember;
    @ApiProperty()
    invite_created_on: Date;
    @ApiProperty()
    role: MemberRole;
    @ApiProperty()
    number_of_members: number;
}

/********************************************/
/*             HTTP Post bodies             */
/********************************************/

export class OrganizationCreateBody {
    @ApiProperty()
    @IsNotEmpty()
    @Length(1, 50)
    name: string;

    @ApiProperty()
    @IsNotEmpty()
    @Length(1, 250)
    description: string;

    @ApiProperty()
    @IsDefined()
    color_scheme: string;
}

export class JoinOrgCreateBody {
    @ApiProperty()
    @IsNotEmpty()
    token: string;

    @ApiProperty()
    @IsNotEmpty()
    email_digest: string;
}

/********************************************/
/*             Create interfaces            */
/********************************************/

export interface OrganizationCreate {
    name: string;
    description: string;
    created_on: Date;
    created_by: string;
    personal: boolean;
    color_scheme: string;
}

/********************************************/
/*             Update interfaces            */
/********************************************/

export interface OrganizationUpdate extends OrganizationCreate {}
