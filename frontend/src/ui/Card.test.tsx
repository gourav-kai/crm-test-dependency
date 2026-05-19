import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  it('should render card with children', () => {
    render(<Card>Card Content</Card>);

    expect(screen.getByText('Card Content')).toBeInTheDocument();
  });

  it('should have card styling classes', () => {
    const { container } = render(<Card>Content</Card>);

    const card = container.querySelector('div');
    expect(card).toHaveClass('rounded-lg');
    expect(card).toHaveClass('border');
    expect(card).toHaveClass('border-gray-200');
    expect(card).toHaveClass('bg-white');
    expect(card).toHaveClass('p-6');
    expect(card).toHaveClass('shadow-sm');
  });

  it('should render with custom className', () => {
    const { container } = render(
      <Card className="custom-card">Content</Card>
    );

    const card = container.querySelector('div');
    expect(card).toHaveClass('custom-card');
    // Should still have default classes
    expect(card).toHaveClass('rounded-lg');
  });

  it('should accept HTML attributes', () => {
    const { container } = render(
      <Card data-testid="test-card" id="my-card">
        Content
      </Card>
    );

    const card = container.querySelector('[data-testid="test-card"]');
    expect(card).toHaveAttribute('id', 'my-card');
  });

  it('should render complex children', () => {
    render(
      <Card>
        <h2>Title</h2>
        <p>Description</p>
      </Card>
    );

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
  });
});
