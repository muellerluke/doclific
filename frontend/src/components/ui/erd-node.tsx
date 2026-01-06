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
    getSmoothStepPath,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { memo, useCallback, useEffect, useState } from "react";
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
import { PlusIcon, Trash2Icon } from 'lucide-react';

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
                setEdges(getEdges().map((edge) => edge.id === props.id ? { ...edge, markerStart: undefined, markerEnd: (sourceHandleId?.endsWith('-l') ? 'from-many' : 'to-many'), data: { type: 'one-to-many' } } : edge));
                break;
            case 'many-to-one':
                setEdges(getEdges().map((edge) => edge.id === props.id ? { ...edge, markerStart: (targetHandleId?.endsWith('-l') ? 'from-many' : 'to-many'), markerEnd: undefined, data: { type: 'many-to-one' } } : edge));
                break;
            case 'many-to-many':
                setEdges(getEdges().map((edge) => edge.id === props.id ? { ...edge, markerStart: (sourceHandleId?.endsWith('-l') ? 'from-many' : 'to-many'), markerEnd: (targetHandleId?.endsWith('-l') ? 'from-many' : 'to-many'), data: { type: 'many-to-many' } } : edge));
                break;
        }
    }

    return (
        <>
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
        </>
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
        onChange(id, { columns: [...columns, { id: crypto.randomUUID(), name: 'New Column', type: 'int', pk: false }], name: 'New Table', onChange });
    };

    const handlePkChange = (colId: string, pk: boolean) => {
        onChange(id, { columns: columns.map((col) => col.id === colId ? { ...col, pk } : col), name, onChange });
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

    return (
        <div className="bg-muted border rounded-md flex flex-col">
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
                <div className='grid grid-cols-[22px_120px_150px_32px] gap-2 px-4 pb-4 items-center relative'>
                    <Label>PK</Label>
                    <Label>Column</Label>
                    <Label>Type</Label>
                </div>
                {columns.map((col, index) => {
                    return (
                        <div
                            key={index}
                            className="grid grid-cols-[22px_120px_150px_32px] gap-2 px-4 mb-4 items-center relative"
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
                            <Checkbox checked={col.pk} onCheckedChange={(checked) => handlePkChange(col.id, checked as boolean)} />
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
                                        <SelectLabel>Monetary Types</SelectLabel>
                                        <SelectItem value="money">money</SelectItem>
                                    </SelectGroup>

                                    <SelectGroup>
                                        <SelectLabel>Character Types</SelectLabel>
                                        <SelectItem value="character">character</SelectItem>
                                        <SelectItem value="varchar">varchar</SelectItem>
                                        <SelectItem value="char">char</SelectItem>
                                        <SelectItem value="text">text</SelectItem>
                                    </SelectGroup>

                                    <SelectGroup>
                                        <SelectLabel>Binary Data Types</SelectLabel>
                                        <SelectItem value="bytea">bytea</SelectItem>
                                    </SelectGroup>

                                    <SelectGroup>
                                        <SelectLabel>Date/Time Types</SelectLabel>
                                        <SelectItem value="date">date</SelectItem>
                                        <SelectItem value="timestamp without time zone">timestamp without time zone</SelectItem>
                                        <SelectItem value="timestamp with time zone">timestamp with time zone</SelectItem>
                                        <SelectItem value="time without time zone">time without time zone</SelectItem>
                                        <SelectItem value="time with time zone">time with time zone</SelectItem>
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
                                        <SelectLabel>Text Search Types</SelectLabel>
                                        <SelectItem value="tsvector">tsvector</SelectItem>
                                        <SelectItem value="tsquery">tsquery</SelectItem>
                                    </SelectGroup>

                                    <SelectGroup>
                                        <SelectLabel>UUID Type</SelectLabel>
                                        <SelectItem value="uuid">uuid</SelectItem>
                                    </SelectGroup>

                                    <SelectGroup>
                                        <SelectLabel>XML Type</SelectLabel>
                                        <SelectItem value="xml">xml</SelectItem>
                                    </SelectGroup>

                                    <SelectGroup>
                                        <SelectLabel>JSON Types</SelectLabel>
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
                                        <SelectLabel>Object Identifier Types</SelectLabel>
                                        <SelectItem value="pg_lsn">pg_lsn</SelectItem>
                                        <SelectItem value="pg_snapshot">pg_snapshot</SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
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
        pk: boolean;
    }[];
    onChange: (nodeId: string, updatedData: TableNodeData) => void;
}

export function ErdNode() {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    const onChange = useCallback((nodeId: string, updatedData: TableNodeData) => {
        setNodes((nds) =>
            nds.map((node) => {
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
            }),
        );
    }, [setNodes]);

    useEffect(() => {
        setNodes([
            {
                id: '2',
                type: 'tableNode',
                data: {
                    name: 'Table Name', columns: [{
                        id: 'a',
                        name: 'Column Name',
                        type: 'int',
                        pk: false,
                    }, {
                        id: 'b',
                        name: 'Column Name',
                        type: 'int',
                        pk: false,
                    }], onChange
                },
                position: { x: 200, y: 100 },
            },
            {
                id: '3',
                type: 'tableNode',
                data: {
                    name: 'Table Name', columns: [{
                        id: 'c',
                        name: 'Column Name',
                        type: 'int',
                        pk: false,
                    }, {
                        id: 'd',
                        name: 'Column Name',
                        type: 'int',
                        pk: false,
                    }], onChange
                },
                position: { x: 400, y: 100 },
            }
        ]);

        setEdges([
            {
                id: 'e2-3',
                source: '2',
                sourceHandle: 'col-a-source-l',
                target: '3',
                targetHandle: 'col-c-target-r',
                markerStart: 'from-one',
                data: { type: 'one-to-one' },
                markerEnd: 'to-one',
            },
        ]);
    }, []);

    const onConnect = useCallback(
        (params: Edge | Connection) => setEdges((eds) => addEdge({ ...params, animated: false }, eds)),
        [setEdges],
    );

    const handleAddTable = useCallback(() => {
        setNodes((nds) => [...nds, { id: crypto.randomUUID(), type: 'tableNode', data: { name: 'New Table', columns: [], onChange }, position: { x: 200, y: 100 } }]);
    }, [setNodes, onChange]);

    return (
        <div className='w-full h-[500px] relative border rounded-md'>
            <svg style={{ position: 'absolute', top: 0, left: 0 }}>
                <defs>
                    <marker
                        id="from-many"
                        viewBox="0 0 100 100"
                        markerHeight={32}
                        markerWidth={32}
                        refX={50}
                        refY={50}
                    >
                        <path d="M100 50 L0 50 M0 50 L100 0 M0 50 L100 100" stroke='#b1b1b7'
                            strokeWidth="3" />
                    </marker>
                </defs>
            </svg>
            <svg style={{ position: 'absolute', top: 0, left: 0 }}>
                <defs>
                    <marker
                        id="to-many"
                        viewBox="0 0 100 100"
                        markerHeight={32}
                        markerWidth={32}
                        refX={50}
                        refY={50}
                    >
                        <path d="M100 50 L0 50 M100 50 L0 0 M100 50 L0 100" stroke="#b1b1b7"
                            strokeWidth="3" />
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
                proOptions={proOptions}
                attributionPosition="bottom-left"
            >
                <Button className='absolute top-4 right-4 z-10 cursor-pointer' onClick={handleAddTable}>
                    <PlusIcon className="size-4" />
                    Add Table
                </Button>
                <Background />
            </ReactFlow>
        </div>
    );

}