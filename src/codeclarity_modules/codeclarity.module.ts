import { Module } from '@nestjs/common';

import { EmailModule } from './email/email.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ResultsModule } from './results/results.module';
import { ProjectsModule } from './projects/projects.module';
import { PolicyModule } from './policies/policy.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PluginModule } from './plugins/plugin.module';
import { AnalysesModule } from './analyses/analyses.module';
import { FileModule } from './file/file.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AnalyzersModule } from './analyzers/analyzers.module';
import { ApiKeysModule } from './apiKeys/apiKeys.module';
import { OrganizationsModule } from './organizations/organizations.module';

@Module({
    imports: [
        EmailModule,
        AuthModule,
        UsersModule,
        ResultsModule,
        ProjectsModule,
        PolicyModule,
        IntegrationsModule,
        KnowledgeModule,
        DashboardModule,
        PluginModule,
        AnalysesModule,
        FileModule,
        NotificationsModule,
        AnalyzersModule,
        ApiKeysModule,
        OrganizationsModule
    ],
    providers: [],
    controllers: []
})
export class CodeClarityModule {}
