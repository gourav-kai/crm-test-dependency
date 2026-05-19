import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  it('should render without crashing', () => {
    const { container } = render(<App />);
    expect(container).toBeTruthy();
  });

  it('should render with router provider', () => {
    const { container } = render(<App />);
    // Should contain the main app structure
    expect(container.querySelector('nav')).toBeInTheDocument();
  });
});
