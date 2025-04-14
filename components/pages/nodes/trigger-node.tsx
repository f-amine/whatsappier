import React from 'react';
import { Play } from 'lucide-react'; // Or another appropriate icon like Zap
import { cn } from '@/lib/utils';
import { TriggerNodeData } from '../automations/builder/types'; // Adjust path as needed

interface TriggerNodeProps {
    data: TriggerNodeData;
    selected: boolean;
}

export const TriggerNode: React.FC<TriggerNodeProps> = ({ data, selected }) => {
    const IconComponent = data.icon || Play; // Use icon from data or default

    return (
        <div
            className={cn(
                "node-content h-full w-full flex items-center gap-3 px-3 py-2", // Added padding
                selected ? "bg-accent/50" : "bg-background" // Use background, accent for selected
            )}
        >
            {/* Icon */}
            <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded bg-primary/10">
                <IconComponent className="h-4 w-4 text-primary" />
            </div>

            {/* Label */}
            <div className="flex-grow min-w-0">
                <p className="text-sm font-medium truncate text-foreground" title={data.label}>
                    {data.label || 'Trigger'}
                </p>
                 {/* Optional: Display trigger type if needed */}
                 <p className="text-xs text-muted-foreground truncate" title={data.type}>
                     Type: {data.type}
                 </p>
            </div>
        </div>
    );
};
