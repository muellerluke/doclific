import * as Icons from 'lucide-react';
import type { LucideProps } from 'lucide-react';

export type LucideIconName = keyof typeof Icons;

export function DynamicIcon({
    name,
    ...props
}: { name: LucideIconName, className?: string } & LucideProps) {
    const Icon = (Icons[name] as React.ComponentType<LucideProps>) || Icons.FileIcon;
    return <Icon {...props} size={props.size || 16} />;
}
