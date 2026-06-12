import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { showToast } from '../api';
import { format, parseISO } from 'date-fns';
import { MdEditor, MdPreview } from 'md-editor-rt';
import 'md-editor-rt/lib/style.css';
import 'md-editor-rt/lib/preview.css';
import { FolderOpen, Maximize2, Minimize2 } from 'lucide-react';

export default function Reports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [viewReport, setViewReport] = useState<any>(null);
  const [editReport, setEditReport] = useState<any>(null);
  const [editContent, setEditContent] = useState('');
  const [editPersonalContent, setEditPersonalContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [viewActiveTab, setViewActiveTab] = useState<'both' | 'personal' | 'summary'>('both');
  const [editActiveTab, setEditActiveTab] = useState<'both' | 'personal' | 'summary'>('both');

  useEffect(() => {
    fetchData();
  }, [searchParams]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const periodId = searchParams.get('period_id');
      const memberId = searchParams.get('member_id');
      
      const params: any = {};
      if (periodId) params.period_id = periodId;
      if (memberId) params.member_id = memberId;
      
      const res: any = await api.get('/pages/reports', { params });
      setData(res);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const handleFilterPeriod = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newParams: any = {};
    const memberId = searchParams.get('member_id');
    if (memberId) newParams.member_id = memberId;
    if (e.target.value) {
      newParams.period_id = e.target.value;
    }
    setSearchParams(newParams);
  };

  const handleFilterMember = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newParams: any = {};
    const periodId = searchParams.get('period_id');
    if (periodId) newParams.period_id = periodId;
    if (e.target.value) {
      newParams.member_id = e.target.value;
    }
    setSearchParams(newParams);
  };

  const openView = async (report: any) => {
    setViewReport(report);
    setViewActiveTab('both');
  };

  const openEdit = async (report: any) => {
    setEditReport(report);
    setEditPersonalContent(report.personal_content || '');
    setEditContent(report.content || '');
    setEditActiveTab('both');
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editContent.trim()) {
      showToast('汇总用周报内容不能为空', 'error');
      return;
    }
    if (!editPersonalContent.trim()) {
      showToast('个人完整周报内容不能为空', 'error');
      return;
    }
    try {
      setSubmitting(true);
      await api.put(`/reports/${editReport.id}`, {
        content: editContent.trim(),
        personal_content: editPersonalContent.trim()
      });
      showToast('重新提交成功');
      setEditReport(null);
      fetchData();
    } catch (e) {
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !data) return <div className="inline-flex items-center gap-1 mt-5"><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-load-pulse"></div><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-load-pulse delay-150"></div><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-load-pulse delay-300"></div></div>;

  const btnPrimary = "inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-500 text-white border-none rounded-lg text-xs font-semibold cursor-pointer transition-all hover:bg-indigo-600 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] disabled:opacity-50 disabled:cursor-not-allowed";
  const btnSecondary = "inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white text-slate-900 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer transition-all hover:bg-slate-50 hover:border-indigo-500";
  
  const selectClass = "px-3.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm transition-colors focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/15 appearance-none bg-[url('data:image/svg+xml,%3Csvg_xmlns=%22http://www.w3.org/2000/svg%22_width=%2212%22_height=%2212%22_viewBox=%220_0_24_24%22_fill=%22none%22_stroke=%22%239ca3b0%22_stroke-width=%222%22%3E%3Cpath_d=%22M6_9l6_6_6-6%22/%3E%3C/svg%3E')] bg-no-repeat bg-[position:right_12px_center] pr-9 inline-block w-auto";

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight">存档管理</h2>
        <p className="text-slate-500 text-sm mt-1">查看历史周报记录</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-5 transition-colors hover:border-indigo-500/30">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-base font-semibold">历史周报</h3>
          <div className="flex gap-3">
            <select className={selectClass} value={searchParams.get('member_id') || ''} onChange={handleFilterMember}>
              <option value="">全部成员</option>
              {data.members && data.members.map((m: any) => (
                <option key={m.id} value={String(m.id)}>{m.name}（{m.department}）</option>
              ))}
            </select>
            <select className={selectClass} value={searchParams.get('period_id') || ''} onChange={handleFilterPeriod}>
              <option value="">全部周期</option>
              {data.periods.map((p: any) => (
                <option key={p.id} value={String(p.id)}>
                  {p.week_start.split('T')[0]} ~ {p.week_end.split('T')[0]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {data.reports.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">成员</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">团队</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">周期</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">提交时间</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">操作</th>
                </tr>
              </thead>
              <tbody>
                {data.reports.map((r: any) => (
                  <tr key={r.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3.5 text-sm border-b border-slate-200 align-middle">{r.member.name}</td>
                    <td className="px-4 py-3.5 text-sm border-b border-slate-200 align-middle">{r.member.department}</td>
                    <td className="px-4 py-3.5 text-sm border-b border-slate-200 align-middle">{r.week_period.week_start.split('T')[0]} ~ {r.week_period.week_end.split('T')[0]}</td>
                    <td className="px-4 py-3.5 text-sm border-b border-slate-200 align-middle">{r.submitted_at ? format(parseISO(r.submitted_at), 'MM-dd HH:mm') : ''}</td>
                    <td className="px-4 py-3.5 text-sm border-b border-slate-200 align-middle">
                      <button className={`${btnSecondary} mr-1`} onClick={() => openView(r)}>查看</button>
                      {r.week_period_id === data.current_period_id ? (
                        <button className={`${btnPrimary} mr-1`} onClick={() => openEdit(r)}>重新提交</button>
                      ) : (
                        <button className={`${btnPrimary} mr-1`} disabled title="历史周期不可修改">重新提交</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 px-5 text-slate-500">
            <div className="flex justify-center mb-4 text-slate-400">
              <FolderOpen size={48} strokeWidth={1.5} />
            </div>
            <p className="text-[15px]">暂无周报记录</p>
          </div>
        )}
      </div>

      {viewReport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex justify-center items-center animate-modal-in" onClick={() => setViewReport(null)}>
          <div className="bg-white border border-slate-200 rounded-2xl p-7 w-[95%] max-w-[1400px] max-h-[90vh] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.5)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-3 shrink-0">
              <h3 className="text-lg font-bold text-slate-800">{viewReport.member?.name} 的双轨周报</h3>
              <button className="bg-transparent border-none text-slate-500 text-xl cursor-pointer p-1 transition-colors hover:text-slate-900" onClick={() => setViewReport(null)}>✕</button>
            </div>
            <div className={viewActiveTab === 'both' ? "grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-y-auto flex-1 pr-1" : "grid grid-cols-1 gap-6 overflow-y-auto flex-1 pr-1"}>
              <div className={viewActiveTab === 'summary' ? 'hidden' : ''}>
                <div className="flex items-center justify-between mb-3 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-[14px] font-bold text-slate-700">1. 个人周报完整内容</h4>
                    <span className="text-[11px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-medium">完整记录</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewActiveTab(viewActiveTab === 'personal' ? 'both' : 'personal')}
                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80 rounded-lg transition-all cursor-pointer font-medium"
                  >
                    {viewActiveTab === 'personal' ? <><Minimize2 size={12} /> 还原</> : <><Maximize2 size={12} /> 全页</>}
                  </button>
                </div>
                <div className={`border border-slate-200 rounded-xl overflow-hidden ${viewActiveTab === 'both' ? 'min-h-[300px]' : 'min-h-[550px]'}`}>
                  <MdPreview modelValue={viewReport.personal_content || '*无个人周报内容*'} previewTheme="github" />
                </div>
              </div>
              <div className={viewActiveTab === 'personal' ? 'hidden' : ''}>
                <div className="flex items-center justify-between mb-3 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-[14px] font-bold text-slate-700">2. 汇报与汇总内容</h4>
                    <span className="text-[11px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded font-medium">用于 AI 自动汇总</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewActiveTab(viewActiveTab === 'summary' ? 'both' : 'summary')}
                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80 rounded-lg transition-all cursor-pointer font-medium"
                  >
                    {viewActiveTab === 'summary' ? <><Minimize2 size={12} /> 还原</> : <><Maximize2 size={12} /> 全页</>}
                  </button>
                </div>
                <div className={`border border-slate-200 rounded-xl overflow-hidden ${viewActiveTab === 'both' ? 'min-h-[300px]' : 'min-h-[550px]'}`}>
                  <MdPreview modelValue={viewReport.content || '*无汇总用周报内容*'} previewTheme="github" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {editReport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex justify-center items-center animate-modal-in" onClick={() => setEditReport(null)}>
          <div className="bg-white border border-slate-200 rounded-2xl p-7 w-[95%] max-w-[1400px] max-h-[90vh] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.5)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-3 shrink-0">
              <h3 className="text-lg font-bold">重新提交周报</h3>
              <button className="bg-transparent border-none text-slate-500 text-xl cursor-pointer p-1 transition-colors hover:text-slate-900" onClick={() => setEditReport(null)}>✕</button>
            </div>
            <form onSubmit={submitEdit} className="flex flex-col flex-1 overflow-hidden">
              <div className={editActiveTab === 'both' ? "grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 overflow-y-auto flex-1 pr-1" : "grid grid-cols-1 gap-6 mb-6 overflow-y-auto flex-1 pr-1"}>
                <div className={`bg-white md-editor-custom flex flex-col ${editActiveTab === 'summary' ? 'hidden' : ''}`}>
                  <div className="flex justify-between items-center mb-1.5 shrink-0">
                    <label className="block text-[13px] font-semibold text-slate-500">1. 完整个人周报内容 *</label>
                    <button
                      type="button"
                      onClick={() => setEditActiveTab(editActiveTab === 'personal' ? 'both' : 'personal')}
                      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80 rounded-lg transition-all cursor-pointer font-medium"
                    >
                      {editActiveTab === 'personal' ? <><Minimize2 size={11} /> 还原</> : <><Maximize2 size={11} /> 全页</>}
                    </button>
                  </div>
                  <MdEditor 
                    modelValue={editPersonalContent} 
                    onChange={setEditPersonalContent} 
                    placeholder="请输入完整个人周报内容..." 
                    preview={false} 
                    htmlPreview={false} 
                    toolbarsExclude={['github', 'save', 'htmlPreview', 'catalog']} 
                    style={{ height: editActiveTab === 'both' ? '400px' : '650px' }} 
                  />
                </div>
                <div className={`bg-white md-editor-custom flex flex-col ${editActiveTab === 'personal' ? 'hidden' : ''}`}>
                  <div className="flex justify-between items-center mb-1.5 shrink-0">
                    <label className="block text-[13px] font-semibold text-slate-500">2. 汇报与汇总内容 *</label>
                    <button
                      type="button"
                      onClick={() => setEditActiveTab(editActiveTab === 'summary' ? 'both' : 'summary')}
                      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80 rounded-lg transition-all cursor-pointer font-medium"
                    >
                      {editActiveTab === 'summary' ? <><Minimize2 size={11} /> 还原</> : <><Maximize2 size={11} /> 全页</>}
                    </button>
                  </div>
                  <MdEditor 
                    modelValue={editContent} 
                    onChange={setEditContent} 
                    placeholder="请输入用于团队汇总的汇报内容..." 
                    preview={false} 
                    htmlPreview={false} 
                    toolbarsExclude={['github', 'save', 'htmlPreview', 'catalog']} 
                    style={{ height: editActiveTab === 'both' ? '400px' : '650px' }} 
                  />
                </div>
              </div>
              <button type="submit" className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-500 text-white border-none rounded-lg text-[15px] font-semibold cursor-pointer transition-all hover:bg-indigo-600 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] disabled:opacity-70 disabled:cursor-not-allowed shrink-0" disabled={submitting}>保存提交</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
