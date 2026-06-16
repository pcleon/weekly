import { useEffect, useState } from 'react';
import api, { showToast } from '../api';
import { format, parseISO } from 'date-fns';
import { UserPlus, User } from 'lucide-react';

export default function Members() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', alias: '', department: '' });
  const [editMember, setEditMember] = useState({ id: 0, alias: '', department: '' });
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const [membersRes, meRes]: any = await Promise.all([
        api.get('/members'),
        api.get('/auth/me').catch(() => null)
      ]);
      setMembers(membersRes);
      if (meRes) setCurrentUser(meRes);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const canEdit = currentUser ? (!currentUser.sso_enabled || currentUser.is_admin) : true;

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/members', newMember);
      showToast('添加成功');
      setShowAdd(false);
      setNewMember({ name: '', alias: '', department: '' });
      fetchMembers();
    } catch (e) {}
  };

  const toggleMember = async (id: number, currentActive: boolean) => {
    const action = currentActive ? '禁用' : '启用';
    if (!window.confirm(`确定要${action}该成员吗？`)) return;
    
    try {
      if (currentActive) {
        await api.delete(`/members/${id}`);
      } else {
        await api.put(`/members/${id}`, { is_active: true });
      }
      showToast(`已${action}`);
      fetchMembers();
    } catch (e) {}
  };

  const updateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/members/${editMember.id}`, { alias: editMember.alias, department: editMember.department });
      showToast('修改成功');
      setShowEdit(false);
      fetchMembers();
    } catch (e) {}
  };

  if (loading && members.length === 0) return <div className="inline-flex items-center gap-1 mt-5"><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-load-pulse"></div><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-load-pulse delay-150"></div><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-load-pulse delay-300"></div></div>;

  const btnPrimary = "inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 text-white border-none rounded-lg text-xs font-semibold cursor-pointer transition-all hover:bg-indigo-600 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]";
  const btnSecondary = "inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white text-slate-900 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer transition-all hover:bg-slate-50 hover:border-indigo-500";
  const inputClass = "w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm transition-colors focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/15";

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight">人员管理</h2>
        <p className="text-slate-500 text-sm mt-1">管理团队成员信息</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-5 transition-colors hover:border-indigo-500/30">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-base font-semibold">成员列表</h3>
          {canEdit && <button className={btnPrimary} onClick={() => setShowAdd(true)}><UserPlus size={14} /> 添加成员</button>}
        </div>

        {members.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">ID</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">用户名</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">显示名</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">团队</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">状态</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">添加时间</th>
                  {canEdit && <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">操作</th>}
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3.5 text-sm border-b border-slate-200 align-middle">{m.id}</td>
                    <td className="px-4 py-3.5 text-sm border-b border-slate-200 align-middle">{m.name}</td>
                    <td className="px-4 py-3.5 text-sm border-b border-slate-200 align-middle">{m.alias || '-'}</td>
                    <td className="px-4 py-3.5 text-sm border-b border-slate-200 align-middle">{m.department || '-'}</td>
                    <td className="px-4 py-3.5 text-sm border-b border-slate-200 align-middle">
                      {m.is_active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500">● 在职</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-500">○ 已禁用</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-sm border-b border-slate-200 align-middle text-slate-400">{m.created_at ? format(parseISO(m.created_at), 'yyyy-MM-dd') : ''}</td>
                    {canEdit && (
                      <td className="px-4 py-3.5 text-sm border-b border-slate-200 align-middle">
                        <button className={`${btnSecondary} mr-2`} onClick={() => { setEditMember({ id: m.id, alias: m.alias || '', department: m.department || '' }); setShowEdit(true); }}>
                          编辑
                        </button>
                        <button className={btnSecondary} onClick={() => toggleMember(m.id, m.is_active)}>
                          {m.is_active ? '禁用' : '启用'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : canEdit ? (
          <div className="text-center py-16 px-5 text-slate-500">
            <div className="flex justify-center mb-4 text-slate-400">
              <User size={48} strokeWidth={1.5} />
            </div>
            <p className="text-[15px]">暂无成员，点击上方按钮添加</p>
          </div>
        ) : (
          <div className="text-center py-16 px-5 text-slate-500">
            <p className="text-[15px]">暂无成员</p>
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex justify-center items-center animate-modal-in">
          <div className="bg-white border border-slate-200 rounded-2xl p-7 w-[90%] max-w-[560px] max-h-[85vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">添加成员</h3>
              <button className="bg-transparent border-none text-slate-500 text-xl cursor-pointer p-1 transition-colors hover:text-slate-900" onClick={() => setShowAdd(false)}>✕</button>
            </div>
            <form onSubmit={addMember}>
              <div className="mb-5">
                <label className="block text-[13px] font-semibold text-slate-500 mb-1.5">用户名 *</label>
                <input type="text" className={inputClass} placeholder="请输入用户名" required 
                  value={newMember.name} 
                  onChange={e => setNewMember({...newMember, name: e.target.value})} 
                />
              </div>
              <div className="mb-5">
                <label className="block text-[13px] font-semibold text-slate-500 mb-1.5">显示名</label>
                <input type="text" className={inputClass} placeholder="请输入显示名（为空则显示用户名）" 
                  value={newMember.alias} 
                  onChange={e => setNewMember({...newMember, alias: e.target.value})} 
                />
              </div>
              <div className="mb-5">
                <label className="block text-[13px] font-semibold text-slate-500 mb-1.5">团队</label>
                <input type="text" className={inputClass} placeholder="请输入所属团队" 
                  value={newMember.department} 
                  onChange={e => setNewMember({...newMember, department: e.target.value})} 
                />
              </div>
              <button type="submit" className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-500 text-white border-none rounded-lg text-[15px] font-semibold cursor-pointer transition-all hover:bg-indigo-600 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]">确认添加</button>
            </form>
          </div>
        </div>
      )}

      {showEdit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex justify-center items-center animate-modal-in">
          <div className="bg-white border border-slate-200 rounded-2xl p-7 w-[90%] max-w-[560px] max-h-[85vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">编辑成员信息</h3>
              <button className="bg-transparent border-none text-slate-500 text-xl cursor-pointer p-1 transition-colors hover:text-slate-900" onClick={() => setShowEdit(false)}>✕</button>
            </div>
            <form onSubmit={updateMember}>
              <div className="mb-5">
                <label className="block text-[13px] font-semibold text-slate-500 mb-1.5">显示名</label>
                <input type="text" className={inputClass} placeholder="请输入显示名（为空则显示用户名）" 
                  value={editMember.alias} 
                  onChange={e => setEditMember({...editMember, alias: e.target.value})} 
                />
              </div>
              <div className="mb-5">
                <label className="block text-[13px] font-semibold text-slate-500 mb-1.5">团队</label>
                <input type="text" className={inputClass} placeholder="请输入所属团队" 
                  value={editMember.department} 
                  onChange={e => setEditMember({...editMember, department: e.target.value})} 
                />
              </div>
              <button type="submit" className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-500 text-white border-none rounded-lg text-[15px] font-semibold cursor-pointer transition-all hover:bg-indigo-600 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]">保存修改</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
