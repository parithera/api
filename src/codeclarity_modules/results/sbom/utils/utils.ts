import {
    Dependency,
    DependencyDetails,
    Output as SBOMOutput,
    Status
} from 'src/codeclarity_modules/results/sbom/sbom.types';
import { Output as LicenseOutput } from 'src/codeclarity_modules/results/licenses/licenses.types';
import { Output as VulnsOutput } from 'src/codeclarity_modules/results/vulnerabilities/vulnerabilities.types';
import {
    EntityNotFound,
    PluginFailed,
    PluginResultNotAvailable,
    UnknownWorkspace
} from 'src/types/error.types';
import { Result } from 'src/codeclarity_modules/results/result.entity';
import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { VulnerabilitiesUtilsService } from '../../vulnerabilities/utils/utils.service';
import { LicensesUtilsService } from '../../licenses/utils/utils';
import { PackageRepository } from 'src/codeclarity_modules/knowledge/package/package.repository';

@Injectable()
export class SbomUtilsService {
    constructor(
        private readonly vulnerabilitiesUtilsService: VulnerabilitiesUtilsService,
        private readonly licensesUtilsService: LicensesUtilsService,
        private readonly packageRepository: PackageRepository,
        @InjectRepository(Result, 'codeclarity')
        private resultRepository: Repository<Result>,
    ) { }

    async getSbomData(
        analysis_id: string,
        workspace: string,
    ): Promise<Dependency[]> {
        const sbom: SBOMOutput = await this.getSbomResult(analysis_id);

        // Validate that the workspace exists
        if (!(workspace in sbom.workspaces)) {
            throw new UnknownWorkspace();
        }

        const dependenciesMap = sbom.workspaces[workspace].dependencies;

        // Attach licenses info if the service has finished
        try {
            const licenses: LicenseOutput = await this.licensesUtilsService.getLicensesResult(analysis_id);
            const workspaceLicenses = licenses.workspaces[workspace].DependencyInfo;
            // for (const [key, depInfo] of Object.entries(workspaceLicenses)) {
            //     if (depInfo) {
            //         dependenciesMap[key].licenses = depInfo.Licenses ?? [];
            //         dependenciesMap[key].unlicensed = dependenciesMap[key].licenses.length == 0;
            //         dependenciesMap[key].non_spdx_licenses = depInfo.NonSpdxLicenses ?? [];
            //         dependenciesMap[key].package_manager = sbom.analysis_info.package_manager;
            //     }
            // }
        } catch (err) {
            // Nothing to throw here
        }

        // Attach vulnerability info if the service has finished
        try {
            const vulns: VulnsOutput = await this.vulnerabilitiesUtilsService.getVulnsResult(analysis_id);
            const workspaceDepInfo = vulns.workspaces[workspace].DependencyInfo;
            // for (const [key, depInfo] of Object.entries(workspaceDepInfo)) {
            //     dependenciesMap[key].combined_severity = depInfo.Vulnerabilities.map(
            //         (depInfoVuln) => depInfoVuln.Severity.Severity
            //     ).reduce((accumulator, currentValue) => accumulator + currentValue, 0);
            //     dependenciesMap[key].vulnerable = depInfo.Vulnerable;
            //     dependenciesMap[key].vulnerabilities = depInfo.Vulnerabilities.map(
            //         (depInfoVuln) => depInfoVuln.Vulnerability
            //     );
            //     if (depInfo.SeverityDist)
            //         dependenciesMap[key].severity_dist = {
            //             critical: depInfo.SeverityDist.critical,
            //             high: depInfo.SeverityDist.high,
            //             medium: depInfo.SeverityDist.medium,
            //             low: depInfo.SeverityDist.low,
            //             none: depInfo.SeverityDist.none
            //         };
            //     else
            //         dependenciesMap[key].severity_dist = {
            //             critical: 0,
            //             high: 0,
            //             medium: 0,
            //             low: 0,
            //             none: 0
            //         };
            // }
        } catch (err) {
            // Nothing to throw here
        }

        // Generate the list of deps (SBOM)
        const dependenciesArray: Dependency[] = [];

        // for (const [, dep] of Object.entries(dependenciesMap)) {
        //     dependenciesArray.push(dep);
        // }

        return dependenciesArray;
    }

    async getSbomResult(
        analysis_id: string
    ): Promise<SBOMOutput> {
        const result = await this.resultRepository.findOne({
            relations: { analysis: true },
            where: {
                analysis: {
                    id: analysis_id
                },
                plugin: 'js-sbom'
            },
            order: {
                analysis: {
                    created_on: 'DESC'
                }
            },
            cache: true
        });
        if (!result) {
            throw new PluginResultNotAvailable();
        }

        const sbom: SBOMOutput = result.result as unknown as SBOMOutput;
        if (sbom.analysis_info.status == Status.Failure) {
            throw new PluginFailed();
        }
        return sbom;
    }

