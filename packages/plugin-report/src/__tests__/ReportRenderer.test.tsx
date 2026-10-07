/**
 * ObjectUI
 * Copyright (c) 2024-present ObjectStack Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LegacyReportRenderer as ReportRenderer } from '../LegacyReportRenderer';
import { ComponentRegistry } from '@object-ui/core';

// Mock ComponentRegistry
// Keep all public registration APIs used by eagerly imported renderers.
vi.spyOn(ComponentRegistry, 'get');

describe('ReportRenderer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should resolve specific chart component if registered', () => {
    const MockPieChart = () => <div>Pie Chart Mock</div>;
    (ComponentRegistry.get as any).mockImplementation((type: string) => {
        if (type === 'pie-chart') return MockPieChart;
        return null;
    });

    const schema: any = {
        type: 'report',
        chart: { type: 'pie-chart' }
    };

    render(<ReportRenderer schema={schema} />);
    expect(screen.getByText('Pie Chart Mock')).toBeInTheDocument();
  });

  it('should fallback to generic chart component if specific type not registered', () => {
     const MockGenericChart = () => <div>Generic Chart Mock</div>;
     (ComponentRegistry.get as any).mockImplementation((type: string) => {
         if (type === 'chart') return MockGenericChart;
         return null;
     });
 
     const schema: any = {
         type: 'report',
         chart: { type: 'fancy-line-chart' } 
     };
 
     render(<ReportRenderer schema={schema} />);
     expect(screen.getByText('Generic Chart Mock')).toBeInTheDocument();
     // Should have tried to get fancy-line-chart first
     expect(ComponentRegistry.get).toHaveBeenCalledWith('fancy-line-chart');
     expect(ComponentRegistry.get).toHaveBeenCalledWith('chart');
  });

  it('should show error if neither specific nor generic chart component found', () => {
    (ComponentRegistry.get as any).mockReturnValue(null);

    const schema: any = {
        type: 'report',
        chart: { type: 'unknown-chart' }
    };

    render(<ReportRenderer schema={schema} />);
    expect(screen.getByText(/Unknown component type: unknown-chart/)).toBeInTheDocument();
  });
});
