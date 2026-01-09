import { createPlatePlugin } from "platejs/react";
import { ErdNode } from "@/components/ui/erd-node";

export const ERDType = 'ERD';

export type DataType =
    | 'int'
    | 'bigint'
    | 'varchar'
    | 'text'
    | 'boolean'
    | 'date'
    | 'timestamp'
    | 'json'
    | 'uuid';

export interface Field {
    id: string;
    name: string;
    type: DataType;
    nullable: boolean;
    primaryKey?: boolean;
    unique?: boolean;
}

export interface Entity {
    id: string;
    name: string;
    position: {
        x: number;
        y: number;
    };
    fields: Field[];
}

export type Cardinality = '1:1' | '1:N' | 'N:N' | 'N:1';

export interface Relationship {
    id: string;
    fromEntityId: string;
    fromFieldId?: string; // FK field (optional early on)
    toEntityId: string;
    toFieldId?: string;
    cardinality: Cardinality;
    optional?: boolean;
}


export interface ErdNodeType {
    type: typeof ERDType;
    entities: Entity[];
    relationships: Relationship[];
    children: [{ text: '' }];
    [key: string]: any;
}


export const ERDPlugin = createPlatePlugin({
    key: ERDType,
    node: {
        isElement: true,
        isVoid: true,
        component: ErdNode
    }
})