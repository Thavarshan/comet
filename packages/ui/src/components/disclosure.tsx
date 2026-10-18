'use client';

import type { ReactElement, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { Button } from './button.js';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './collapsible.js';

/**
 * Keep expandable settings and diagnostics keyboard accessible and consistent.
 */
export function Disclosure({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}): ReactElement {
  return (
    <Collapsible className={className}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="group h-8 justify-start gap-1 px-1 text-xs"
        >
          <ChevronRight className="size-3 transition-transform group-data-[state=open]:rotate-90" />
          {label}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}
