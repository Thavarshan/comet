'use client';

import type { ReactElement, ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip.js';

/**
 * Describe an existing focusable trigger without adding another tab stop.
 * A shared provider supplies the desktop's hover delay and skip interval.
 */
export function Hint({
  children,
  content,
}: {
  children: ReactElement;
  content: ReactNode;
}): ReactElement {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent sideOffset={6} className="break-words">
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
