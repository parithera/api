import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from 'src/types/auth/types';
import { EntityNotFound, UserDoesNotExist } from 'src/types/errors/types';
import { TypedPaginatedData } from 'src/types/paginated/types';
import { PaginationUserSuppliedConf } from 'src/types/paginated/types';
import { OrganizationsMemberService } from './organizationMember.service';
import { SortDirection } from 'src/types/sort/types';
import { TeamMember } from 'src/types/entities/frontend/TeamMember';
import { MemberRole } from 'src/types/entities/frontend/OrgMembership';
import { InviteCreateBody } from 'src/types/entities/frontend/OrgInvitation';
import { OrganizationCreateBody } from 'src/types/entities/frontend/Org';
import { OrganizationMemberships } from 'src/entity/codeclarity/OrganizationMemberships';
import { Organization } from 'src/entity/codeclarity/Organization';
import { User } from 'src/entity/codeclarity/User';
import { Email, EmailType } from 'src/entity/codeclarity/Email';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invitation } from 'src/entity/codeclarity/Invitation';
import { genRandomString } from 'src/utils/crypto';
import { hash } from 'src/utils/crypto';
import { EmailService } from '../email/email.service';

@Injectable()
export class OrganizationsService {
    constructor(
        private readonly emailService: EmailService,
        private readonly organizationMemberService: OrganizationsMemberService,
        @InjectRepository(OrganizationMemberships, 'codeclarity')
        private membershipRepository: Repository<OrganizationMemberships>,
        @InjectRepository(Organization, 'codeclarity')
        private organizationRepository: Repository<Organization>,
        @InjectRepository(User, 'codeclarity')
        private userRepository: Repository<User>,
        @InjectRepository(Invitation, 'codeclarity')
        private invitationRepository: Repository<Invitation>,
        @InjectRepository(Email, 'codeclarity')
        private emailRepository: Repository<Email>
    ) {}

    /**
     * Creates an organization
     * @throws {InternalError}
     *
     * @param organizationData The organization data
     * @param user The authenticated user
     * @returns the id of the created organization
     */
    async create(
        organizationData: OrganizationCreateBody,
        user: AuthenticatedUser
    ): Promise<string> {
        const creator = await this.userRepository.findOne({
            where: {
                id: user.userId
            }
        });
        if (!creator) {
            throw new EntityNotFound();
        }

        let organization = new Organization();
        organization.name = organizationData.name;
        organization.description = organizationData.description;
        organization.color_scheme = organizationData.color_scheme;
        organization.personal = false;
        organization.created_on = new Date();
        organization.created_by = creator;

        organization = await this.organizationRepository.save(organization);

        let membership = new OrganizationMemberships();
        membership.role = MemberRole.OWNER;
        membership.joined_on = new Date();
        membership.user = creator;
        membership.organization = organization;
        membership = await this.membershipRepository.save(membership);

        return organization.id;
    }

    /**
     * Get an organization
     * @throws {NotAuthorized} If the user does not have access to the org
     * @throws {EntityNotFound} If the org cannot be found
     *
     * @param orgId The id of the organization
     * @param user The authenticated user
     * @returns the organization information
     */
    async get(orgId: string, user: AuthenticatedUser): Promise<Object> {
        await this.organizationMemberService.hasRequiredRole(orgId, user.userId, MemberRole.USER);
        const membership = await this.membershipRepository.findOne({
            where: {
                organization: {
                    id: orgId
                },
                user: {
                    id: user.userId
                }
            },
            relations: {
                organization: true,
                user: false
            }
        });

        const number_of_members = await this.membershipRepository.count({
            where: {
                organization: {
                    id: orgId
                }
            }
        });

        if (!membership) {
            throw new EntityNotFound();
        }

        const organizationInfo: Object = {
            ...membership.organization,
            role: membership.role,
            joined_on: membership.joined_on,
            number_of_members: number_of_members
        };
        return organizationInfo;
    }

    /**
     * Get org metadata
     * @throws {NotAuthorized} If the user does not have access to the org
     * @throws {EntityNotFound} If the org cannot be found
     *
     * @param orgId The id of the organization
     * @param user The authenticated user
     * @returns the organization metadata information
     */
    async getOrgMetaData(orgId: string, user: AuthenticatedUser): Promise<Organization> {
        await this.organizationMemberService.hasRequiredRole(orgId, user.userId, MemberRole.USER);

        const organization = await this.organizationRepository.findOne({
            where: {
                id: orgId
            },
            relations: {
                projects: {
                    analyses: true
                },
                integrations: true
            }
        });

        if (!organization) {
            throw new EntityNotFound();
        }

        return organization;
    }

