import {
    ReactFlow,
    useNodesState,
    useEdgesState,
    addEdge,
    type Node,
    type Edge,
    Position,
    Background,
    Handle,
    type Connection,
    useReactFlow,
    type EdgeProps,
    EdgeToolbar,
    BaseEdge,
    applyNodeChanges,
    getSmoothStepPath,
    type OnNodesChange,
    type OnEdgesChange,
    applyEdgeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectTrigger,
    SelectItem,
    SelectValue,
    SelectGroup,
    SelectLabel
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Maximize, Minimize, PlusIcon, Trash2Icon } from 'lucide-react';
import type { ErdNodeType } from '../editor/plugins/erd-kit';
import type { PlateElementProps } from 'platejs/react';
import { useEditorRef } from 'platejs/react';

function CustomEdge(props: EdgeProps) {
    const { selected, sourceHandleId, targetHandleId } = props;
    const [edgePath, centerX, centerY] = getSmoothStepPath(props);
    const { getEdges, setEdges } = useReactFlow();

    const handleTypeChange = (type: string) => {
        switch (type) {
            case 'one-to-one':
                setEdges(getEdges().map((edge) => edge.id === props.id ? { ...edge, markerStart: undefined, markerEnd: undefined, data: { type: 'one-to-one' } } : edge));
                break;
            case 'one-to-many':
                setEdges(
                    getEdges().map((edge) => edge.id === props.id ?
                        {
                            ...edge,
                            markerStart: undefined,
                            markerEnd: (targetHandleId?.endsWith('-l') ? 'claw-left' : 'claw-right'),
                            data: { type: 'one-to-many' }
                        } : edge)
                );
                break;
            case 'many-to-one':
                setEdges(
                    getEdges().map((edge) => edge.id === props.id ?
                        {
                            ...edge,
                            markerStart: (sourceHandleId?.endsWith('-l') ? 'claw-left' : 'claw-right'),
                            markerEnd: undefined,
                            data: { type: 'many-to-one' }
                        } : edge)
                );
                break;
            case 'many-to-many':
                setEdges(
                    getEdges().map((edge) => edge.id === props.id ?
                        {
                            ...edge,
                            markerStart: (sourceHandleId?.endsWith('-l') ? 'claw-left' : 'claw-right'),
                            markerEnd: (targetHandleId?.endsWith('-l') ? 'claw-left' : 'claw-right'),
                            data: { type: 'many-to-many' }
                        } : edge)
                );
                break;
        }
    }

    return (
        <React.Fragment key={props.id}>
            <BaseEdge
                id={props.id}
                path={edgePath}
                markerStart={props.markerStart as string || undefined}
                markerEnd={props.markerEnd as string || undefined}
                className='cursor-pointer'
            />
            <EdgeToolbar edgeId={props.id} x={centerX} y={centerY} isVisible>
                {selected && (
                    <Select onValueChange={(value) => handleTypeChange(value)} value={props.data?.type as string || 'one-to-one'}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="one-to-one">One-to-One</SelectItem>
                            <SelectItem value="one-to-many">One-to-Many</SelectItem>
                            <SelectItem value="many-to-one">Many-to-One</SelectItem>
                            <SelectItem value="many-to-many">Many-to-Many</SelectItem>
                        </SelectContent>
                    </Select>
                )}
            </EdgeToolbar>
        </React.Fragment>
    );
}

