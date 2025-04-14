import { AutomationEdge, AutomationNode } from '@/components/pages/automations/builder/types';
import { Run } from '@prisma/client';

export interface ExecutionContext {
  run: Run;
  automation: {
    id: string;
    userId: string;
    flowDefinition: {
      nodes: AutomationNode[];
      edges: AutomationEdge[];
    };
  };
  triggerPayload: any;
  stepOutputs: Record<string, any>; // Outputs keyed by node ID
}

export type StepOutput = {
  output: any;
  nextStepId?: string | null; // ID of the next step to execute, null if end, undefined if error/waiting
  statusOverride?: Run['status']; // e.g., WAITING
  error?: string; // Error message if execution failed
  contextUpdate?: Record<string, any>; // Data to merge into Run.context
};

export interface ActionHandler {
  (node: AutomationNode, context: ExecutionContext): Promise<StepOutput>;
}
