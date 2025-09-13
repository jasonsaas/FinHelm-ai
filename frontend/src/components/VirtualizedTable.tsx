import React, { useMemo, useState, useCallback } from 'react';
import { ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';

interface Column<T> {
  key: keyof T;
  header: string;
  width?: string | number;
  sortable?: boolean;
  render?: (value: any, item: T, index: number) => React.ReactNode;
}

interface VirtualizedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  itemHeight?: number;
  visibleRows?: number;
  className?: string;
  onRowClick?: (item: T, index: number) => void;
  sortable?: boolean;
  searchable?: boolean;
  pageSize?: number;
}

type SortConfig<T> = {
  key: keyof T;
  direction: 'asc' | 'desc';
} | null;

export function VirtualizedTable<T extends Record<string, any>>({
  data,
  columns,
  itemHeight = 48,
  visibleRows = 10,
  className = '',
  onRowClick,
  sortable = true,
  searchable = true,
  pageSize = 50
}: VirtualizedTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig<T>>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    
    return data.filter(item =>
      Object.values(item).some(value =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [data, searchTerm]);

  // Sort filtered data
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue === bValue) return 0;
      
      const comparison = aValue < bValue ? -1 : 1;
      return sortConfig.direction === 'desc' ? comparison * -1 : comparison;
    });
  }, [filteredData, sortConfig]);

  // Calculate visible items based on scroll position
  const { visibleItems, totalHeight } = useMemo(() => {
    const containerHeight = visibleRows * itemHeight;
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(startIndex + visibleRows + 1, sortedData.length);
    
    return {
      visibleItems: sortedData.slice(startIndex, endIndex).map((item, index) => ({
        item,
        index: startIndex + index,
        top: (startIndex + index) * itemHeight
      })),
      totalHeight: sortedData.length * itemHeight
    };
  }, [sortedData, scrollTop, itemHeight, visibleRows]);

  const handleSort = useCallback((key: keyof T) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return current.direction === 'asc' 
          ? { key, direction: 'desc' }
          : null;
      }
      return { key, direction: 'asc' };
    });
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const renderSortIcon = (columnKey: keyof T) => {
    if (sortConfig?.key === columnKey) {
      return sortConfig.direction === 'asc' 
        ? <ChevronUp className="w-4 h-4" />
        : <ChevronDown className="w-4 h-4" />;
    }
    return <ArrowUpDown className="w-4 h-4 opacity-50" />;
  };

  return (
    <div className={`virtual-table ${className}`}>
      {searchable && (
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search table..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input w-full max-w-sm"
          />
        </div>
      )}
      
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="flex">
            {columns.map((column) => (
              <div
                key={String(column.key)}
                className={`px-4 py-3 font-medium text-gray-900 text-sm ${
                  sortable && column.sortable !== false 
                    ? 'cursor-pointer hover:bg-gray-100 select-none' 
                    : ''
                }`}
                style={{ width: column.width || `${100 / columns.length}%` }}
                onClick={sortable && column.sortable !== false 
                  ? () => handleSort(column.key) 
                  : undefined
                }
              >
                <div className="flex items-center justify-between">
                  <span>{column.header}</span>
                  {sortable && column.sortable !== false && renderSortIcon(column.key)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Virtual scrolling container */}
        <div
          className="relative overflow-auto bg-white"
          style={{ height: `${Math.min(visibleRows * itemHeight, totalHeight)}px` }}
          onScroll={handleScroll}
        >
          <div style={{ height: `${totalHeight}px` }}>
            {visibleItems.map(({ item, index, top }) => (
              <div
                key={index}
                className={`absolute left-0 right-0 flex border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
                style={{ 
                  top: `${top}px`, 
                  height: `${itemHeight}px`,
                  lineHeight: `${itemHeight}px`
                }}
                onClick={onRowClick ? () => onRowClick(item, index) : undefined}
              >
                {columns.map((column) => (
                  <div
                    key={String(column.key)}
                    className="px-4 py-2 text-sm text-gray-900 overflow-hidden"
                    style={{ width: column.width || `${100 / columns.length}%` }}
                  >
                    {column.render 
                      ? column.render(item[column.key], item, index)
                      : String(item[column.key] || '')
                    }
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Footer with statistics */}
        <div className="bg-gray-50 px-4 py-2 text-xs text-gray-500 border-t border-gray-200">
          Showing {visibleItems.length} of {filteredData.length} items
          {searchTerm && filteredData.length < data.length && 
            ` (filtered from ${data.length} total)`
          }
        </div>
      </div>
    </div>
  );
}

export default VirtualizedTable;