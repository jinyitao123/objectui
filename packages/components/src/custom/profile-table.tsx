/** Profile-aware table wrappers; sync-owned Shadcn primitives stay unchanged. */
import * as React from 'react';
import { Table as UiTable, TableHeader as UiTableHeader, TableBody as UiTableBody, TableRow as UiTableRow, TableHead as UiTableHead, TableCell as UiTableCell } from '../ui/table';
import { TableHorizontalScrollbar } from './table-controls';
import { cn } from '../lib/utils';

export const Table = React.forwardRef<HTMLTableElement, React.ComponentPropsWithoutRef<typeof UiTable>>(({ className, containerClassName, ...props }, ref) => {
  const viewport = React.useRef<HTMLDivElement | null>(null);
  const ownsScroll = !containerClassName?.includes('overflow-visible');
  const setTableRef = React.useCallback((table: HTMLTableElement | null) => {
    viewport.current = table?.parentElement as HTMLDivElement | null;
    if (typeof ref === 'function') ref(table);
    else if (ref) ref.current = table;
  }, [ref]);
  const table = <UiTable {...props} data-slot="table" ref={setTableRef} className={cn('text-[length:var(--ui-table-font-size,0.875rem)]', className)} containerClassName={cn('min-w-0 data-[table-scrollbar-owner=custom]:overflow-x-hidden [&::-webkit-scrollbar]:h-0', containerClassName)} />;
  if (!ownsScroll) return table;
  return <div className="relative w-full min-w-0">{table}<TableHorizontalScrollbar viewportRef={viewport} /></div>;
});
Table.displayName = 'Table';
export const TableHeader = React.forwardRef<HTMLTableSectionElement, React.ComponentPropsWithoutRef<typeof UiTableHeader>>((props, ref) => <UiTableHeader data-slot="table-header" {...props} ref={ref} />);
TableHeader.displayName = 'TableHeader';
export const TableBody = React.forwardRef<HTMLTableSectionElement, React.ComponentPropsWithoutRef<typeof UiTableBody>>((props, ref) => <UiTableBody data-slot="table-body" {...props} ref={ref} />);
TableBody.displayName = 'TableBody';
export const TableRow = React.forwardRef<HTMLTableRowElement, React.ComponentPropsWithoutRef<typeof UiTableRow>>((props, ref) => <UiTableRow data-slot="table-row" {...props} ref={ref} />);
TableRow.displayName = 'TableRow';
export const TableHead = React.forwardRef<HTMLTableCellElement, React.ComponentPropsWithoutRef<typeof UiTableHead>>(({ className, ...props }, ref) => <UiTableHead data-slot="table-head" {...props} ref={ref} className={cn("relative h-[var(--ui-table-header-height,3rem)] px-[var(--ui-table-header-padding-x,var(--ui-table-cell-padding-x,1rem))] py-[var(--ui-table-header-padding-y,0px)] text-left align-middle text-[length:var(--ui-table-header-font-size,0.875rem)] leading-[var(--ui-table-header-line-height,1.25rem)] font-[weight:var(--ui-table-header-font-weight,500)] tracking-[var(--ui-table-header-letter-spacing,normal)] text-[color:var(--ui-table-header-color,hsl(var(--muted-foreground)))] bg-[var(--ui-table-header-background,transparent)] [&:has([role=checkbox])]:pr-0 [&:not(:last-child):not(:has([role=checkbox],.cursor-col-resize))]:after:absolute [&:not(:last-child):not(:has([role=checkbox],.cursor-col-resize))]:after:right-0 [&:not(:last-child):not(:has([role=checkbox],.cursor-col-resize))]:after:top-1/2 [&:not(:last-child):not(:has([role=checkbox],.cursor-col-resize))]:after:h-5 [&:not(:last-child):not(:has([role=checkbox],.cursor-col-resize))]:after:w-px [&:not(:last-child):not(:has([role=checkbox],.cursor-col-resize))]:after:-translate-y-1/2 [&:not(:last-child):not(:has([role=checkbox],.cursor-col-resize))]:after:bg-border [&:not(:last-child):not(:has([role=checkbox],.cursor-col-resize))]:after:content-[''] [&:not(:last-child):not(:has([role=checkbox],.cursor-col-resize))]:after:pointer-events-none", className)} />);
TableHead.displayName = 'TableHead';
export const TableCell = React.forwardRef<HTMLTableCellElement, React.ComponentPropsWithoutRef<typeof UiTableCell>>(({ className, ...props }, ref) => <UiTableCell data-slot="table-cell" {...props} ref={ref} className={cn('px-[var(--ui-table-cell-padding-x,1rem)] py-[var(--ui-table-cell-padding-y,1rem)] align-middle text-[length:var(--ui-table-font-size,inherit)] leading-[var(--ui-table-cell-line-height,inherit)] border-b border-border/40 [&:has([role=checkbox])]:pr-0', className)} />);
TableCell.displayName = 'TableCell';
export { TableCaption, TableFooter } from '../ui/table';
