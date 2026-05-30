import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Dashboard } from './views/Dashboard';
import { Orders } from './views/Orders';
import { Scheduling } from './views/Scheduling';
import { Workstations } from './views/Workstations';
import { Analytics } from './views/Analytics';
import { Toast } from './components/ui/Toast';
import { 
  LayoutDashboard, ClipboardList, CalendarDays, Cpu, BarChart3, 
  Bell, Sun, Moon, Menu, X, Trash2, Layers, CheckCircle 
} from 'lucide-react';

const AppContent: React.FC = () => {
  const {
    activeView,
    setActiveView,
    theme,
    toggleTheme,
    notifications,
    markNotificationAsRead,
    clearNotifications,
    isFullscreen
  } = useApp();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const menuItems = [
    { id: 'dashboard', label: 'Panel Control', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'orders', label: 'Órdenes', icon: <ClipboardList className="w-5 h-5" /> },
    { id: 'scheduling', label: 'Programación', icon: <CalendarDays className="w-5 h-5" /> },
    { id: 'workstations', label: 'Puestos Trabajo', icon: <Cpu className="w-5 h-5" /> },
    { id: 'analytics', label: 'Analíticas', icon: <BarChart3 className="w-5 h-5" /> }
  ] as const;

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'orders':
        return <Orders />;
      case 'scheduling':
        return <Scheduling />;
      case 'workstations':
        return <Workstations />;
      case 'analytics':
        return <Analytics />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800 dark:bg-[#0c1017] dark:text-slate-100 transition-colors duration-200">
      
      {/* 1. SIDEBAR NAVIGATION - DESKTOP */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 text-white flex flex-col justify-between transform transition-transform duration-300 xl:translate-x-0 xl:static xl:h-screen ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        
        {/* Sidebar Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-650 rounded-xl text-white shadow-lg shadow-indigo-650/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-wider uppercase font-sans">MES Sched</h1>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Control de Planta</p>
            </div>
          </div>
          
          {/* Mobile close sidebar button */}
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="xl:hidden p-1.5 hover:bg-slate-800 rounded-lg"
          >
            <X className="w-5 h-5 text-slate-450" />
          </button>
        </div>

        {/* Sidebar Menu Items */}
        <nav className="flex-grow p-4 space-y-1.5">
          {menuItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveView(item.id);
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className={isActive ? 'text-white' : 'text-slate-500'}>
                  {item.icon}
                </div>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-450 font-bold bg-slate-850/50 p-3 rounded-xl">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>Planta en Línea</span>
            </div>
          </div>
          
          <div className="text-[9px] text-slate-550 font-semibold text-center uppercase tracking-wider block">
            MES v1.0.0 • LocalStorage
          </div>
        </div>
      </aside>

      {/* 2. MAIN VIRTUAL CONTAINER */}
      <div className="flex-grow flex flex-col min-w-0">
        
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-white/70 dark:bg-[#0c1017]/70 backdrop-blur-md border-b border-slate-100 dark:border-slate-850">
          
          {/* Left: Mobile hamburger menu toggle */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="xl:hidden p-2 text-slate-650 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* View title fallback for mobile */}
            <h2 className="xl:hidden font-black text-sm text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              {menuItems.find((i) => i.id === activeView)?.label || 'Planificador'}
            </h2>
          </div>

          {/* Right: Theme Switcher + Alerts bell */}
          <div className="flex items-center gap-3">
            
            {/* Dark mode switcher toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
              title="Cambiar tema visual"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Notification alert dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all relative"
                title="Centro de Alertas de Producción"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white font-extrabold text-[8px] flex items-center justify-center rounded-full animate-pulse-subtle">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification dropdown overlay */}
              {isNotificationOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsNotificationOpen(false)}
                  />
                  <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-[#111723] rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800/80 p-4 z-50 space-y-3 transform scale-95 origin-top-right animate-[scaleUp_0.15s_ease-out] font-sans">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/50 pb-2">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-150 uppercase tracking-wider flex items-center gap-1.5">
                        <Bell className="w-4 h-4 text-indigo-500" />
                        Alertas de Producción
                      </h4>
                      {notifications.length > 0 && (
                        <button
                          onClick={clearNotifications}
                          className="text-[9px] font-bold text-rose-500 hover:underline flex items-center gap-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                          Limpiar todo
                        </button>
                      )}
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-0.5 divide-y divide-slate-50 dark:divide-slate-800/20">
                      {notifications.length > 0 ? (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => {
                              markNotificationAsRead(notif.id);
                              setIsNotificationOpen(false);
                              if (notif.orderId) setActiveView('scheduling');
                            }}
                            className={`pt-2.5 first:pt-0 cursor-pointer flex flex-col gap-1 ${
                              !notif.read ? 'opacity-100' : 'opacity-60'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`text-[10px] font-black uppercase ${
                                notif.type === 'error' ? 'text-rose-500' : notif.type === 'warning' ? 'text-amber-500' : 'text-blue-500'
                              }`}>
                                {notif.title}
                              </span>
                              <span className="text-[8px] font-bold text-slate-400 dark:text-slate-550">
                                {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-650 dark:text-slate-350 leading-normal font-medium">
                              {notif.message}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="py-6 text-center text-slate-400 dark:text-slate-500 text-xs font-medium">
                          No hay alertas activas en planta.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* View Content Space */}
        <main className={`flex-grow p-6 ${isFullscreen ? 'p-0' : ''}`}>
          {renderActiveView()}
        </main>
      </div>

      {/* Dynamic float Toast alerts */}
      <Toast />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
