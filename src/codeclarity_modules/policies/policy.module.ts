import { Module } from '@nestjs/common';
import { LicensePolicyModule } from './license/license.module';
import { DependencyPatchPolicyModule } from './dependencyPatch/dependencyPatch.module';

@Module({
    imports: [LicensePolicyModule, DependencyPatchPolicyModule],
    providers: [],
    controllers: []
})
export class PolicyModule {}
