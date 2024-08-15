import { cn } from '../../src/lib/utils';

describe('cn utility function', () => {
  it('should merge multiple class names into a single string', () => {
    const result = cn('class1', 'class2', 'class3');
    expect(result).toBe('class1 class2 class3');
  });

  it('should handle conditional class names (truthy/falsy values)', () => {
    const result = cn('class1', false && 'class2', true && 'class3', null, undefined, 'class4');
    expect(result).toBe('class1 class3 class4');
  });

  it('should handle arrays of class names', () => {
    const result = cn('class1', ['class2', 'class3'], 'class4');
    expect(result).toBe('class1 class2 class3 class4');
  });

  it('should deduplicate class names', () => {
    const result = cn('class1', 'class1', 'class2', 'class2');
    expect(result).toBe('class1 class2');
  });

  it('should merge Tailwind classes correctly with conflicting styles', () => {
    const result = cn('text-lg', 'text-sm', 'font-bold', 'font-semibold');
    expect(result).toBe('text-sm font-semibold'); // 'text-sm' should override 'text-lg', 'font-semibold' should override 'font-bold'
  });

  it('should return an empty string when no classes are provided', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('should handle object syntax for conditional classes', () => {
    const result = cn('class1', { 'class2': true, 'class3': false }, 'class4');
    expect(result).toBe('class1 class2 class4');
  });
});