    /**
     * Get orgs where user is part of
     * @param paginationUserSuppliedConf Paginiation configuration
     * @param user The authenticatéd user
     * @param searchKey A search key to filter the records by
     * @param sortBy A sort field to sort the records by
     * @param sortDirection A sort direction
     * @returns the orgs
     */
    async getMany(
        paginationUserSuppliedConf: PaginationUserSuppliedConf,
        user: AuthenticatedUser,
        searchKey?: string,
        sortBy?: string,
        sortDirection?: SortDirection
    ): Promise<TypedPaginatedData<Object>> {
        const memberships = await this.membershipRepository.find({
            where: {
                user: {
                    id: user.userId
                }
            },
            relations: {
                organization: {
                    owners: true
                },
                user: true
            }
        });

        const res = await this.membershipRepository
            .createQueryBuilder('membership')
            .leftJoinAndSelect(
                Organization,
                'organization',
                'organization.id = membership.organization.id'
            )
            .leftJoinAndSelect(User, 'user', 'user.id = membership.user')
            // .select('SUM(membership.user)', 'sum')
            .where('user.id = :userId', { userId: user.userId })
            .getMany();

        return {
            data: memberships,
            page: 1,
            entry_count: 1,
            entries_per_page: 1,
            total_entries: 1,
            total_pages: 1,
            matching_count: 1,
            filter_count: {}
        };
    }

    /**
     * Get members of an org
     * @throws {NotAuthorized}
     *
     * @param orgId The id of the organization
     * @param paginationUserSuppliedConf The pagination config
     * @param user The authenticated user
     * @param searchKey A search key to filter the records by
     * @param sortBy A sort field to sort the records by
     * @param sortDirection A sort direction
     * @returns the organzation members
     */
    async getOrgMembers(
        orgId: string,
        paginationUserSuppliedConf: PaginationUserSuppliedConf,
        user: AuthenticatedUser,
        searchKey?: string,
        sortBy?: string,
        sortDirection?: SortDirection
    ): Promise<TypedPaginatedData<TeamMember>> {
        throw new Error('Method not implemented.');
    }

    /**
     * Invite a user to an organization
     * @throws {NotAuthorized}
     * @throws {EntityNotFound}
     * @throws {PersonalOrgCannotBeModified}
     * @throws {InvitationOrgAlreadyExists}
     * @throws {AlreadyExists}
     * @throws {UserDoesNotExist}
     * @throws {InternalError}
     *
     * @param orgId The organization id
     * @param inviteBody The invitation
     * @param user The authenticated user
     */
    async inviteMember(
        orgId: string,
        inviteBody: InviteCreateBody,
        user: AuthenticatedUser
    ): Promise<void> {
        await this.organizationMemberService.hasRequiredRole(orgId, user.userId, MemberRole.OWNER);

        const invitedUser = await this.userRepository.findOneBy({
            email: inviteBody.user_email
        });

        if (!invitedUser) {
            throw new UserDoesNotExist();
        }

        const inviter = await this.userRepository.findOneByOrFail({
            id: user.userId
        });

        const org = await this.organizationRepository.findOneByOrFail({
            id: orgId
        });

        const invitation: Invitation = new Invitation();
        invitation.created_on = new Date();
        invitation.role = inviteBody.role;
        invitation.user = invitedUser;
        invitation.organization = org;
        invitation.ttl = new Date(new Date().getTime() + 30 * 60000);
        await this.invitationRepository.save(invitation);

        const activationToken = await genRandomString(64);
        const activationTokenhash = await hash(activationToken, {});
        const userIdHash = await hash(invitedUser.id, {});

        const mail = new Email();
        mail.email_type = EmailType.ORGANIZATION_INVITE;
        mail.token_digest = activationTokenhash;
        mail.user_id_digest = userIdHash;
        mail.ttl = new Date(new Date().getTime() + 30 * 60000); // Expires after 30 mins
        mail.user = invitedUser;

        await this.emailRepository.save(mail);

        await this.emailService.sendOrganizationInvite({
            email: invitedUser.email,
            inviteToken: activationTokenhash,
            blockOrgInvitesToken: '',
            blockAllOrgInvitesToken: '',
            userEmailDigest: userIdHash,
            organizationName: org.name,
            inviter: inviter,
            orgId: org.id
        });
    }

