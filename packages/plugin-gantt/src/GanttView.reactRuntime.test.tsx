import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ComponentRegistry } from '@object-ui/core';
import { GanttView, type GanttTask, type GanttViewProps } from './index';

describe('GanttView React Page runtime registration', () => {
  it('registers the existing timeline without data-source injection and keeps its read-only contract', () => {
    const registration = ComponentRegistry.getReactRuntimeComponents()
      .find(entry => entry.name === 'GanttView');
    expect(registration?.component).toBe(GanttView);
    expect(registration?.injectDataSource).toBe(false);

    const RuntimeGanttView = registration!.component as React.ComponentType<GanttViewProps>;
    const tasks: GanttTask[] = [{
      id: 'task-1',
      title: 'Read-only task',
      start: new Date('2026-10-05T00:00:00.000Z'),
      end: new Date('2026-10-08T00:00:00.000Z'),
      progress: 40,
    }];
    const onTaskUpdate = vi.fn();
    const onTaskDelete = vi.fn();
    const { getByTestId, queryByTestId } = render(
      <div style={{ width: 1000, height: 520 }}>
        <RuntimeGanttView
          tasks={tasks}
          readOnly
          onTaskUpdate={onTaskUpdate}
          onTaskDelete={onTaskDelete}
        />
      </div>,
    );

    expect(getByTestId('gantt-toolbar-period')).toBeTruthy();
    expect(getByTestId('gantt-readonly-badge')).toBeTruthy();
    expect(getByTestId('gantt-task-bar-task-1')).toBeTruthy();
    expect(queryByTestId('gantt-task-resize-left-task-1')).toBeNull();
    expect(queryByTestId('gantt-task-resize-right-task-1')).toBeNull();
    expect(queryByTestId('gantt-progress-handle-task-1')).toBeNull();

    fireEvent.keyDown(getByTestId('gantt-body'), { key: 'Delete' });
    expect(onTaskUpdate).not.toHaveBeenCalled();
    expect(onTaskDelete).not.toHaveBeenCalled();
  });

  it('can omit the timeline toolbar without removing tasks or host click navigation', () => {
    const registration = ComponentRegistry.getReactRuntimeComponents()
      .find(entry => entry.name === 'GanttView');
    const RuntimeGanttView = registration!.component as React.ComponentType<GanttViewProps>;
    const task: GanttTask = {
      id: 'task-2',
      title: 'Host-owned controls',
      start: new Date('2026-10-05T00:00:00.000Z'),
      end: new Date('2026-10-08T00:00:00.000Z'),
      progress: 10,
    };
    const onTaskClick = vi.fn();
    const { getByTestId, queryByTestId } = render(
      <div style={{ width: 1000, height: 520 }}>
        <RuntimeGanttView tasks={[task]} readOnly showToolbar={false} onTaskClick={onTaskClick} />
      </div>,
    );

    expect(queryByTestId('gantt-toolbar-period')).toBeNull();
    expect(queryByTestId('gantt-toolbar-prev-period')).toBeNull();
    expect(getByTestId('gantt-task-bar-task-2')).toBeTruthy();
    fireEvent.contextMenu(getByTestId('gantt-task-bar-task-2'));
    fireEvent.click(getByTestId('gantt-context-menu-view'));
    expect(onTaskClick).toHaveBeenCalledTimes(1);
    expect(onTaskClick.mock.calls[0][0].id).toBe('task-2');
  });
});
