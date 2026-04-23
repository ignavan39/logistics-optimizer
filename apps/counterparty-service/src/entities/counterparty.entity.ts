import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

export enum CounterpartyType {
  CARRIER = 'carrier',
  WAREHOUSE = 'warehouse',
  INDIVIDUAL = 'individual',
}

export interface Address {
  full: string;
  lat?: number;
  lng?: number;
  city?: string;
  region?: string;
}

export interface Contact {
  name: string;
  phone: string;
  email?: string;
  position?: string;
}

@Entity('counterparty')
@Index(['inn'], { unique: true })
@Index(['type'])
export class CounterpartyEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ type: 'enum', enum: CounterpartyType, default: CounterpartyType.CARRIER })
  type!: CounterpartyType;

  @Column({ length: 20 })
  inn!: string;

  @Column({ length: 9, nullable: true })
  kpp?: string;

  @Column({ length: 15, nullable: true })
  ogrn?: string;

  @Column({ type: 'jsonb', nullable: true })
  address?: Address;

  @Column({ type: 'jsonb', nullable: true })
  contacts?: Contact[];

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  email?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @VersionColumn()
  version!: number;
}