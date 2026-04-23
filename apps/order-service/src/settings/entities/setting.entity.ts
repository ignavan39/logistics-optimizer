import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SettingKey {
  COMPANY_NAME = 'company_name',
  COMPANY_INN = 'company_inn',
  COMPANY_KPP = 'company_kpp',
  COMPANY_ADDRESS = 'company_address',
  COMPANY_PHONE = 'company_phone',
  COMPANY_EMAIL = 'company_email',
  DEFAULT_PAYMENT_TERMS_DAYS = 'default_payment_terms_days',
  DEFAULT_VAT_RATE = 'default_vat_rate',
}

@Entity('settings')
@Index(['key'], { unique: true })
export class SettingEntity {
  @PrimaryColumn({ length: 100 })
  key!: string;

  @Column({ type: 'text' })
  value!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}