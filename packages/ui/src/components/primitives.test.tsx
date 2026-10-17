import { expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { render, screen } from '@testing-library/react';
import { Button } from './button';
import { Progress } from './progress';

it('renders independently of Electron and preserves native button semantics', () => {
  const html = renderToString(<Button disabled>Convert</Button>);
  expect(html).toContain('disabled');
  expect(html).toContain('Convert');
});

it('exposes actual progress to assistive technology', () => {
  render(<Progress aria-label="Conversion" value={42} />);
  expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe(
    '42',
  );
});
