import { Injectable } from '@nestjs/common';
import { TypedPaginatedData } from 'src/types/pagination.types';
import { PaginationConfig, PaginationUserSuppliedConf } from 'src/types/pagination.types';
import { EntityNotFound, IntegrationNotSupported, NotAuthorized } from 'src/types/error.types';
import { AuthenticatedUser } from 'src/base_modules/auth/auth.types';
import { OrganizationLoggerService } from 'src/base_modules/organizations/log/organizationLogger.service';
import { ProjectMemberService } from './projectMember.service';
import { SortDirection } from 'src/types/sort.types';
import { GithubRepositoriesService } from '../integrations/github/githubRepos.service';
import { GitlabRepositoriesService } from '../integrations/gitlab/gitlabRepos.service';
import { ProjectImportBody } from 'src/base_modules/projects/project.types';
import { IntegrationProvider } from 'src/base_modules/integrations/integration.types';
import { MemberRole } from 'src/base_modules/organizations/memberships/orgMembership.types';
import { ActionType } from 'src/base_modules/organizations/log/orgAuditLog.types';
import { RepositoryCache } from 'src/base_modules/projects/repositoryCache.entity';
import { IntegrationType, Project } from 'src/base_modules/projects/project.entity';
import { join } from 'path';
import { existsSync } from 'fs';
import { mkdir, rm } from 'fs/promises';
import { UsersRepository } from '../users/users.repository';
import { OrganizationsRepository } from '../organizations/organizations.repository';
import { FileRepository } from '../file/file.repository';
import { IntegrationsRepository } from '../integrations/integrations.repository';
import { AnalysisResultsRepository } from 'src/codeclarity_modules/results/results.repository';
import { AnalysesRepository } from '../analyses/analyses.repository';
import { ProjectsRepository } from './projects.repository';

export enum AllowedOrderByGetProjects {
    IMPORTED_ON = 'imported_on',
    NAME = 'url'
}

@Injectable()
export class ProjectService {
    constructor(
        private readonly organizationLoggerService: OrganizationLoggerService,
        private readonly projectMemberService: ProjectMemberService,
        private readonly githubRepositoriesService: GithubRepositoriesService,
        private readonly gitlabRepositoriesService: GitlabRepositoriesService,
        private readonly usersRepository: UsersRepository,
        private readonly organizationsRepository: OrganizationsRepository,
        private readonly fileRepository: FileRepository,
        private readonly integrationsRepository: IntegrationsRepository,
        private readonly resultsRepository: AnalysisResultsRepository,
        private readonly analysesRepository: AnalysesRepository,
        private readonly projectsRepository: ProjectsRepository
    ) {}

