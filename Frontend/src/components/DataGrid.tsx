import type { ReactNode } from 'react'

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  align?: 'left' | 'right' | 'center'
  numeric?: boolean
}

export function DataGrid<T extends { id?: number | string }>({
  columns, rows, onRowClick, emptyLabel = 'No records',
}: {
  columns: Column<T>[]
  rows: T[]
  onRowClick?: (row: T) => void
  emptyLabel?: string
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-ink-200">
            {columns.map((c) => (
              <th key={c.key}
                  className={`sticky top-0 whitespace-nowrap bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-500 ${c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left'}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={columns.length} className="py-8 text-center text-ink-400">{emptyLabel}</td></tr>
          )}
          {rows.map((row, i) => (
            <tr key={row.id ?? i}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-ink-100 last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-brand-50/50' : ''}`}>
              {columns.map((c) => (
                <td key={c.key}
                    className={`px-3 py-2 ${c.numeric ? 'mono' : ''} ${c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left'}`}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
