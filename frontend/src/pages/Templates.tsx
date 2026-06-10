import { useEffect, useState } from 'react';
import api, { showToast } from '../api';
import { format, parseISO } from 'date-fns';
import { Plus, FileText, FileEdit, Star, ClipboardList } from 'lucide-react';

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

  if (loading && templates.length === 0) return <div className="inline-flex items-center gap-1 mt-5"><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-load-pulse"></div><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-load-pulse delay-150"></div><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-load-pulse delay-300"></div></div>;

  const btnPrimary = "inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 text-white border-none rounded-lg text-xs font-semibold cursor-pointer transition-all hover:bg-indigo-600 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]";
  const btnSmSecondary = "inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white text-slate-900 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer transition-all hover:bg-slate-50 hover:border-indigo-500";
  const btnSmDanger = "inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-red-500/10 text-red-500 border-none rounded-lg text-xs font-semibold cursor-pointer transition-all hover:bg-red-500 hover:text-white";

  const inputClass = "w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm transition-colors focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/15";

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight">模板管理</h2>
        <p className="text-slate-500 text-sm mt-1">管理周报模板，支持文本和 docx 格式</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-5 transition-colors hover:border-indigo-500/30">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-base font-semibold">模板列表</h3>
          <button className={btnPrimary} onClick={() => setShowAdd(true)}><Plus size={14} /> 新建模板</button>
        </div>

        {templates.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">名称</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">类型</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">默认</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">更新时间</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">操作</th>
                </tr>
              </thead>
              <tbody>
                {templates.map(t => (
                  <tr key={t.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3.5 text-sm border-b border-slate-200 align-middle">{t.name}</td>
                    <td className="px-4 py-3.5 text-sm border-b border-slate-200 align-middle">
                      {t.file_path ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-500"><FileText size={12} /> docx</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500"><FileEdit size={12} /> 文本</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-sm border-b border-slate-200 align-middle">
                      {t.is_default ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500"><Star size={12} fill="currentColor" /> 默认</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-sm border-b border-slate-200 align-middle text-slate-400">{t.updated_at ? format(parseISO(t.updated_at), 'yyyy-MM-dd HH:mm') : ''}</td>
                    <td className="px-4 py-3.5 text-sm border-b border-slate-200 align-middle flex items-center gap-1.5">
                      <button className={btnSmSecondary} onClick={() => openView(t.id)}>查看</button>
                      {t.file_path && (
                        <a className={`${btnSmSecondary} text-decoration-none`} href={`/api/templates/${t.id}/download`}>下载</a>
                      )}
                      {!t.is_default && (
                        <button className={btnSmSecondary} onClick={() => setDefaultTemplate(t.id)}>设为默认</button>
                      )}
                      <button className={btnSmDanger} onClick={() => deleteTemplate(t.id)}>删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 px-5 text-slate-500">
            <div className="flex justify-center mb-4 text-slate-400">
              <ClipboardList size={48} strokeWidth={1.5} />
            </div>
            <p className="text-[15px]">暂无模板，点击上方按钮创建</p>
          </div>
        )}
      </div>

      {/* 新建模板模态框 */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex justify-center items-center animate-modal-in">
          <div className="bg-white border border-slate-200 rounded-2xl p-7 w-[90%] max-w-[640px] max-h-[85vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">新建模板</h3>
              <button className="bg-transparent border-none text-slate-500 text-xl cursor-pointer p-1 transition-colors hover:text-slate-900" onClick={() => setShowAdd(false)}>✕</button>
            </div>
            <form onSubmit={submitAdd}>
              <div className="mb-5">
                <label className="block text-[13px] font-semibold text-slate-500 mb-1.5">模板名称 *</label>
                <input type="text" className={inputClass} placeholder="如：通用周报模板" required 
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="mb-5">
                <label className="block text-[13px] font-semibold text-slate-500 mb-1.5">上传 docx 文件（可选）</label>
                <input type="file" className={`${inputClass} !p-2 cursor-pointer file:cursor-pointer file:border-0 file:bg-indigo-50 file:text-indigo-500 file:font-semibold file:px-3 file:py-1.5 file:rounded-md file:mr-3 hover:file:bg-indigo-100`} accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
                  onChange={e => setFile(e.target.files ? e.target.files[0] : null)} />
                <p className="text-xs text-slate-500 mt-1.5">上传 docx 后将自动提取文本内容作为模板</p>
              </div>
              <div className="mb-5">
                <label className="block text-[13px] font-semibold text-slate-500 mb-1.5">模板内容（支持 Markdown，上传 docx 后自动填充）</label>
                <textarea className={`${inputClass} min-h-[200px] font-mono`} 
                  placeholder="## 本周工作&#10;&#10;- &#10;&#10;## 下周计划&#10;&#10;- &#10;&#10;## 需要协调的问题&#10;&#10;- "
                  value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})}></textarea>
              </div>
              <div className="mb-6 flex items-center gap-2">
                <input type="checkbox" id="isDefault" className="w-4 h-4 text-indigo-500 border-slate-300 rounded focus:ring-indigo-500"
                  checked={formData.is_default} onChange={e => setFormData({...formData, is_default: e.target.checked})} />
                <label htmlFor="isDefault" className="text-sm font-medium text-slate-700 cursor-pointer select-none">设为默认模板</label>
              </div>
              <button type="submit" className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-500 text-white border-none rounded-lg text-[15px] font-semibold cursor-pointer transition-all hover:bg-indigo-600 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] disabled:opacity-70 disabled:cursor-not-allowed" disabled={submitting}>创建模板</button>
            </form>
          </div>
        </div>
      )}

      {/* 查看模板内容模态框 */}
      {viewTemplate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex justify-center items-center animate-modal-in">
          <div className="bg-white border border-slate-200 rounded-2xl p-7 w-[90%] max-w-[640px] max-h-[85vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">模板内容</h3>
              <button className="bg-transparent border-none text-slate-500 text-xl cursor-pointer p-1 transition-colors hover:text-slate-900" onClick={() => setViewTemplate(null)}>✕</button>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 min-h-[200px] whitespace-pre-wrap font-mono text-sm text-slate-700">
              {viewTemplate.content}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
