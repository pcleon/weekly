import { useEffect, useState } from 'react';
import api, { showToast } from '../api';
import { format, parseISO } from 'date-fns';

export default function Members() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', department: '' });

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const res: any = await api.get('/members');
      setMembers(res);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/members', newMember);
      showToast('添加成功');
      setShowAdd(false);
      setNewMember({ name: '', department: '' });
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

  if (loading && members.length === 0) return <div className="loading" style={{marginTop: 20}}><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>;

  return (
    <>
      <div className="page-header">
        <h2>人员管理</h2>
        <p>管理团队成员信息</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>成员列表</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>➕ 添加成员</button>
        </div>

        {members.length > 0 ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>姓名</th>
                  <th>团队</th>
                  <th>状态</th>
                  <th>添加时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id}>
                    <td>{m.id}</td>
                    <td>{m.name}</td>
                    <td>{m.department || '-'}</td>
                    <td>
                      {m.is_active ? (
                        <span className="badge active">● 在职</span>
                      ) : (
                        <span className="badge inactive">○ 已禁用</span>
                      )}
                    </td>
                    <td>{m.created_at ? format(parseISO(m.created_at), 'yyyy-MM-dd') : ''}</td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => toggleMember(m.id, m.is_active)}>
                        {m.is_active ? '禁用' : '启用'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="icon">👤</div>
            <p>暂无成员，点击上方按钮添加</p>
          </div>
        )}
      </div>

      {/* 添加成员模态框 */}
      {showAdd && (
        <div className="modal-overlay show" id="addMemberModal">
          <div className="modal">
            <div className="modal-header">
              <h3>添加成员</h3>
              <button className="modal-close" onClick={() => setShowAdd(false)}>✕</button>
            </div>
            <form onSubmit={addMember}>
              <div className="form-group">
                <label>姓名 *</label>
                <input type="text" className="form-control" placeholder="请输入姓名" required 
                  value={newMember.name} 
                  onChange={e => setNewMember({...newMember, name: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>团队</label>
                <input type="text" className="form-control" placeholder="请输入所属团队" 
                  value={newMember.department} 
                  onChange={e => setNewMember({...newMember, department: e.target.value})} 
                />
              </div>
              <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>确认添加</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