    /**
     * Resend an organization invite email
     * @throws {NotAuthorized}
     * @throws {EntityNotFound}
     * @throws {PersonalOrgCannotBeModified}
     * @throws {AlreadyExists}
     * @throws {FailedToSendOrganizationInviteEmail}
     *
     * @param orgId The id of the organizaiton
     * @param inviteId The id of the invitee
     * @param user The authenticated user
     */
    async reSendOrganizationInviteEmail(
        orgId: string,
        inviteId: string,
        user: AuthenticatedUser
    ): Promise<void> {
        throw new Error('Method not implemented.');
    }

    /**
     * Revoke an open org-join invitation
     * @throws {NotAuthorized}
     * @throws {PersonalOrgCannotBeModified}
     *
     * @param orgId The id of the organization
     * @param invitationId The id of the invitation
     * @param user The authenticated user
     */
    async revokeInvitation(
        orgId: string,
        invitationId: string,
        user: AuthenticatedUser
    ): Promise<void> {
        throw new Error('Method not implemented.');
    }

    /**
     * Get the org's join-org invitations
     * @throws {NotAuthorized}
     * @throws {EntityNotFound}
     *
     * @param orgId The id of the organization
     * @param paginationUserSuppliedConf The pagination config
     * @param user The authenticated user
     * @returns the org's join-org invitations
     */
    async getInvitations(
        orgId: string,
        paginationUserSuppliedConf: PaginationUserSuppliedConf,
        user: AuthenticatedUser,
        searchKey?: string,
        sortBy?: string,
        sortDirection?: SortDirection
    ): Promise<TypedPaginatedData<Invitation>> {
        // const organizations = await CodeclarityDB.getRepository(Organization).find({
        //     where: {
        //         invited: {
        //             id: user.userId
        //         }
        //     }
        // });

        const invitations = await this.invitationRepository.find({
            where: {
                organization: { id: orgId },
                user: { id: user.userId }
            }
        });

        // for (const org of organizations) {
        //     const invitation = new Invitation();
        //     invitation.

        // }

        return {
            data: invitations,
            page: 0,
            entry_count: 0,
            entries_per_page: 0,
            total_entries: 0,
            total_pages: 0,
            matching_count: 0,
            filter_count: {}
        };
    }

    /**
     * Join an organization via an invitation
     * @throws {InvitationInvalidOrExpired}
     * @throws {InternalError}
     *
     * @param inviteToken The invitation token
     * @param emailDigest The user's email digest
     * @param user The authenticated user
     */
    async joinOrg(
        inviteToken: string,
        emailDigest: string,
        user: AuthenticatedUser
    ): Promise<void> {
        throw new Error('Method not implemented.');
    }

    /**
     * Revoke an organization membership
     * @throws {NotAuthorized}
     * @throws {EntityNotFound}
     * @throws {PersonalOrgCannotBeModified}
     * @throws {CannotRevokeOwnMembership}
     * @throws {NotAMember}
     *
     * @param orgId The id of the organization
     * @param user_id_to_remove The id of the user to remove
     * @param user The authenticated user
     */
    async revokeOrgMemberShip(
        orgId: string,
        user_id_to_remove: string,
        user: AuthenticatedUser
    ): Promise<void> {
        throw new Error('Method not implemented.');
    }

    /**
     * Leave an organization
     * @throws {NotAuthorized}
     * @throws {PersonalOrgCannotBeModified} A user cannot leave a personal organization
     * @throws {CannotLeaveAsLastOwner} A user cannot leave as the owner of an org. Instead they must delete the org instead.
     * @throws {EntityNotFound} In case the organization no longer exists
     *
     * @param orgId The id of the organization
     * @param user The authenticated user
     */
    async leaveOrg(orgId: string, user: AuthenticatedUser): Promise<void> {
        throw new Error('Method not implemented.');
    }

    /**
     * Delete an organization
     * @throws {NotAuthorized}
     * @throws {PersonalOrgCannotBeModified} A user cannot delete a personal organization
     * @throws {EntityNotFound} In case the organization no longer exists
     *
     * @param orgId The id of the organization
     * @param user The authenticated user
     */
    async deleteOrg(orgId: string, user: AuthenticatedUser): Promise<void> {
        throw new Error('Method not implemented.');
    }

    /**
     * Get a member of an org
     * @throws {NotAuthorized}
     * @throws {EntityNotFound}
     *
     * @param orgId The id of the organization
     * @param userId The id of the user
     * @param user The authenticated user
     * @returns the team member
     */
    public async getOrgMember(
        orgId: string,
        userId: string,
        user: AuthenticatedUser
    ): Promise<TeamMember> {
        throw new Error('Method not implemented.');
    }
}
