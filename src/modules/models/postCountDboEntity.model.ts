import { Column, Table, Model, DataType } from 'sequelize-typescript';

@Table
export class PostCountDboEntity extends Model { 
    @Column(DataType.TEXT)
    declare discord_id: string;
    
    @Column(DataType.BIGINT)
    declare xp: number;
}