function TableNode({ data, id }: { data: TableNodeData, id: string }) {
    const { columns, name, onChange } = data;
    const [isEditingTitle, setIsEditingTitle] = useState(false);

    const handleTitleBlur = (value: string) => {
        setIsEditingTitle(false);
        onChange(id, { name: value, columns, onChange });
    };

    const handleAddColumn = () => {
        onChange(id, { columns: [...columns, { id: crypto.randomUUID(), name: 'New Column', type: 'integer', primaryKey: false, nullable: false }], onChange, name });
    };

    const handlePkChange = (colId: string, primaryKey: boolean) => {
        onChange(id, { columns: columns.map((col) => col.id === colId ? { ...col, primaryKey } : col), name, onChange });
    };

    const handleColumnNameChange = (colId: string, columnName: string) => {
        onChange(id, { columns: columns.map((col) => col.id === colId ? { ...col, name: columnName } : col), name, onChange });
    };

    const handleColumnTypeChange = (colId: string, type: string) => {
        onChange(id, { columns: columns.map((col) => col.id === colId ? { ...col, type } : col), name, onChange });
    };

    const handleColumnDelete = (colId: string) => {
        onChange(id, { columns: columns.filter((col) => col.id !== colId), name, onChange });
    };

    const handleColumnNullableChange = (colId: string, nullable: boolean) => {
        onChange(id, { columns: columns.map((col) => col.id === colId ? { ...col, nullable } : col), name, onChange });
    };

    return (
        <div className="bg-muted border rounded-md flex flex-col" key={id}>
            {/* Title */}
            <div className="p-4 border-b">
                {isEditingTitle ? (
                    <Input
                        autoFocus
                        placeholder="Table name"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                (e.target as HTMLInputElement).blur();
                            }
                        }}
                        onBlur={(e) => handleTitleBlur(e.target.value)}
                        defaultValue={name}
                    />
                ) : (
                    <h1
                        className="text-lg font-bold cursor-pointer"
                        onClick={() => setIsEditingTitle(true)}
                    >
                        {name}
                    </h1>
                )}
            </div>

            {/* Columns */}
            <div className="relative flex flex-col py-4">
                <div className='grid grid-cols-[22px_130px_140px_22px_32px] gap-2 px-4 pb-4 items-center relative'>
                    <Label>PK</Label>
                    <Label>Column</Label>
                    <Label>Type</Label>
                    <Label>N</Label>
                </div>
                {columns.map((col, index) => {
                    return (
                        <div
                            key={index}
                            className="grid grid-cols-[22px_130px_140px_22px_32px] gap-2 px-4 mb-4 items-center relative"
                        >
                            {/* Target handle (left) */}
                            <Handle
                                id={`col-${col.id}-source-l`}
                                type="source"
                                position={Position.Left}
                            />

                            <Handle
                                id={`col-${col.id}-target-l`}
                                type="target"
                                position={Position.Left}
                            />
                            <Checkbox checked={col.primaryKey} onCheckedChange={(checked) => handlePkChange(col.id, checked as boolean)} />
                            <Input
                                defaultValue={col.name}
                                onBlur={(e) => handleColumnNameChange(col.id, e.target.value)}
                            />
                            <Select defaultValue={col.type} onValueChange={(value) => handleColumnTypeChange(col.id, value)}>
                                <SelectTrigger className='w-full'>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>Numeric Types</SelectLabel>
                                        <SelectItem value="smallint">smallint</SelectItem>
                                        <SelectItem value="integer">integer</SelectItem>
                                        <SelectItem value="bigint">bigint</SelectItem>
                                        <SelectItem value="decimal">decimal</SelectItem>
                                        <SelectItem value="numeric">numeric</SelectItem>
                                        <SelectItem value="real">real</SelectItem>
                                        <SelectItem value="double precision">double precision</SelectItem>
                                        <SelectItem value="smallserial">smallserial</SelectItem>
                                        <SelectItem value="serial">serial</SelectItem>
                                        <SelectItem value="bigserial">bigserial</SelectItem>
                                    </SelectGroup>

                                    <SelectGroup>
                                        <SelectLabel>Monetary Type</SelectLabel>
                                        <SelectItem value="money">money</SelectItem>
                                    </SelectGroup>

                                    <SelectGroup>
                                        <SelectLabel>Character Types</SelectLabel>
                                        <SelectItem value="char">char</SelectItem>
                                        <SelectItem value="varchar">varchar</SelectItem>
                                        <SelectItem value="text">text</SelectItem>
                                    </SelectGroup>

                                    <SelectGroup>
                                        <SelectLabel>Binary Type</SelectLabel>
                                        <SelectItem value="bytea">bytea</SelectItem>
                                    </SelectGroup>

                                    <SelectGroup>
                                        <SelectLabel>Date / Time Types</SelectLabel>
                                        <SelectItem value="date">date</SelectItem>
                                        <SelectItem value="time">time</SelectItem>
                                        <SelectItem value="timetz">timetz</SelectItem>
                                        <SelectItem value="timestamp">timestamp</SelectItem>
                                        <SelectItem value="timestamptz">timestamptz</SelectItem>
                                        <SelectItem value="interval">interval</SelectItem>
                                    </SelectGroup>

                                    <SelectGroup>
                                        <SelectLabel>Boolean Type</SelectLabel>
                                        <SelectItem value="boolean">boolean</SelectItem>
                                    </SelectGroup>

                                    <SelectGroup>
                                        <SelectLabel>Network Address Types</SelectLabel>
                                        <SelectItem value="inet">inet</SelectItem>
                                        <SelectItem value="cidr">cidr</SelectItem>
                                        <SelectItem value="macaddr">macaddr</SelectItem>
                                        <SelectItem value="macaddr8">macaddr8</SelectItem>
                                    </SelectGroup>

                                    <SelectGroup>
                                        <SelectLabel>Bit String Types</SelectLabel>
                                        <SelectItem value="bit">bit</SelectItem>
                                        <SelectItem value="bit varying">bit varying</SelectItem>
                                        <SelectItem value="varbit">varbit</SelectItem>
                                    </SelectGroup>

                                    <SelectGroup>
                                        <SelectLabel>Full-Text Search Types</SelectLabel>
                                        <SelectItem value="tsvector">tsvector</SelectItem>
                                        <SelectItem value="tsquery">tsquery</SelectItem>
                                    </SelectGroup>

                                    <SelectGroup>
                                        <SelectLabel>UUID Type</SelectLabel>
                                        <SelectItem value="uuid">uuid</SelectItem>
                                    </SelectGroup>

                                    <SelectGroup>
                                        <SelectLabel>XML / JSON Types</SelectLabel>
                                        <SelectItem value="xml">xml</SelectItem>
                                        <SelectItem value="json">json</SelectItem>
                                        <SelectItem value="jsonb">jsonb</SelectItem>
                                    </SelectGroup>

                                    <SelectGroup>
                                        <SelectLabel>Geometric Types</SelectLabel>
                                        <SelectItem value="point">point</SelectItem>
                                        <SelectItem value="line">line</SelectItem>
                                        <SelectItem value="lseg">lseg</SelectItem>
                                        <SelectItem value="box">box</SelectItem>
                                        <SelectItem value="path">path</SelectItem>
                                        <SelectItem value="polygon">polygon</SelectItem>
                                        <SelectItem value="circle">circle</SelectItem>
                                    </SelectGroup>

                                    <SelectGroup>
                                        <SelectLabel>Range Types</SelectLabel>
                                        <SelectItem value="int4range">int4range</SelectItem>
                                        <SelectItem value="int8range">int8range</SelectItem>
                                        <SelectItem value="numrange">numrange</SelectItem>
                                        <SelectItem value="daterange">daterange</SelectItem>
                                        <SelectItem value="tsrange">tsrange</SelectItem>
                                        <SelectItem value="tstzrange">tstzrange</SelectItem>
                                    </SelectGroup>

                                    <SelectGroup>
                                        <SelectLabel>System Types</SelectLabel>
                                        <SelectItem value="pg_lsn">pg_lsn</SelectItem>
                                        <SelectItem value="txid_snapshot">txid_snapshot</SelectItem>
                                    </SelectGroup>
                                </SelectContent>

                            </Select>
                            <Checkbox checked={col.nullable} onCheckedChange={(checked) => handleColumnNullableChange(col.id, checked as boolean)} />
                            <Button variant="outline" size="icon" className='w-full cursor-pointer' onClick={() => handleColumnDelete(col.id)}>
                                <Trash2Icon className="size-4" />
                            </Button>

                            {/* Source handle (right) */}
                            <Handle
                                id={`col-${col.id}-source-r`}
                                type="source"
                                position={Position.Right}
                            />

                            <Handle
                                id={`col-${col.id}-target-r`}
                                type="target"
                                position={Position.Right}
                            />
                        </div>
                    );
                })}
                <div className='px-4'>
                    <Button onClick={handleAddColumn} variant="outline" className='w-full cursor-pointer'>
                        <PlusIcon className="size-4" />
                        Add Column
                    </Button>
                </div>
            </div>
        </div>
    );
}

