import React, { Suspense } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { ComponentRegistry } from '@object-ui/core';
import { AdapterCtx, SchemaRenderer } from '@object-ui/react';
import '@object-ui/components';
import { LazyGanttViewRuntime, registerGanttRuntime } from './register-gantt-runtime';

describe('Console cold React-page GanttView scope', () => {
  it('pre-registers a lazy, adapter-free identity and supports repeated bootstrap', () => {
    registerGanttRuntime();
    registerGanttRuntime();
    const registration = ComponentRegistry.getReactRuntimeComponents().find(entry => entry.name === 'GanttView');
    expect(registration?.component).toBe(LazyGanttViewRuntime);
    expect(registration?.injectDataSource).toBe(false);
  });

  it('renders a standalone read-only timeline without visiting an object-gantt route first', async () => {
    const adapter = { find: async () => [] } as any;
    render(
      <AdapterCtx.Provider value={adapter}>
        <Suspense fallback={<div>Loading timeline</div>}>
          <SchemaRenderer schema={{
            type: 'home', kind: 'react', name: 'cold_gantt_page',
            source: `export default function App(){const [opened,setOpened]=React.useState('');return <><output aria-label="Opened task">{opened}</output><GanttView tasks={[{id:'cold-task',title:'Cold task',start:new Date(2026,9,4),end:new Date(2026,9,7),progress:0}]} readOnly showToolbar={false} onTaskClick={task=>setOpened(task.title)}/></>}`,
          }} />
        </Suspense>
      </AdapterCtx.Provider>,
    );
    const bar = await screen.findByTestId('gantt-task-bar-cold-task');
    expect(screen.queryByTestId('gantt-toolbar-period')).not.toBeInTheDocument();
    expect(screen.queryByTestId('gantt-task-resize-left-cold-task')).not.toBeInTheDocument();
    fireEvent.contextMenu(bar);
    fireEvent.click(screen.getByTestId('gantt-context-menu-view'));
    expect(screen.getByLabelText('Opened task')).toHaveTextContent('Cold task');
    expect(ComponentRegistry.getReactRuntimeComponents().filter(entry => entry.name === 'GanttView')).toHaveLength(1);
  });
});