    /**
     * Import a source code project
     * @throws {IntegrationNotSupported}
     * @throws {AlreadyExists}
     * @throws {EntityNotFound}
     * @throws {NotAuthorized}
     *
     * @param orgId The id of the organization
     * @param projectData The project data
     * @param user The authenticated user
     * @returns the id of the created project
     */
    async import(
        orgId: string,
        projectData: ProjectImportBody,
        user: AuthenticatedUser
    ): Promise<string> {
        // (1) Check that the user is a member of the org
        await this.organizationsRepository.hasRequiredRole(orgId, user.userId, MemberRole.USER);

        const project = new Project();

        if (projectData.integration_id) {
            const integration =
                await this.integrationsRepository.getIntegrationByIdAndOrganizationAndUser(
                    projectData.integration_id,
                    orgId,
                    user.userId
                );

            let repo: RepositoryCache;

            if (integration.integration_provider == IntegrationProvider.GITHUB) {
                await this.githubRepositoriesService.syncGithubRepos(projectData.integration_id);
                try {
                    repo = await this.githubRepositoriesService.getGithubRepository(
                        orgId,
                        projectData.integration_id,
                        projectData.url,
                        user
                    );
                } catch (err) {
                    if (err instanceof EntityNotFound) {
                        // Our cache might be out of sync
                        // So refresh cache and try again
                        repo = await this.githubRepositoriesService.getGithubRepository(
                            orgId,
                            projectData.integration_id,
                            projectData.url,
                            user,
                            true
                        );
                    }
                    throw err;
                }
            } else if (integration.integration_provider == IntegrationProvider.GITLAB) {
                await this.gitlabRepositoriesService.syncGitlabRepos(projectData.integration_id);
                try {
                    repo = await this.gitlabRepositoriesService.getGitlabRepository(
                        orgId,
                        projectData.integration_id,
                        projectData.url,
                        user
                    );
                } catch (err) {
                    if (err instanceof EntityNotFound) {
                        // Our cache might be out of sync
                        // So refresh cache and try again
                        repo = await this.gitlabRepositoriesService.getGitlabRepository(
                            orgId,
                            projectData.integration_id,
                            projectData.url,
                            user,
                            true
                        );
                    }
                    throw err;
                }
            } else {
                throw new IntegrationNotSupported();
            }

            project.name = repo.fully_qualified_name;
            project.description = repo.description;
            project.type = integration.integration_provider;
            project.integration = integration;
            project.default_branch = repo.default_branch;
            project.service_domain = repo.service_domain;
            project.integration_provider = integration.integration_provider;
            project.url = projectData.url;
        } else {
            project.name = projectData.name;
            project.description = projectData.description;
            project.type = IntegrationProvider.FILE;
            project.url = '';
            // project.integration = integration;
            project.default_branch = '';
            project.service_domain = '';
            project.integration_provider = IntegrationProvider.FILE;
        }

        const user_adding = await this.usersRepository.getUserById(user.userId);

        const organization = await this.organizationsRepository.getOrganizationById(orgId);

        project.downloaded = false;
        project.added_on = new Date();
        project.added_by = user_adding;
        project.organizations = [organization];
        project.integration_type = IntegrationType.VCS;
        project.invalid = false;

        const added_project = await this.projectsRepository.saveProject(project);

        const folderPath = join('/private', organization.id, 'projects', added_project.id);
        await mkdir(folderPath, { recursive: true });

        await this.organizationLoggerService.addAuditLog(
            ActionType.ProjectCreate,
            `The User imported repository ${projectData.url} to the organization.`,
            orgId,
            user.userId
        );

        return added_project.id;
    }

    /**
     * Get a project
     * @throws {NotAuthorized}
     * @throws {EntityNotFound}
     *
     * @param organizationId The id of the organizaiton
     * @param id The id of the project
     * @param user The authenticated user
     * @returns the project
     */
    async get(organizationId: string, id: string, user: AuthenticatedUser): Promise<Project> {
        // (1) Every member of an org can retrieve a project
        await this.organizationsRepository.hasRequiredRole(
            organizationId,
            user.userId,
            MemberRole.USER
        );

        // (2) Check if project belongs to org
        await this.projectMemberService.doesProjectBelongToOrg(id, organizationId);

        return this.projectsRepository.getProjectById(id, {
            files: true,
            added_by: true
        });
    }

    /**
     * Get many projects of the org
     * @throws {NotAuthorized}
     *
     * @param orgId The id of the org
     * @param paginationUserSuppliedConf Paginiation configuration
     * @param user The authenticatéd user
     * @param searchKey A search key to filter the records by
     * @param sortBy A sort field to sort the records by
     * @param sortDirection A sort direction
     * @returns
     */
    async getMany(
        orgId: string,
        paginationUserSuppliedConf: PaginationUserSuppliedConf,
        user: AuthenticatedUser,
        searchKey?: string,
        sortBy?: AllowedOrderByGetProjects,
        sortDirection?: SortDirection
    ): Promise<TypedPaginatedData<Project>> {
        // Every member of an org can retrieve all project
        await this.organizationsRepository.hasRequiredRole(orgId, user.userId, MemberRole.USER);

        const paginationConfig: PaginationConfig = {
            maxEntriesPerPage: 100,
            defaultEntriesPerPage: 10
        };

        let entriesPerPage = paginationConfig.defaultEntriesPerPage;
        let currentPage = 0;

        if (paginationUserSuppliedConf.entriesPerPage)
            entriesPerPage = Math.min(
                paginationConfig.maxEntriesPerPage,
                paginationUserSuppliedConf.entriesPerPage
            );

        if (paginationUserSuppliedConf.currentPage)
            currentPage = Math.max(0, paginationUserSuppliedConf.currentPage);

        return this.projectsRepository.getManyProjects(
            orgId,
            currentPage,
            entriesPerPage,
            searchKey
        );
    }

