import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/********************************************/
/*                  Enums                   */
/********************************************/

export enum EmailActionType {
    EMAILS_BLOCK_ALL_EMAILS = 'EMAILS_BLOCK_ALL_EMAILS',
    EMAILS_BLOCK_ORG_INVITES = 'EMAILS_BLOCK_ORG_INVITES',
    USERS_REGISTRATION_VERIFICATION = 'USERS_REGISTRATION_VERIFICATION',
    USERS_PASSWORD_RESET = 'USERS_PASSWORD_RESET'
}

/********************************************/
/*             Database entities            */
/********************************************/

export class EmailAction {
    @ApiProperty()
    @Expose()
    token_digest: string;

    @ApiProperty()
    @Expose()
    action_type: EmailActionType;

    @ApiProperty()
    @Expose()
    @Type(() => Date)
    ttl: Date;
}

export class BlockOrgInvitesAction {
    @ApiProperty()
    @Expose()
    token_digest: string;

    @ApiProperty()
    @Expose()
    action_type: EmailActionType;

    @ApiProperty()
    @Expose()
    user_email_digest: string;

    @ApiProperty()
    @Expose()
    user_email: string;

    @ApiProperty()
    @Expose()
    org_id: string;

    @ApiProperty()
    @Expose()
    @Type(() => Date)
    ttl: Date;
}

export class BlockAllEmailsAction {
    @ApiProperty()
    @Expose()
    token_digest: string;

    @ApiProperty()
    @Expose()
    action_type: EmailActionType;

    @ApiProperty()
    @Expose()
    user_email_digest: string;

    @ApiProperty()
    @Expose()
    user_email: string;

    @ApiProperty()
    @Expose()
    @Type(() => Date)
    ttl: Date;
}

export class BlockEmailsAction {
    @ApiProperty()
    @Expose()
    token_digest: string;

    @ApiProperty()
    @Expose()
    action_type: EmailActionType;

    @ApiProperty()
    @Expose()
    user_email_digest: string;

    @ApiProperty()
    @Expose()
    user_email: string;

    @ApiProperty()
    @Expose()
    @Type(() => Date)
    ttl: Date;
}

export class RegistrationVerificationAction {
    @ApiProperty()
    @Expose()
    token_digest: string;

    @ApiProperty()
    @Expose()
    action_type: EmailActionType;

    @ApiProperty()
    @Expose()
    user_id_digest: string;

    @ApiProperty()
    @Expose()
    user_id: string;

    @ApiProperty()
    @Expose()
    email: string;

    @ApiProperty()
    @Expose()
    @Type(() => Date)
    ttl: Date;
}

export class PasswordResetAction {
    @ApiProperty()
    @Expose()
    token_digest: string;

    @ApiProperty()
    @Expose()
    action_type: EmailActionType;

    @ApiProperty()
    @Expose()
    user_id_digest: string;

    @ApiProperty()
    @Expose()
    user_id: string;

    @ApiProperty()
    @Expose()
    @Type(() => Date)
    ttl: Date;
}

/********************************************/
/*             Create interfaces            */
/********************************************/

export interface EmailActionCreate {
    token_digest: string;
    action_type: EmailActionType;
    ttl: Date;
}

export interface BlockOrgInvitesCreate extends EmailActionCreate {
    user_email_digest: string;
    user_email: string;
    org_id: string;
}

export interface BlockAllEmailsCreate extends EmailActionCreate {
    user_email_digest: string;
    user_email: string;
}

export interface UserRegistrationVerfificationCreate extends EmailActionCreate {
    user_id_digest: string;
    user_id: string;
    email: string;
}

export interface PasswordResetCreate extends EmailActionCreate {
    token_digest: string;
    user_id_digest: string;
    user_id: string;
}