const nodeTypes = {
    tableNode: memo(TableNode),
};

const edgeTypes = {
    default: memo(CustomEdge),
};

const defaultViewport = { x: 0, y: 0, zoom: 0.5 };
const proOptions = { hideAttribution: true };

interface TableNodeData {
    name: string;
    columns: {
        id: string;
        name: string;
        type: string;
        primaryKey: boolean;
        nullable: boolean;
    }[];
    onChange: (nodeId: string, updatedData: TableNodeData) => void;
}

export default function ErdNode({ element }: PlateElementProps<ErdNodeType>) {
    const editor = useEditorRef();
    const erdNodeRef = useRef<HTMLDivElement>(null);
    const [nodes, setNodes] = useNodesState<Node>([]);
    const [edges, setEdges] = useEdgesState<Edge>([]);
    const [isMaximized, setIsMaximized] = useState(false);

    const onChange = useCallback((nodeId: string, updatedData: TableNodeData) => {
        setNodes((nds) => {

            const updatedNodes = nds.map((node) => {
                if (node.id !== nodeId) {
                    return node;
                }

                return {
                    ...node,
                    data: {
                        ...node.data,
                        ...updatedData,
                    },
                };
            });

            editor.tf.setNodes({
                tables: updatedNodes,
            }, {
                at: element
            });

            return updatedNodes;
        });
    }, [setNodes, editor.tf, element]);

    const onNodesChange: OnNodesChange = useCallback((changes) => {
        setNodes((nds) => applyNodeChanges(changes, nds));
        for (const change of changes) {
            if (change.type === 'remove') {
                const updatedTables = nodes.filter((table) => table.id !== change.id);
                editor.tf.setNodes({
                    tables: updatedTables,
                }, {
                    at: element
                });
            } else if (change.type === 'position') {
                const updatedTables = nodes.map((table) =>
                    (table.id === change.id ? { ...table, position: change.position } : table)
                );
                editor.tf.setNodes({
                    tables: updatedTables,
                }, {
                    at: element
                });
            }
        }
    }, [setNodes, editor.tf, element, nodes])

    const onEdgesChange: OnEdgesChange = useCallback((changes) => {
        setEdges((eds) => applyEdgeChanges(changes, eds));
        for (const change of changes) {
            if (change.type === 'remove') {
                const updatedRelationships = edges.filter((edge) => edge.id !== change.id);
                editor.tf.setNodes({
                    relationships: updatedRelationships,
                }, {
                    at: element
                });
            } else if (change.type === 'replace') {
                const updatedRelationships = edges.map((edge) =>
                    (edge.id === change.id ? { ...change.item, id: change.id } : edge)
                );
                editor.tf.setNodes({
                    relationships: updatedRelationships,
                }, {
                    at: element
                });
            } else if (change.type === 'add') {
                const updatedRelationships = [...edges, { ...change.item }];
                editor.tf.setNodes({
                    relationships: updatedRelationships,
                }, {
                    at: element
                });
            } else if (change.type === 'select') {
                const updatedRelationships = edges.map((edge) =>
                    (edge.id === change.id ? { ...edge, selected: change.selected } : edge)
                );
                editor.tf.setNodes({
                    relationships: updatedRelationships,
                }, {
                    at: element
                });
            }
        }
    }, [setEdges, editor.tf, element, edges]);

    useEffect(() => {
        setNodes(element.tables.map((table) => ({
            ...table,
            data: {
                ...table.data,
                onChange,
            }
        })));
        setEdges(element.relationships);
    }, []);

    const onConnect = useCallback((params: Edge | Connection) => {
        setEdges((eds) => addEdge({ ...params, animated: false }, eds));
        editor.tf.setNodes({
            relationships: [...edges, { ...params, animated: false }],
        }, {
            at: element
        });
    }, [setEdges, editor.tf, element, edges]);

    const handleAddTable = () => {
        const newTable = {
            id: crypto.randomUUID(),
            type: 'tableNode',
            data: { name: 'New Table', columns: [], onChange },
            position: { x: 200, y: 100 },
        };
        editor.tf.setNodes({
            tables: [...element.tables, newTable],
        }, {
            at: element
        });

        setNodes((nds) => [...nds, newTable]);
    };

    const handleMaximize = () => {
        setIsMaximized(true);
        erdNodeRef.current!.style.position = 'fixed';
        erdNodeRef.current!.style.top = `0px`;
        erdNodeRef.current!.style.left = `0px`;
        erdNodeRef.current!.style.right = '0px';
        erdNodeRef.current!.style.height = '100%';
        erdNodeRef.current!.style.borderRadius = '0px';
        erdNodeRef.current!.style.zIndex = '1000';
        erdNodeRef.current!.style.backgroundColor = 'var(--background)';
    }

    const handleMinimize = () => {
        setIsMaximized(false);
        erdNodeRef.current!.style.position = 'relative';
        erdNodeRef.current!.style.position = '';
        erdNodeRef.current!.style.width = '';
        erdNodeRef.current!.style.height = '';
        erdNodeRef.current!.style.zIndex = '';
        erdNodeRef.current!.style.top = '';
        erdNodeRef.current!.style.left = '';
        erdNodeRef.current!.style.right = '';
        erdNodeRef.current!.style.bottom = '';
        erdNodeRef.current!.style.borderRadius = '';
        erdNodeRef.current!.style.backgroundColor = '';
    }

    return (
        <div contentEditable={false} className='w-full h-[500px] border rounded-md' ref={erdNodeRef}>
            <svg style={{ position: 'absolute', top: 0, left: 0 }}>
                <defs>
                    <marker
                        id="claw-left"
                        viewBox="0 0 100 100"
                        markerHeight={20}
                        markerWidth={20}
                        refX={84}
                        refY={50}
                        orient="0"
                    >
                        <path d="M100 50 L0 50 M0 50 L100 0 M0 50 L100 100" stroke='#b1b1b7'
                            strokeWidth="4" />
                    </marker>
                </defs>
            </svg>
            <svg style={{ position: 'absolute', top: 0, left: 0 }}>
                <defs>
                    <marker
                        id="claw-right"
                        viewBox="0 0 100 100"
                        markerHeight={20}
                        markerWidth={20}
                        refX={16}
                        refY={50}
                        orient="0"
                    >
                        <path d="M100 50 L0 50 M100 50 L0 0 M100 50 L0 100" stroke="#b1b1b7"
                            strokeWidth="4" />
                    </marker>
                </defs>
            </svg>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                defaultViewport={defaultViewport}
                fitView
                minZoom={0.2}
                onlyRenderVisibleElements={true}
                proOptions={proOptions}
                attributionPosition="bottom-left"
            >
                <Button variant="outline" size="icon" className='absolute top-2 right-2 z-10 cursor-pointer' onClick={handleAddTable}>
                    <PlusIcon className="size-4" />
                </Button>
                {isMaximized ? (
                    <Button variant="outline" size="icon" className='absolute bottom-2 right-2 z-10 cursor-pointer' onClick={handleMinimize}>
                        <Minimize className="size-4" />
                    </Button>
                ) : (
                    <Button variant="outline" size="icon" className='absolute bottom-2 right-2 z-10 cursor-pointer' onClick={handleMaximize}>
                        <Maximize className="size-4" />
                    </Button>
                )}
                <Background />
            </ReactFlow>
        </div>
    );

}