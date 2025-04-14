import { ExecutionContext } from './types';

/**
 * Resolves a value from the execution context based on a path string.
 * Supports dot notation for objects and basic array indexing [n].
 * Examples:
 * - "trigger.customer.name"
 * - "steps.node_123.output.items[0].id"
 *
 * @param path The path string.
 * @param context The execution context containing triggerPayload and stepOutputs.
 * @returns The resolved value, or undefined if the path is invalid.
 */
export const resolveValue = (path: string | undefined | null, context: ExecutionContext): any => {
    if (!path) {
        return undefined;
    }

    const parts = path.split('.');
    let current: any;

    // Determine the starting point (trigger or specific step output)
    if (parts[0] === 'trigger') {
        current = context.triggerPayload;
        parts.shift(); // Remove 'trigger' part
    } else if (parts[0].startsWith('steps[')) {
         // Handle syntax like steps[node_id].property
         const match = parts[0].match(/^steps\[(['"]?)(.*?)\1\]$/); // Match steps['node_id'] or steps["node_id"]
         if (match && match[2]) {
             const stepId = match[2];
              current = context.stepOutputs?.[stepId];
              parts.shift();
         } else {
              console.warn(`Invalid steps path format: ${parts[0]}. Expected steps['node_id'].`);
             return undefined;
         }
    } else if (parts[0].startsWith('steps.')) {
        // Handle syntax like steps.node_id.property (more common)
        const stepId = parts[0].substring(6); // Remove "steps."
        current = context.stepOutputs?.[stepId];
        parts.shift(); // Remove 'steps.node_id' part
    }
     else {
        console.warn(`Invalid path start: ${path}. Must start with 'trigger.' or 'steps.node_id.' or steps['node_id'].`);
        return undefined; // Path must start with trigger or steps
    }


    // Navigate the remaining parts of the path
    for (const part of parts) {
        if (current === null || current === undefined) {
            return undefined; // Cannot navigate further
        }

        // Check for array index notation like "items[0]"
        const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
        if (arrayMatch) {
            const arrayKey = arrayMatch[1];
            const index = parseInt(arrayMatch[2], 10);

            if (Array.isArray(current[arrayKey]) && current[arrayKey].length > index) {
                current = current[arrayKey][index];
            } else {
                // console.warn(`Array index out of bounds or not an array: ${path} at part ${part}`);
                return undefined; // Index out of bounds or property is not an array
            }
        } else {
            // Standard object property access
            if (typeof current === 'object' && part in current) {
                 current = current[part];
            } else {
                // console.warn(`Property not found: ${path} at part ${part}`);
                return undefined; // Property doesn't exist
            }
        }
    }

    return current;
};