    async getDependencyData(
        analysis_id: string,
        workspace: string,
        dependency_name: string,
        dependency_version: string,
        sbom: SBOMOutput
    ): Promise<DependencyDetails> {
        const package_version = await this.packageRepository.getVersionInfo(dependency_name, dependency_version)
        
        const dependency = sbom.workspaces[workspace].dependencies[dependency_name][dependency_version];

        const version = package_version.versions[0];
        const dependency_details: DependencyDetails = {
            name: dependency_name,
            version: version.version,
            latest_version: package_version.latest_version,
            dependencies: version.dependencies,
            dev_dependencies: version.dev_dependencies,
            transitive: dependency.Transitive,
            source: package_version.source,
            package_manager: sbom.analysis_info.package_manager,
            license: package_version.license,
            engines: version.extra.Engines,
            release_date: version.extra.Time,
            lastest_release_date: package_version.time,
            vulnerabilities: [],
        };

        // dependency_details.transitive = dependency

        // // Attach licenses info if the service has finished
        // try {
        //     const licenses: LicenseOutput = await getLicensesResult(db, analysis_id);
        //     const license = licenses.workspaces[workspace].DependencyInfo[dependency.key];
        //     dependency.licenses = license?.Licenses ?? [];
        //     dependency.unlicensed = dependency.licenses.length == 0;
        //     dependency.non_spdx_licenses = license?.NonSpdxLicenses ?? [];
        //     dependency.package_manager = sbom.analysis_info.package_manager;
        // } catch (err) {
        //     // Nothing to throw here
        // }

        // Attach vulnerability info if the service has finished
        try {
            const vulns: VulnsOutput = await this.vulnerabilitiesUtilsService.getVulnsResult(analysis_id);
            // const vulnInfo = vulns.workspaces[workspace].DependencyInfo[dependency.key];

            // dependency.combined_severity = vulnInfo.Vulnerabilities.map(
            //     (depInfoVuln) => depInfoVuln.Severity.Severity
            // ).reduce((accumulator, currentValue) => accumulator + currentValue, 0);

            // dependency.vulnerable = vulnInfo.Vulnerable;

            // dependency.vulnerabilities = vulnInfo.Vulnerabilities.map(
            //     (depInfoVuln) => depInfoVuln.Vulnerability
            // );

            // dependency.combined_severity = vulnInfo.Vulnerabilities.map(
            //     (depInfoVuln) => depInfoVuln.Severity.Severity
            // ).reduce((accumulator, currentValue) => accumulator + currentValue, 0);

            // dependency.vulnerable = vulnInfo.Vulnerable;

            // dependency.vulnerabilities = vulnInfo.Vulnerabilities.map(
            //     (depInfoVuln) => depInfoVuln.Vulnerability
            // );

            // if (vulnInfo.SeverityDist)
            //     dependency.severity_dist = {
            //         critical: vulnInfo.SeverityDist.critical,
            //         high: vulnInfo.SeverityDist.high,
            //         medium: vulnInfo.SeverityDist.medium,
            //         low: vulnInfo.SeverityDist.low,
            //         none: vulnInfo.SeverityDist.none
            //     };
            // else
            //     dependency.severity_dist = {
            //         critical: 0,
            //         high: 0,
            //         medium: 0,
            //         low: 0,
            //         none: 0
            //     };
        } catch (err) {
            // Nothing to throw here
        }

        return dependency_details;
    }

    // export async function getParents(
    //     dependenciesMap: {
    //         [key: string]: Dependency;
    //     },
    //     dependency: string,
    //     parentsSet: Set<string> = new Set()
    // ): Promise<WorkSpaceData> {
    //     const graph: WorkSpaceData = {
    //         start_dev_deps: [],
    //         start_deps: [],
    //         dependencies: {},
    //         start_deps_constraints: {},
    //         start_dev_deps_constraints: {}
    //     };

    //     if (parentsSet.has(dependency)) {
    //         return graph;
    //     }

    //     graph.dependencies[dependency] = dependenciesMap[dependency];

    //     // If top level dependency
    //     if (dependenciesMap[dependency].is_direct_count > 0) {
    //         if (dependenciesMap[dependency].is_dev_count > 0) {
    //             graph.start.dev_dependencies.push(dependency);
    //             graph.start_dev_deps_constraints[dependency] = dependenciesMap[dependency].version;
    //         }
    //         if (dependenciesMap[dependency].is_prod_count > 0) {
    //             graph.start.dependencies.push(dependency);
    //             graph.start_deps_constraints[dependency] = dependenciesMap[dependency].version;
    //         }
    //     }

    //     if (dependenciesMap[dependency].parents.length !== 0) {
    //         const parents: string[] = dependenciesMap[dependency].parents;
    //         parentsSet.add(dependency);
    //         for (const parent of parents) {
    //             const parentGraph: WorkSpaceData = await getParents(
    //                 dependenciesMap,
    //                 parent,
    //                 parentsSet
    //             );
    //             for (const [, value] of Object.entries(parentGraph.start_deps)) {
    //                 graph.start.dependencies.push(value);
    //             }
    //             for (const [, value] of Object.entries(parentGraph.start_dev_deps)) {
    //                 graph.start.dev_dependencies.push(value);
    //             }

    //             for (const [key, value] of Object.entries(parentGraph.dependencies)) {
    //                 graph.dependencies[key] = value;
    //             }
    //         }
    //     }

    //     graph.start.dependencies = Array.from(new Set(graph.start_deps));
    //     graph.start.dev_dependencies = Array.from(new Set(graph.start_dev_deps));
    //     return graph;
    // }
}