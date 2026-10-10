/**
 * ObjectUI
 * Copyright (c) 2024-present ObjectStack Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ComponentRegistry } from '@object-ui/core';
import type { TreeViewSchema, TreeNode } from '@object-ui/types';
import { ChevronRight, ChevronDown, Folder, File, FolderOpen, FolderTree } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/utils';
import { useDataScope } from '@object-ui/react';

const TreeNodeComponent = ({ 
  node, 
  onNodeClick,
  selectedId
}: { 
  node: TreeNode; 
  onNodeClick?: (node: TreeNode) => void;
  selectedId?: string;
}) => {
  const [isOpen, setIsOpen] = useState(node.defaultExpanded ?? false);
  const hasChildren = node.children && node.children.length > 0;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleClick = () => {
    if (onNodeClick) {
      onNodeClick(node);
    }
  };

  return (
    <div className="relative">
      <div
        role="treeitem"
        tabIndex={0}
        aria-selected={selectedId === node.id}
        aria-expanded={hasChildren ? isOpen : undefined}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleClick();
          } else if (event.key === 'ArrowRight' && hasChildren) {
            event.preventDefault();
            setIsOpen(true);
          } else if (event.key === 'ArrowLeft' && hasChildren) {
            event.preventDefault();
            setIsOpen(false);
          }
        }}
        className={cn(
          'group flex min-w-0 items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'hover:bg-accent hover:text-accent-foreground',
          selectedId === node.id && 'bg-primary/10 text-primary font-medium'
        )}
        onClick={handleClick}
      >
        {hasChildren ? (
          <button type="button"
            onClick={handleToggle}
            aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${node.label}`}
            aria-expanded={isOpen}
            className="mr-2 p-0.5 h-5 w-5 flex items-center justify-center rounded-sm hover:bg-muted text-muted-foreground transition-colors"
          >
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <span className="mr-2 w-5 flex justify-center">
             <span aria-hidden="true" />
          </span>
        )}
        
        {node.icon === 'folder' || hasChildren ? (
          isOpen ? 
            <FolderOpen className="h-4 w-4 mr-2 text-primary" /> : 
            <Folder className="h-4 w-4 mr-2 text-muted-foreground group-hover:text-primary transition-colors" />
        ) : (
          <File className="h-4 w-4 mr-2 text-muted-foreground group-hover:text-primary transition-colors" />
        )}
        
        <span className={cn(
            "min-w-0 flex-1 truncate text-sm transition-colors",
            selectedId === node.id ? "font-medium text-primary" : "text-foreground"
        )}>
            {node.label}
        </span>
        {typeof node.data?.count === 'number' && Number.isFinite(node.data.count) && (
          <span className="ml-auto shrink-0 text-xs font-normal tabular-nums text-muted-foreground">{node.data.count}</span>
        )}
      </div>

      {hasChildren && isOpen && (
        <div role="group" className="relative ml-4 pl-2 border-l border-border/50">
          {node.children!.map((child) => (
            <TreeNodeComponent
              key={child.id}
              node={child}
              onNodeClick={onNodeClick}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

ComponentRegistry.register('tree-view',
  ({ schema, className, ...props }: { schema: TreeViewSchema; className?: string; [key: string]: any }) => {
    const [selectedId, setSelectedId] = useState<string | undefined>(schema.defaultSelectedIds?.[0]);
    const activeId = schema.selectedIds !== undefined ? schema.selectedIds[0] : selectedId;
    const handleNodeClick = (node: TreeNode) => {
      if (node.selectable !== false) setSelectedId(node.id);
      if (schema.onNodeClick) {
        schema.onNodeClick(node);
      }
    };

    // Support data binding
    const boundData = useDataScope(schema.bind);
    const rawNodes = boundData || schema.nodes || [];
    const nodes = Array.isArray(rawNodes) ? rawNodes : [];

    return (
      <div className={cn(
          'relative flex min-w-0 flex-col overflow-hidden border border-border rounded-xl bg-card text-card-foreground shadow-sm',
          className
        )} 
        {...props}
      >
        {schema.title && (
          <div className="flex items-center gap-2 px-3 py-3 border-b border-border">
            <FolderTree className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <h3 className="text-sm font-semibold">{schema.title}</h3>
          </div>
        )}
        <div role="tree" aria-label={schema.title} className="min-h-0 flex-1 overflow-y-auto space-y-1 p-1.5">
          {nodes.map((node: TreeNode) => (
            <TreeNodeComponent
              key={node.id}
              node={node}
              onNodeClick={handleNodeClick}
              selectedId={activeId}
            />
          ))}
        </div>
      </div>
    );
  },
  {
    namespace: 'ui',
    label: 'Tree View',
    inputs: [
      { name: 'title', type: 'string' },
      { 
        name: 'nodes', 
        type: 'array', 
        description: 'Array of { id, label, icon, children, data }'
      },
      { name: 'className', type: 'string' }
    ],
    defaultProps: {
      title: 'File Explorer',
      nodes: [
        {
          id: '1',
          label: 'Documents',
          icon: 'folder',
          children: [
            { id: '1-1', label: 'Resume.pdf', icon: 'file' },
            { id: '1-2', label: 'Cover Letter.docx', icon: 'file' }
          ]
        },
        {
          id: '2',
          label: 'Photos',
          icon: 'folder',
          children: [
            { id: '2-1', label: 'Vacation', icon: 'folder', children: [
              { id: '2-1-1', label: 'Beach.jpg', icon: 'file' }
            ]},
            { id: '2-2', label: 'Family.jpg', icon: 'file' }
          ]
        },
        {
          id: '3',
          label: 'README.md',
          icon: 'file'
        }
      ]
    }
  }
);
