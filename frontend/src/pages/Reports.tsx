import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { showToast } from '../api';
import { format, parseISO } from 'date-fns';
import { marked } from 'marked';
import SimpleMDE from 'react-simplemde-editor';
import 'easymde/dist/easymde.min.css';
import 'font-awesome/css/font-awesome.min.css';
import { FolderOpen } from 'lucide-react';

export default function Reports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [viewReport, setViewReport] = useState<any>(null);
  const [editReport, setEditReport] = useState<any>(null);
  const [editContent, setEditContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [searchParams]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const periodId = searchParams.get('period_id');
      const res: any = await api.get('/pages/reports', {
        params: periodId ? { period_id: periodId } : {}
      });
      setData(res);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value) {
      setSearchParams({ period_id: e.target.value });
    } else {
      setSearchParams({});
    }
  };

  const openView = (r: any) => {
    setViewReport(r);
  };

  const openEdit = (r: any) => {
    setEditReport(r);
    setEditContent(r.content);
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editContent.trim()) {
      showToast('周报内容不能为空', 'error');
      return;
    }
    try {
      setSubmitting(true);
      await api.put(`/reports/${editReport.id}`, { content: editContent.trim() });
      showToast('重新提交成功');
      setEditReport(null);
      fetchData();
    } catch (e) {
    } finally {
      setSubmitting(false);
    }
  };

  const deleteReport = async (id: number) => {
    if (!window.confirm('确定要删除这篇周报记录吗？')) return;
    try {
      await api.post(`/reports/${id}/delete`);
      showToast('已删除');
      fetchData();
    } catch (e) {}
  };

  if (loading || !data) return <div className="inline-flex items-center gap-1 mt-5"><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-load-pulse"></div><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-load-pulse delay-150"></div><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-load-pulse delay-300"></div></div>;

  const btnPrimary = "inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-500 text-white border-none rounded-lg text-xs font-semibold cursor-pointer transition-all hover:bg-indigo-600 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] disabled:opacity-50 disabled:cursor-not-allowed";
  const btnSecondary = "inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white text-slate-900 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer transition-all hover:bg-slate-50 hover:border-indigo-500";
  const btnDanger = "inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-red-500/10 text-red-500 border-none rounded-lg text-xs font-semibold cursor-pointer transition-all hover:bg-red-500 hover:text-white";
  
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
          <div>
            <select className={selectClass} value={searchParams.get('period_id') || ''} onChange={handleFilter}>
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
                      <button className={btnDanger} onClick={() => deleteReport(r.id)}>删除</button>
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex justify-center items-center animate-modal-in">
          <div className="bg-white border border-slate-200 rounded-2xl p-7 w-[90%] max-w-[720px] max-h-[85vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">{viewReport.member?.name} 的周报</h3>
              <button className="bg-transparent border-none text-slate-500 text-xl cursor-pointer p-1 transition-colors hover:text-slate-900" onClick={() => setViewReport(null)}>✕</button>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6 leading-relaxed whitespace-pre-wrap text-sm min-h-[200px] prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: marked.parse(viewReport.content) as string }}></div>
          </div>
        </div>
      )}

      {editReport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex justify-center items-center animate-modal-in">
          <div className="bg-white border border-slate-200 rounded-2xl p-7 w-[90%] max-w-[800px] max-h-[85vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">重新提交周报</h3>
              <button className="bg-transparent border-none text-slate-500 text-xl cursor-pointer p-1 transition-colors hover:text-slate-900" onClick={() => setEditReport(null)}>✕</button>
            </div>
            <form onSubmit={submitEdit}>
              <div className="mb-5 bg-white">
                <SimpleMDE value={editContent} onChange={setEditContent} options={{ autoDownloadFontAwesome: false, spellChecker: false, status: false } as any} />
              </div>
              <button type="submit" className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-500 text-white border-none rounded-lg text-[15px] font-semibold cursor-pointer transition-all hover:bg-indigo-600 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] disabled:opacity-70 disabled:cursor-not-allowed" disabled={submitting}>保存提交</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
