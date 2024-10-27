import { Entity, Column, PrimaryGeneratedColumn, ManyToMany, Relation } from 'typeorm';
import { Organization } from './Organization';

enum NotificationType {
    Info = 'info',
    Warning = 'warning',
    Error = 'error'
}

enum NotificationContentType {
    NewVersion = 'new_version'
}

@Entity()
export class Notification {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        length: 100
    })
    title: string;

    @Column('text')
    description: string;

    @Column('jsonb')
    content: Record<string, string>;

    @Column()
    type: NotificationType;

    @Column()
    content_type: NotificationContentType;

    // Foreign keys
    @ManyToMany(() => Organization, (organization) => organization.notifications)
    organizations: Relation<Organization[]>;
}
