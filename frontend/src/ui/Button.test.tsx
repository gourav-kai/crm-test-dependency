import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('should render button with text', () => {
    render(<Button>Click me</Button>);

    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
  });

  it('should render with primary variant by default', () => {
    const { container } = render(<Button>Primary</Button>);

    const button = container.querySelector('button');
    expect(button).toHaveClass('bg-blue-600');
  });

  it('should render with secondary variant', () => {
    const { container } = render(
      <Button variant="secondary">Secondary</Button>
    );

    const button = container.querySelector('button');
    expect(button).toHaveClass('bg-gray-200');
  });

  it('should render with danger variant', () => {
    const { container } = render(
      <Button variant="danger">Delete</Button>
    );

    const button = container.querySelector('button');
    expect(button).toHaveClass('bg-red-600');
  });

  it('should render with small size', () => {
    const { container } = render(<Button size="sm">Small</Button>);

    const button = container.querySelector('button');
    expect(button).toHaveClass('px-3');
    expect(button).toHaveClass('text-sm');
  });

  it('should render with medium size by default', () => {
    const { container } = render(<Button>Medium</Button>);

    const button = container.querySelector('button');
    expect(button).toHaveClass('px-4');
    expect(button).toHaveClass('text-base');
  });

  it('should render with large size', () => {
    const { container } = render(<Button size="lg">Large</Button>);

    const button = container.querySelector('button');
    expect(button).toHaveClass('px-6');
    expect(button).toHaveClass('text-lg');
  });

  it('should handle click events', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<Button onClick={onClick}>Click</Button>);

    const button = screen.getByRole('button', { name: /click/i });
    await user.click(button);

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);

    const button = screen.getByRole('button', { name: /disabled/i });
    expect(button).toBeDisabled();
  });

  it('should accept custom className', () => {
    const { container } = render(
      <Button className="custom-class">Custom</Button>
    );

    const button = container.querySelector('button');
    expect(button).toHaveClass('custom-class');
  });
});
