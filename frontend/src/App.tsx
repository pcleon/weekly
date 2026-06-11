import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import ReportForm from './pages/ReportForm';
import Reports from './pages/Reports';
import Templates from './pages/Templates';
import Summary from './pages/Summary';
import Login from './pages/Login';
import './index.css';

function ToastContainer() {
  const [toasts, setToasts] = useState<{ id: number; message: string; type: string }[]>([]);

  useEffect(() => {
    const handleToast = (e: any) => {
      const { message, type } = e.detail;
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message, type: type || 'success' }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000); // 延长一点提示时间
    };
    window.addEventListener('show-toast', handleToast);
    return () => window.removeEventListener('show-toast', handleToast);
  }, []);

  const normalToasts = toasts.filter(t => !t.message.includes('已提交周报，请使用编辑功能修改'));
  const specialToasts = toasts.filter(t => t.message.includes('已提交周报，请使用编辑功能修改'));

  return (
    <>
      {/* 普通 Toast */}
      <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {normalToasts.map((t) => (
          <div key={t.id} className={`animate-toast-in px-5 py-3 rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.12)] text-[14px] font-medium flex items-center gap-2 ${t.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`} style={{ position: 'relative', top: 'auto', right: 'auto' }}>
            {t.message}
          </div>
        ))}
      </div>

      {/* 顶部居中 特殊提示 */}
      <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[10000] flex flex-col gap-3 pointer-events-none">
        {specialToasts.map((t) => (
          <div 
            key={t.id} 
            className="animate-toast-center-in pointer-events-auto bg-amber-50 border border-amber-200 text-amber-800 px-6 py-4 rounded-xl shadow-[0_15px_40px_rgba(245,158,11,0.15)] flex items-center gap-3.5 max-w-[90vw]"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 text-amber-600 shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-[16px] text-amber-900 leading-tight mb-1">重复提交提示</span>
              <span className="text-[14px] text-amber-700/90 leading-snug">{t.message}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="members" element={<Members />} />
          <Route path="report/new" element={<ReportForm />} />
          <Route path="reports" element={<Reports />} />
          <Route path="templates" element={<Templates />} />
          <Route path="summary" element={<Summary />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
