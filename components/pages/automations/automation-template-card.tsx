'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AutomationTemplateDefinition } from '@/types/automation-templates';
import { cn } from '@/lib/utils';

interface AutomationTemplateCardProps {
  template: AutomationTemplateDefinition;
  onClick: () => void;
  isSelected: boolean;
}

export const AutomationTemplateCard: React.FC<AutomationTemplateCardProps> = ({ template, onClick, isSelected }) => {
  const Icon = template.icon;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md hover:border-primary",
        isSelected ? "border-primary ring-2 ring-primary ring-offset-2" : "border"
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <CardTitle className="text-base">{template.name}</CardTitle>
          <CardDescription className="text-xs mt-1 line-clamp-2">{template.description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-2 pb-4">
         {/* Optional: Add tags or category */}
         <span className="text-xs px-2 py-0.5 bg-secondary rounded-full text-secondary-foreground">{template.category}</span>
      </CardContent>
    </Card>
  );
};
