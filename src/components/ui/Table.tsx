import React from 'react'

type TableProps = {
  children: React.ReactNode
  className?: string
}

export const Table: React.FC<TableProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white dark:bg-[#0b1220] border border-slate-100 dark:border-slate-800/60 rounded-2xl shadow-sm overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left border-collapse">{children}</table>
      </div>
    </div>
  )
}

export const TableHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <thead>
    <tr className={`sticky top-0 z-10 bg-slate-50 dark:bg-[#07121a] text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide ${className}`}>
      {children}
    </tr>
  </thead>
)

export const TableRow: React.FC<{
  children: React.ReactNode
  className?: string
  danger?: boolean
}> = ({ children, className = '', danger = false }) => {
  const base = `odd:bg-slate-50 even:bg-white dark:odd:bg-slate-900/5 dark:even:bg-slate-900/2 hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors ${className}`;
  const dangerCls = 'bg-rose-200/80 dark:bg-rose-900/70 text-rose-900 dark:text-rose-100 border-l-4 border-rose-600 dark:border-rose-400 shadow-sm';
  return (
    <tr className={`${danger ? dangerCls : base}`}>
      {children}
    </tr>
  )
}

export default Table
