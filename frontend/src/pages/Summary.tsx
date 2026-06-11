import { useEffect, useState } from 'react';
import api, { showToast } from '../api';
import { format, parseISO } from 'date-fns';
import { marked } from 'marked';
import { Settings, Bot, Download, FileText } from 'lucide-react';

export default function Summary() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [showConfig, setShowConfig] = useState(false);
  const [promptConfig, setPromptConfig] = useState({ system_prompt: '', user_template: '' });
  
  const [viewSummary, setViewSummary] = useState<any>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res: any = await api.get('/pages/summary');
      setData(res);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const openConfig = async () => {
    try {
      const res: any = await api.get('/summaries/prompt');
      setPromptConfig({
        system_prompt: res.system_prompt,
        user_template: res.user_template
      });
      setShowConfig(true);
    } catch (e) {}
  };

  const saveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put('/summaries/prompt', promptConfig);
      showToast('配置已保存');
      setShowConfig(false);
    } catch (e) {}
  };

  const generateSummary = async () => {
    try {
      setGenerating(true);
      await api.post('/summaries/generate');
      showToast('汇总生成成功');
      fetchData();
    } catch (e) {
    } finally {
      setGenerating(false);
    }
  };

  const deleteSummary = async (id: number) => {
    if (!window.confirm('确定要删除这份汇总记录吗？')) return;
    try {
      await api.delete(`/summaries/${id}`);
      showToast('已删除');
      fetchData();
    } catch (e) {}
  };

  if (loading || !data) return <div className="inline-flex items-center gap-1 mt-5"><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-load-pulse"></div><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-load-pulse delay-150"></div><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-load-pulse delay-300"></div></div>;

  const btnPrimary = "inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-all hover:bg-indigo-600 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] disabled:opacity-70 disabled:cursor-not-allowed";
  const btnSecondary = "inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-900 border border-slate-200 rounded-lg text-sm font-semibold cursor-pointer transition-all hover:bg-slate-50 hover:border-indigo-500";
  
  const btnSmPrimary = "inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-500 text-white border-none rounded-lg text-xs font-semibold cursor-pointer transition-all hover:bg-indigo-600 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] disabled:opacity-50 disabled:cursor-not-allowed";
  const btnSmSecondary = "inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white text-slate-900 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer transition-all hover:bg-slate-50 hover:border-indigo-500";
  const btnSmDanger = "inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-red-500/10 text-red-500 border-none rounded-lg text-xs font-semibold cursor-pointer transition-all hover:bg-red-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed";

  const inputClass = "w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm transition-colors focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/15 font-mono";

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight">AI 汇总</h2>
        <p className="text-slate-500 text-sm mt-1">使用 AI 智能汇总团队周报</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-5 transition-colors hover:border-indigo-500/30">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-base font-semibold">当前周期汇总</h3>
          <div className="flex gap-2.5">
            <button className={btnSecondary} onClick={openConfig}><Settings size={16} /> 周报汇总模板</button>
            <button className={btnPrimary} onClick={generateSummary} disabled={generating}>
              {generating ? '正在生成...' : <><Bot size={16} /> 生成汇总</>}
            </button>
          </div>
        </div>
        <p className="text-slate-500 text-sm leading-relaxed">
          点击按钮将对本周所有已提交的周报进行 AI 智能汇总。
          {data.current_summary && (
            <><br/><span className="text-indigo-500 font-semibold">
              (本周期最近一次生成时间：{format(parseISO(data.current_summary.generated_at), 'yyyy-MM-dd HH:mm')})
            </span></>
          )}
          {data.last_report && (
            <><br/><span className="text-indigo-500 font-semibold">
              (最后更新人员：{data.last_report.member.name} - {format(parseISO(data.last_report.submitted_at), 'yyyy-MM-dd HH:mm')})
            </span></>
          )}
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-5 transition-colors hover:border-indigo-500/30">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-base font-semibold">历史汇总记录</h3>
        </div>

        {data.summaries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">周期</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">生成时间</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">操作</th>
                </tr>
              </thead>
              <tbody>
                {data.summaries.map((s: any) => (
                  <tr key={s.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3.5 text-sm border-b border-slate-200 align-middle">{s.week_period.week_start.split('T')[0]} ~ {s.week_period.week_end.split('T')[0]}</td>
                    <td className="px-4 py-3.5 text-sm border-b border-slate-200 align-middle">{format(parseISO(s.generated_at), 'yyyy-MM-dd HH:mm')}</td>
                    <td className="px-4 py-3.5 text-sm border-b border-slate-200 align-middle flex items-center gap-1.5">
                      <button className={btnSmSecondary} onClick={() => setViewSummary(s)}><FileText size={14} /> 查看</button>
                      <a href={`/api/summaries/${s.id}/download`} className={btnSmPrimary}><Download size={14} /> 下载</a>
                      {s.week_period_id === data.current_period_id ? (
                        <button className={btnSmDanger} onClick={() => deleteSummary(s.id)}>删除</button>
                      ) : (
                        <button className={btnSmDanger} disabled title="历史周期不可修改">删除</button>
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
              <Bot size={48} strokeWidth={1.5} />
            </div>
            <p className="text-[15px]">暂无汇总记录，请先生成</p>
          </div>
        )}
      </div>

      {viewSummary && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex justify-center items-center animate-modal-in">
          <div className="bg-white border border-slate-200 rounded-2xl p-7 w-[90%] max-w-[800px] max-h-[85vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">汇总报告详情</h3>
              <button className="bg-transparent border-none text-slate-500 text-xl cursor-pointer p-1 transition-colors hover:text-slate-900" onClick={() => setViewSummary(null)}>✕</button>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6 leading-relaxed whitespace-pre-wrap text-sm min-h-[200px] prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: marked.parse(viewSummary.summary_content) as string }}></div>
          </div>
        </div>
      )}

      {showConfig && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex justify-center items-center animate-modal-in">
          <div className="bg-white border border-slate-200 rounded-2xl p-7 w-[90%] max-w-[800px] max-h-[85vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">配置汇总提示词</h3>
              <button className="bg-transparent border-none text-slate-500 text-xl cursor-pointer p-1 transition-colors hover:text-slate-900" onClick={() => setShowConfig(false)}>✕</button>
            </div>
            <form onSubmit={saveConfig}>
              <div className="mb-5">
                <label className="block text-[13px] font-semibold text-slate-500 mb-1.5">系统设定与指令 (System Prompt)</label>
                <p className="text-xs text-slate-500 mb-2">告诉大模型它的角色以及必须遵守的规则。</p>
                <textarea className={`${inputClass} min-h-[120px]`}
                  value={promptConfig.system_prompt} onChange={e => setPromptConfig({...promptConfig, system_prompt: e.target.value})}></textarea>
              </div>
              <div className="mb-5">
                <label className="block text-[13px] font-semibold text-slate-500 mb-1.5">汇总 Markdown 模板 (User Template)</label>
                <p className="text-xs text-slate-500 mb-2">在此处编辑最终期望生成的周报框架排版结构。</p>
                <textarea className={`${inputClass} min-h-[300px]`}
                  value={promptConfig.user_template} onChange={e => setPromptConfig({...promptConfig, user_template: e.target.value})}></textarea>
              </div>
              <button type="submit" className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-500 text-white border-none rounded-lg text-[15px] font-semibold cursor-pointer transition-all hover:bg-indigo-600 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]">保存配置</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
