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

export interface Column {
    id: string;
    name: string;
    type: DataType;
    nullable: boolean;
    primaryKey?: boolean;
    unique?: boolean;
}

export interface TableNode {
    id: string;
    type: 'tableNode';
    data: {
        name: string;
        columns: Column[];
        onChange: (nodeId: string, updatedData: TableNode) => void;
    };
    position: {
        x: number;
        y: number;
    };
}

export type Cardinality = '1:1' | '1:N' | 'N:N' | 'N:1';

export interface Relationship {
    id: string;
    source: string;
    sourceHandle: string; // FK field (optional early on)
    target: string;
    targetHandle: string;
    cardinality: Cardinality;
    data: {
        type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
    };
    markerStart: 'claw-left' | 'claw-right';
    markerEnd: 'claw-left' | 'claw-right';
}


export interface ErdNodeType {
    type: typeof ERDType;
    tables: TableNode[];
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