import type { ButtonHTMLAttributes, ReactElement } from 'react';
import { Button as Primitive } from '@honeymelon/ui/components/button';
import { Hint } from '@honeymelon/ui/components/hint';
import { cn } from '@honeymelon/ui/lib/utils';

/**
 * Apply compact sizing to the shared Mira button primitive.
 */
export function Button({
  variant = 'secondary',
  icon = false,
  className,
  title,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: boolean;
}): ReactElement {
  const variants = {
    primary: 'default',
    secondary: 'outline',
    ghost: 'ghost',
    danger: 'destructive',
  } as const;

  const button = (
    <Primitive
      type={type}
      variant={variants[variant]}
      size={icon ? 'icon-lg' : 'lg'}
      className={cn(
        'text-[13px] h-9 gap-2 rounded-md',
        icon ? 'w-9 shrink-0' : 'px-3',
        className,
      )}
      {...props}
    />
  );
  const hint = title ?? (icon ? props['aria-label'] : undefined);

  return hint ? <Hint content={hint}>{button}</Hint> : button;
}
