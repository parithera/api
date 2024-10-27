import { Module } from '@nestjs/common';
import { DependencyPatchPolicyController } from './dependencyPatch.controller';
import { DependencyPatchPolicyService } from './dependencyPatch.service';

@Module({
    imports: [],
    providers: [DependencyPatchPolicyService],
    controllers: [DependencyPatchPolicyController]
})
export class DependencyPatchPolicyModule {}
