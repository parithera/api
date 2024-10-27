import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, Relation } from 'typeorm';
import { Analysis } from './Analysis';

@Entity()
export class Result {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('jsonb')
    result: JSON;

    // Foreign keys
    @ManyToOne(() => Analysis, (analysis) => analysis.results)
    analysis: Relation<Analysis>;

    @Column()
    plugin: string;
}

export interface ResultByAnalysisId {
    id: string;
    image: string;
}
