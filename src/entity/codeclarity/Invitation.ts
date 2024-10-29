import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { Organization } from './Organization';
import { User } from './User';
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { MemberRole } from './OrganizationMemberships';

@Entity()
export class Invitation {
    @ApiProperty()
    @Expose()
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiProperty()
    @Expose()
    @Column('timestamptz', { nullable: true })
    @Type(() => Date)
    created_on: Date;

    @ApiProperty()
    @Expose()
    @Column()
    role: MemberRole;

    @ApiProperty()
    @Column('timestamptz', { nullable: true })
    @Type(() => Date)
    @Expose()
    ttl: Date;

    @ApiProperty()
    @Expose()
    @ManyToOne(
        () => Organization,
        (organization) => {
            organization.invitations;
        }
    )
    organization: Relation<Organization>;

    @ApiProperty()
    @Expose()
    @ManyToOne(
        () => User,
        (user) => {
            user.invitations;
        }
    )
    user: Relation<User>;
}
