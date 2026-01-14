/**
 * Collapsible component - Standard shadcn/ui collapsible
 *
 * A component that can be expanded or collapsed to show/hide content.
 * Built on Radix UI Collapsible primitive.
 *
 * @example
 * ```tsx
 * import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
 *
 * <Collapsible>
 *   <CollapsibleTrigger>Click to expand</CollapsibleTrigger>
 *   <CollapsibleContent>
 *     Hidden content goes here
 *   </CollapsibleContent>
 * </Collapsible>
 * ```
 */

"use client";

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";

const Collapsible = CollapsiblePrimitive.Root;

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger;

const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent;

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
