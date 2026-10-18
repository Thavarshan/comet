'use client';

import type * as React from 'react';
import { Collapsible as CollapsiblePrimitive } from 'radix-ui';

/**
 * Render the shared Mira collapsible primitive.
 */
function Collapsible({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root>): React.ReactElement {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

/**
 * Render the shared Mira collapsible trigger primitive.
 */
function CollapsibleTrigger({
  ...props
}: React.ComponentProps<
  typeof CollapsiblePrimitive.CollapsibleTrigger
>): React.ReactElement {
  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      data-slot="collapsible-trigger"
      {...props}
    />
  );
}

/**
 * Render the shared Mira collapsible content primitive.
 */
function CollapsibleContent({
  ...props
}: React.ComponentProps<
  typeof CollapsiblePrimitive.CollapsibleContent
>): React.ReactElement {
  return (
    <CollapsiblePrimitive.CollapsibleContent
      data-slot="collapsible-content"
      {...props}
    />
  );
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
