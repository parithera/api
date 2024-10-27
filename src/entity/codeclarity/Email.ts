import { Entity, Column, PrimaryGeneratedColumn, Relation, ManyToOne } from 'typeorm';
import { User } from './User';

export enum EmailType {
    EMAILS_BLOCK_ALL_EMAILS = 'EMAILS_BLOCK_ALL_EMAILS',
    EMAILS_BLOCK_ORG_INVITES = 'EMAILS_BLOCK_ORG_INVITES',
    USERS_REGISTRATION_VERIFICATION = 'USERS_REGISTRATION_VERIFICATION',
    USERS_PASSWORD_RESET = 'USERS_PASSWORD_RESET'
}

@Entity()
export class Email {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        length: 250
    })
    token_digest: string;

    @Column()
    email_type: EmailType;

    @Column({
        length: 250
    })
    user_id_digest: string;

    @Column('timestamptz', { nullable: true })
    ttl: Date;

    @ManyToOne(() => User, (user) => user.mails)
    user: Relation<User>;
}
