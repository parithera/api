import { Injectable } from '@nestjs/common';
import { File } from '@nest-lab/fastify-multer';
import * as fs from 'fs';
import { AuthenticatedUser } from 'src/types/auth/types';
import { File as FileEntity } from 'src/entity/codeclarity/File';
import { User } from 'src/entity/codeclarity/User';
import { Project } from 'src/entity/codeclarity/Project';
import { UploadData } from './file.controller';
import { join } from 'path';
import { escapeString } from 'src/utils/cleaner';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemberRole } from 'src/entity/codeclarity/OrganizationMemberships';
import { OrganizationsMemberService } from '../organizations/organizationMember.service';

@Injectable()
export class FileService {
    constructor(
        private readonly organizationMemberService: OrganizationsMemberService,
        @InjectRepository(Project, 'codeclarity')
        private projectRepository: Repository<Project>,
        @InjectRepository(User, 'codeclarity')
        private userRepository: Repository<User>,
        @InjectRepository(FileEntity, 'codeclarity')
        private fileRepository: Repository<FileEntity>
    ) {}

    async uploadFile(
        user: AuthenticatedUser,
        file: File,
        project_id: string,
        organization_id: string,
        queryParams: UploadData
    ): Promise<void> {
        await this.organizationMemberService.hasRequiredRole(
            organization_id,
            user.userId,
            MemberRole.USER
        );
        // retrieve files from project
        const project = await this.projectRepository.findOne({
            where: {
                id: project_id,
                organizations: {
                    id: organization_id
                }
            },
            relations: {
                added_by: true
            }
        });
        if (!project) {
            throw new Error('Project not found');
        }
        const escapeProjectId = escapeString(project_id);

        // Retrieve the user who added the file
        const added_by = await this.userRepository.findOne({
            where: {
                id: user.userId
            }
        });
        if (!added_by) {
            throw new Error('User not found');
        }

        // Write the file to the file system
        const folderPath = join('/private', project.added_by.id, escapeProjectId);
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        const escapedFileName = escapeString(queryParams.file_name);
        const filePath = join(folderPath, escapedFileName); // Replace with the desired file path
        const fileStream = fs.createWriteStream(filePath);

        fileStream.write(file.buffer);
        fileStream.end();

        // Save the file to the database
        const file_entity = new FileEntity();
        file_entity.added_by = added_by;
        file_entity.added_on = new Date();
        file_entity.project = project;
        file_entity.type = queryParams.type;
        file_entity.name = escapedFileName;

        this.fileRepository.save(file_entity);
    }

    async delete(
        file_id: string,
        organization_id: string,
        project_id: string,
        user: AuthenticatedUser
    ): Promise<void> {
        await this.organizationMemberService.hasRequiredRole(
            organization_id,
            user.userId,
            MemberRole.USER
        );
        // retrieve files from project
        const project = await this.projectRepository.findOne({
            where: {
                id: project_id,
                organizations: {
                    id: organization_id
                }
            },
            relations: {
                added_by: true
            }
        });
        if (!project) {
            throw new Error('Project not found');
        }

        const escapeProjectId = escapeString(project_id);
        // Retrieve the user who added the file
        const added_by = await this.userRepository.findOne({
            where: {
                id: user.userId
            }
        });
        if (!added_by) {
            throw new Error('User not found');
        }

        // Retrieve the file
        const file = await this.fileRepository.findOne({
            where: {
                id: file_id,
                added_by: added_by
            }
        });
        if (!file) {
            throw new Error('File not found');
        }

        // Delete the file from the file system
        const filePath = join('/private', project.added_by.id, escapeProjectId, file.name);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Delete the file from the database
        await this.fileRepository.delete(file.id);
    }
}
