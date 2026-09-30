/**
 * Dashboard dataset KPIs keep their declared icon/help metadata on the native
 * DatasetWidget route, which owns the real query and drill interaction.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nProvider } from '@object-ui/i18n';
import type { DashboardComponentSchema } from '@object-ui/types';

const captured = vi.hoisted(() => ({ widget: null as any }));
vi.mock('../DatasetWidget', () => ({
  DatasetWidget: ({ widget }: { widget: unknown }) => {
    captured.widget = widget;
    return <div data-testid="dataset-widget-route" />;
  },
}));

import { DashboardRenderer } from '../DashboardRenderer';

afterEach(cleanup);
beforeEach(() => {
  captured.widget = null;
});

function dashboard(widget: Record<string, unknown>): DashboardComponentSchema {
  return {
    type: 'dashboard',
    name: 'component_preview_purchase_dashboard',
    columns: 24,
    widgets: [widget],
  } as unknown as DashboardComponentSchema;
}

function renderDashboard(widget: Record<string, unknown>) {
  return render(
    <I18nProvider config={{ defaultLanguage: 'en', detectBrowserLanguage: false, resources: {} }}>
      <React.Suspense fallback={null}>
        <DashboardRenderer schema={dashboard(widget)} />
      </React.Suspense>
    </I18nProvider>,
  );
}

describe('DashboardRenderer — dataset KPI chrome uses existing widget metadata', () => {
  it('renders icon and help from options.icon and widget.description on DatasetWidget cards', () => {
    renderDashboard({
      id: 'fixture_request_count',
      type: 'metric',
      title: 'Fixture requests',
      description: 'Count of fixture requests matching the selected period and status.',
      dataset: 'component_preview_purchase_metrics',
      dimensions: [],
      values: ['request_count'],
      colorVariant: 'success',
      options: { icon: 'users', drillDown: { enabled: true } },
    });

    expect(screen.getByTestId('dataset-widget-route')).toBeInTheDocument();
    expect(captured.widget.dataset).toBe('component_preview_purchase_metrics');
    expect(captured.widget.options.drillDown).toEqual({ enabled: true });
    expect(document.querySelector('[data-dashboard-metric-card]')).not.toBeNull();
    expect(document.querySelector('[data-dashboard-metric-icon]')).not.toBeNull();
    expect(screen.getByRole('button', {
      name: 'Count of fixture requests matching the selected period and status.',
    })).toBeInTheDocument();
    expect(screen.getByText('Count of fixture requests matching the selected period and status.')).toBeInTheDocument();
  });

  it('keeps the default header when no icon or help text is declared', () => {
    renderDashboard({
      id: 'fixture_request_count',
      type: 'metric',
      title: 'Fixture requests',
      dataset: 'component_preview_purchase_metrics',
      dimensions: [],
      values: ['request_count'],
    });

    expect(screen.getByText('Fixture requests')).toBeInTheDocument();
    expect(document.querySelector('[data-dashboard-metric-icon]')).toBeNull();
    expect(document.querySelector('[data-dashboard-metric-help]')).toBeNull();
  });

  it('keeps declared metric help available when the optional title is absent', () => {
    renderDashboard({
      id: 'fixture_request_count',
      type: 'metric',
      description: 'Count of fixture requests matching the selected period and status.',
      dataset: 'component_preview_purchase_metrics',
      dimensions: [],
      values: ['request_count'],
    });

    expect(screen.getByTestId('dataset-widget-route')).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'Count of fixture requests matching the selected period and status.',
    })).toBeInTheDocument();
  });
});
