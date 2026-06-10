import { useEffect, useState } from 'react';
import api, { showToast } from '../api';
import { format, parseISO } from 'date-fns';

export default function Templates() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showAdd, setShowAdd] = useState(false);
  const [viewTemplate, setViewTemplate] = useState<any>(null);
  
  const [formData, setFormData] = useState({ name: '', content: '', is_default: false });
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res: any = await api.get('/templates');
      setTemplates(res);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const setDefaultTemplate = async (id: number) => {
    try {
      await api.put(`/templates/${id}/default`);
      showToast('已设为默认模板');
      fetchData();
    } catch (e) {}
  };

  const deleteTemplate = async (id: number) => {
    if (!window.confirm('确定要删除该模板吗？')) return;
    try {
      await api.delete(`/templates/${id}`);
      showToast('删除成功');
      fetchData();
    } catch (e) {}
  };

  const openView = async (id: number) => {
    try {
      const tpl: any = await api.get(`/templates/${id}`);
      setViewTemplate(tpl);
    } catch (e) {}
  };

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (file) {
      if (!file.name.toLowerCase().endsWith('.docx')) {
        showToast('安全警告：只能上传 .docx 格式的文件', 'error');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        showToast('安全警告：文件大小不能超过 10MB', 'error');
        return;
      }
      try {
        const buffer = await file.slice(0, 4).arrayBuffer();
        const view = new Uint8Array(buffer);
        if (view.length < 4 || view[0] !== 0x50 || view[1] !== 0x4B) {
          showToast('安全警告：非法的文件内容，文件可能被伪装', 'error');
          return;
        }
      } catch (err) {
        showToast('文件读取失败，无法验证安全性', 'error');
        return;
      }
    }

    if (!formData.name.trim()) {
      showToast('请输入模板名称', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const data = new FormData();
      data.append('name', formData.name.trim());
      data.append('content', formData.content.trim());
      data.append('is_default', formData.is_default ? 'true' : 'false');
      if (file) {
        data.append('file', file);
      }
      
      await api.post('/templates', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showToast('模板创建成功');
      setShowAdd(false);
      setFormData({ name: '', content: '', is_default: false });
      setFile(null);
      fetchData();
    } catch (e) {
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && templates.length === 0) return <div className="loading" style={{marginTop: 20}}><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>;

  return (
    <>
      <div className="page-header">
        <h2>模板管理</h2>
        <p>管理周报模板，支持文本和 docx 格式</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>模板列表</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>➕ 新建模板</button>
        </div>

        {templates.length > 0 ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>名称</th>
                  <th>类型</th>
                  <th>默认</th>
                  <th>更新时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {templates.map(t => (
                  <tr key={t.id}>
                    <td>{t.name}</td>
                    <td>
                      {t.file_path ? (
                        <span className="badge" style={{background: 'rgba(99,102,241,0.12)', color: 'var(--accent)'}}>📄 docx</span>
                      ) : (
                        <span className="badge" style={{background: 'var(--bg-input)', color: 'var(--text-secondary)'}}>📝 文本</span>
                      )}
                    </td>
                    <td>
                      {t.is_default ? (
                        <span className="badge submitted">★ 默认</span>
                      ) : (
                        <span style={{color: 'var(--text-muted)'}}>-</span>
                      )}
                    </td>
                    <td>{t.updated_at ? format(parseISO(t.updated_at), 'yyyy-MM-dd HH:mm') : ''}</td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => openView(t.id)} style={{marginRight: 4}}>查看</button>
                      {t.file_path && (
                        <a className="btn btn-secondary btn-sm" href={`/api/templates/${t.id}/download`} style={{marginRight: 4}}>下载</a>
                      )}
                      {!t.is_default && (
                        <button className="btn btn-secondary btn-sm" onClick={() => setDefaultTemplate(t.id)} style={{marginRight: 4}}>设为默认</button>
                      )}
                      <button className="btn btn-danger btn-sm" onClick={() => deleteTemplate(t.id)}>删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="icon">📋</div>
            <p>暂无模板，点击上方按钮创建</p>
          </div>
        )}
      </div>

      {/* 新建模板模态框 */}
      {showAdd && (
        <div className="modal-overlay show">
          <div className="modal" style={{maxWidth: 640}}>
            <div className="modal-header">
              <h3>新建模板</h3>
              <button className="modal-close" onClick={() => setShowAdd(false)}>✕</button>
            </div>
            <form onSubmit={submitAdd}>
              <div className="form-group">
                <label>模板名称 *</label>
                <input type="text" className="form-control" placeholder="如：通用周报模板" required 
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>上传 docx 文件（可选）</label>
                <input type="file" className="form-control" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
                  onChange={e => setFile(e.target.files ? e.target.files[0] : null)} />
                <p style={{fontSize: 12, color: 'var(--text-muted)', marginTop: 4}}>上传 docx 后将自动提取文本内容作为模板</p>
              </div>
              <div className="form-group">
                <label>模板内容（支持 Markdown，上传 docx 后自动填充）</label>
                <textarea className="form-control" 
                  placeholder="## 本周工作&#10;&#10;- &#10;&#10;## 下周计划&#10;&#10;- &#10;&#10;## 需要协调的问题&#10;&#10;- "
                  value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})}></textarea>
              </div>
              <div className="form-group" style={{display: 'flex', alignItems: 'center', gap: 8}}>
                <input type="checkbox" id="isDefault" 
                  checked={formData.is_default} onChange={e => setFormData({...formData, is_default: e.target.checked})} />
                <label htmlFor="isDefault" style={{margin: 0, cursor: 'pointer'}}>设为默认模板</label>
              </div>
              <button type="submit" className="btn btn-primary btn-lg" style={{width: '100%'}} disabled={submitting}>创建模板</button>
            </form>
          </div>
        </div>
      )}

      {/* 查看模板内容模态框 */}
      {viewTemplate && (
        <div className="modal-overlay show">
          <div className="modal" style={{maxWidth: 640}}>
            <div className="modal-header">
              <h3>模板内容</h3>
              <button className="modal-close" onClick={() => setViewTemplate(null)}>✕</button>
            </div>
            <div className="summary-content" style={{minHeight: 200, whiteSpace: 'pre-wrap'}}>
              {viewTemplate.content}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
