import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage: string;
  loading?: boolean;
}

export function DataTable<T>({ columns, rows, rowKey, onRowClick, emptyMessage, loading }: DataTableProps<T>) {
  return (
    <div className="bg-pure-white border border-ash rounded-ed overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-parchment border-b border-ash">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-5 py-3 text-ed-eyebrow uppercase text-graphite font-medium whitespace-nowrap ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={columns.length} className="px-5 py-12 text-center">
                  <span className="inline-block w-5 h-5 border-2 border-graphite border-t-transparent rounded-full animate-spin" aria-label="Loading" />
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-5 py-12 text-center text-ed-body-sm text-graphite">
                  {emptyMessage}
                </td>
              </tr>
            )}
            {!loading && rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-t border-ash transition-colors ${
                  onRowClick ? 'cursor-pointer hover:bg-mist' : ''
                }`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-5 py-3.5 text-ed-body-sm text-off-black-ink ${col.className || ''}`}>
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
