import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, Users, Edit3, Folder, FileText, Sparkles } from 'lucide-react';

export default function Layout() {
  return (
    <div className="layout">
      {/* 侧边导航 */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>Weekly Report</h1>
          <div className="subtitle">周报汇总系统</div>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="icon"><BarChart3 size={18} /></span> 仪表盘
          </NavLink>
          <NavLink to="/members" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="icon"><Users size={18} /></span> 人员管理
          </NavLink>
          <NavLink to="/report/new" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="icon"><Edit3 size={18} /></span> 提交周报
          </NavLink>
          <NavLink to="/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="icon"><Folder size={18} /></span> 存档管理
          </NavLink>
          <NavLink to="/templates" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="icon"><FileText size={18} /></span> 模板管理
          </NavLink>
          <NavLink to="/summary" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="icon"><Sparkles size={18} /></span> AI 汇总
          </NavLink>
        </nav>
      </aside>

      {/* 主内容 */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
