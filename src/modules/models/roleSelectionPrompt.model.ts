import { Column, Table, DataType, HasMany, Model, Unique, BelongsTo, ForeignKey } from 'sequelize-typescript';

@Table
export class RoleSelectionPromt extends Model {

    @Column({type: DataType.TEXT})
    declare channel_name: string;

    @Column({type: DataType.INTEGER, primaryKey:true})
    declare roleSelectionPromptId: number;

    @Unique
    @Column(DataType.TEXT)
    declare title: string;

    @HasMany(() => RoleOption)
    declare options: RoleOption[];
}

@Table
export class RoleOption extends Model {
    @Column({type: DataType.BIGINT, primaryKey:true})
    declare roleID: number;

    @Column(DataType.TEXT)
    declare description: string;

    @Unique
    @Column(DataType.TEXT)
    declare role_name: string;

    @Column(DataType.TEXT)
    declare button_text: string;

    @Column(DataType.TEXT)
    declare button_emoji: string;

    @Column(DataType.TEXT)
    declare button_style: string;

    @Column(DataType.BOOLEAN)
    declare toggle: boolean;

    @Column(DataType.TEXT)
    declare associatedColor: string;

    @ForeignKey(() => RoleSelectionPromt)
    @Column(DataType.INTEGER)
    declare roleSelectionPromptId: number;

    @BelongsTo(() => RoleSelectionPromt)
    declare roleSelectionPrompt: RoleSelectionPromt;
}