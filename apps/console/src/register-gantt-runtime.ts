import React from 'react';
import { ComponentRegistry } from '@object-ui/core';

// Register the trusted name before a React page compiles its stable scope.
// Loading its component remains deferred until that page actually uses it.
export const LazyGanttViewRuntime = React.lazy(() =>
  import('@object-ui/plugin-gantt').then(module => ({ default: module.GanttView })),
);

export function registerGanttRuntime(): void {
  ComponentRegistry.registerReactRuntimeComponent('GanttView', LazyGanttViewRuntime, {
    injectDataSource: false,
  });
}

registerGanttRuntime();

const ganttRuntimeHot = (import.meta as ImportMeta & {
  hot?: { dispose(callback: () => void): void };
}).hot;
ganttRuntimeHot?.dispose(() => {
  const registration = ComponentRegistry.getReactRuntimeComponents()
    .find(entry => entry.name === 'GanttView');
  if (registration?.component === LazyGanttViewRuntime) {
    ComponentRegistry.unregisterReactRuntimeComponent('GanttView');
  }
});
