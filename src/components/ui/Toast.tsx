import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toast } = useApp();

  if (!toast.type) return null;

  const getToastStyle = () => {
    switch (toast.type) {
      case 'success':
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
          border: 'border-emerald-500/20 dark:border-emerald-550/30',
          bg: 'bg-white dark:bg-slate-900',
          shadow: 'shadow-[0_8px_30px_rgb(16,185,129,0.15)]'
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-5 h-5 text-rose-500" />,
          border: 'border-rose-500/20 dark:border-rose-500/30',
          bg: 'bg-white dark:bg-slate-900',
          shadow: 'shadow-[0_8px_30px_rgb(244,63,94,0.15)]'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
          border: 'border-amber-500/20 dark:border-amber-500/30',
          bg: 'bg-white dark:bg-slate-900',
          shadow: 'shadow-[0_8px_30px_rgb(245,158,11,0.15)]'
        };
      case 'info':
      default:
        return {
          icon: <Info className="w-5 h-5 text-blue-500" />,
          border: 'border-blue-500/20 dark:border-blue-500/30',
          bg: 'bg-white dark:bg-slate-900',
          shadow: 'shadow-[0_8px_30px_rgb(59,130,246,0.15)]'
        };
    }
  };

  const styles = getToastStyle();

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce-short">
      <div className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border ${styles.border} ${styles.bg} ${styles.shadow} max-w-sm backdrop-blur-md`}>
        <div className="flex-shrink-0">{styles.icon}</div>
        <div className="flex-grow">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{toast.message}</p>
        </div>
      </div>
    </div>
  );
};
