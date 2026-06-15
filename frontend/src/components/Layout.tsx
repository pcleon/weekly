import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, Users, Edit3, Folder, FileText, Sparkles, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../api';

export default function Layout() {
  const [user, setUser] = useState<{ id: number, name: string, alias: string, department: string } | null>(null);

  useEffect(() => {
    api.get('/auth/me').then((res: any) => setUser(res)).catch(() => {});
  }, []);
  const navClass = ({ isActive }: { isActive: boolean }) => 
    `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5 ${
      isActive 
        ? 'bg-accent/15 text-accent-hover' 
        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
    }`;

  const iconClass = "flex items-center justify-center text-lg w-6 h-6";

  return (
    <div className="flex min-h-screen">
      {/* 侧边导航 */}
      <aside className="fixed inset-y-0 left-0 w-60 bg-white border-r border-slate-200 flex flex-col z-50 py-6 hidden md:flex">
        <div className="px-6 pb-6 border-b border-slate-200 mb-3">
          <h1 className="text-lg font-bold bg-gradient-to-br from-accent to-[#a78bfa] bg-clip-text text-transparent tracking-tight">Weekly Report</h1>
          <div className="text-[11px] text-slate-500 mt-1 uppercase tracking-widest">周报汇总系统</div>
        </div>
        <nav className="flex-1 px-3">
          <NavLink to="/" end className={navClass}>
            <span className={iconClass}><BarChart3 size={18} /></span> 仪表盘
          </NavLink>
          <NavLink to="/members" className={navClass}>
            <span className={iconClass}><Users size={18} /></span> 人员管理
          </NavLink>
          <NavLink to="/report/new" className={navClass}>
            <span className={iconClass}><Edit3 size={18} /></span> 提交周报
          </NavLink>
          <NavLink to="/reports" className={navClass}>
            <span className={iconClass}><Folder size={18} /></span> 存档管理
          </NavLink>
          <NavLink to="/templates" className={navClass}>
            <span className={iconClass}><FileText size={18} /></span> 模板管理
          </NavLink>
          <NavLink to="/summary" className={navClass}>
            <span className={iconClass}><Sparkles size={18} /></span> AI 汇总
          </NavLink>
        </nav>
        
        {/* 用户信息与登出 */}
        {user && (
          <div className="px-5 mt-auto">
            <div className="border-t border-slate-200 pt-5 pb-1 flex flex-col gap-3">
              <div className="flex items-center gap-3 px-2">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 font-bold flex items-center justify-center flex-shrink-0">
                  {(user.alias || user.name).charAt(0).toUpperCase()}
                </div>
                <div className="flex-col overflow-hidden">
                  <div className="text-sm font-bold text-slate-900 truncate">{user.alias || user.name}</div>
                  <div className="text-[11px] text-slate-500 truncate">{user.department}</div>
                </div>
              </div>
              <form action="/api/auth/logout" method="POST">
                <button type="submit" className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer border-none bg-transparent">
                  <span className={iconClass}><LogOut size={16} /></span> 退出登录
                </button>
              </form>
            </div>
          </div>
        )}
      </aside>

      {/* 主内容 */}
      <main className="flex-1 md:ml-60 p-5 md:p-8 max-w-6xl w-full">
        <Outlet />
      </main>
    </div>
  );
}