    /**
     * Delete a project of an org
     * @throws {NotAuthorized}
     * @throws {EntityNotFound}
     *
     * @param orgId The id of the org
     * @param id The id of the project
     * @param user The authenticated user
     */
    async delete(orgId: string, id: string, user: AuthenticatedUser): Promise<void> {
        // (1) Check that member is at least a user
        await this.organizationsRepository.hasRequiredRole(orgId, user.userId, MemberRole.USER);

        // (2) Check if project belongs to org
        await this.projectsRepository.doesProjectBelongToOrg(id, orgId);

        const membership = await this.organizationsRepository.getMembershipRole(orgId, user.userId);

        if (!membership) {
            throw new EntityNotFound();
        }

        const memberRole = membership.role;

        const project = await this.projectsRepository.getProjectById(id, {
            files: true,
            added_by: true
        });

        // Every moderator, admin or owner can remove a project.
        // a normal user can also delete it, iff he is the one that added the project
        if (memberRole == MemberRole.USER) {
            // Get edge and check if added_by == user.userId
            if (!project.added_by || project.added_by.id != user.userId) {
                throw new NotAuthorized();
            }
        }

        const organization = await this.organizationsRepository.getOrganizationById(orgId, {
            projects: true
        });
        organization.projects = organization.projects.filter((p) => p.id != id);
        await this.organizationsRepository.saveOrganization(organization);

        const analyses = await this.analysesRepository.getAnalysesByProjectId(project.id, {
            results: true
        });
        for (const analysis of analyses) {
            for (const result of analysis.results) {
                await this.resultsRepository.remove(result);
            }

            await this.analysesRepository.deleteAnalysis(analysis.id);
        }

        // Remove project folder
        const filePath = join('/private', organization.id, 'projects', project.id);
        if (existsSync(filePath)) {
            await rm(filePath, { recursive: true, force: true });
        }

        for (const file of project.files) {
            await this.fileRepository.remove(file);
        }

        await this.projectsRepository.deleteProject(id);

        await this.organizationLoggerService.addAuditLog(
            ActionType.ProjectDelete,
            `The User removed project ${project.url} from the organization.`,
            orgId,
            user.userId
        );
    }

    /**
     * Import a source code project
     * @throws {IntegrationNotSupported}
     * @throws {AlreadyExists}
     * @throws {EntityNotFound}
     * @throws {NotAuthorized}
     *
     * @param orgId The id of the organization
     * @param projectData The project data
     * @param user The authenticated user
     * @returns the id of the created project
     */
    async update(
        orgId: string,
        projectId: string,
        projectData: ProjectImportBody,
        user: AuthenticatedUser
    ): Promise<string> {
        // (1) Check that the user is a member of the org
        await this.organizationsRepository.hasRequiredRole(orgId, user.userId, MemberRole.USER);

        const project = await this.projectsRepository.getProjectById(projectId);
        if (!project) {
            throw new EntityNotFound();
        }

        project.name = projectData.name;
        project.description = projectData.description;

        await this.projectsRepository.saveProject(project);

        await this.organizationLoggerService.addAuditLog(
            ActionType.ProjectCreate,
            `The User update sample ${projectData.name} from the organization.`,
            orgId,
            user.userId
        );

        return projectId;
    }
}
