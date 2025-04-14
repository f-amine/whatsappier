import React from 'react';
import { Cog } from 'lucide-react'; // Default action icon
import { cn } from '@/lib/utils';
import { ActionNodeData } from '../automations/builder/types'; // Adjust path as needed

interface ActionNodeProps {
    data: ActionNodeData;
    selected: boolean;
    nodeId: string; // Pass nodeId for context if needed
}

export const ActionNode: React.FC<ActionNodeProps> = ({ data, selected, nodeId }) => {
    const IconComponent = data.icon || Cog; // Use icon from data or default

    return (
        <div
            className={cn(
                "node-content h-full w-full flex items-center gap-3 px-3 py-2", // Added padding
                selected ? "bg-accent/50" : "bg-background" // Use background, accent for selected
            )}
        >
            {/* Icon */}
            <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded bg-secondary/20">
                <IconComponent className="h-4 w-4 text-secondary-foreground" />
            </div>

            {/* Label and Type */}
            <div className="flex-grow min-w-0">
                <p className="text-sm font-medium truncate text-foreground" title={data.label}>
                    {data.label || 'Action Step'}
                </p>
                <p className="text-xs text-muted-foreground truncate" title={data.type}>
                    Type: {data.type}
                </p>
            </div>
        </div>
    );
};
