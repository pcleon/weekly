import { useEffect, useState, useMemo, Fragment } from 'react';
import api, { showToast } from '../api';
import { format, parseISO } from 'date-fns';
import { MdPreview } from 'md-editor-rt';
import 'md-editor-rt/lib/preview.css';
import { Settings, Bot, Download, FileText } from 'lucide-react';

export default function Summary() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [showConfig, setShowConfig] = useState(false);
  const [promptConfig, setPromptConfig] = useState({ system_prompt: '', user_template: '' });
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  
  const [viewSummary, setViewSummary] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [expandedPeriods, setExpandedPeriods] = useState<Record<number, boolean>>({});

  const toggleExpand = (periodId: number) => {
    setExpandedPeriods(prev => ({ ...prev, [periodId]: !prev[periodId] }));
  };

  const groupedSummaries = useMemo(() => {
    if (!data?.summaries) return [];
    const groups: Record<number, { period: any, items: any[] }> = {};
    data.summaries.forEach((s: any) => {
      const pid = s.week_period_id;
      if (!groups[pid]) {
        groups[pid] = { period: s.week_period, items: [] };
      }
      groups[pid].items.push(s);
    });
    return Object.values(groups).sort((a, b) => b.period.week_start.localeCompare(a.period.week_start));
  }, [data?.summaries]);

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
      setSelectedTemplateId('');
      
      const tpls: any = await api.get('/templates');
      setTemplates(tpls);
      
      setShowConfig(true);
    } catch (e) {}
  };

  const handleSelectTemplate = (idStr: string) => {
    setSelectedTemplateId(idStr);
    if (!idStr) return;
    const tpl = templates.find(t => t.id.toString() === idStr);
    if (tpl) {
      setPromptConfig({
        system_prompt: tpl.system_prompt || `你是一个专业的团队周报汇总助手。请根据以下团队成员的周报内容，生成一份结构清晰的团队周报汇总。\n\n在汇总“一、本周工作概述”部分时，不要将所有事项列出，要进行提炼与汇总，只选取具有较大影响或重要进展的部分进行概述。\n\n**必须严格按照以下 Markdown 模板格式输出，不要改变或增删任何标题：**`,
        user_template: tpl.content || ''
      });
    }
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
                {groupedSummaries.map(({ period, items }) => {
                  const isExpanded = expandedPeriods[period.id];
                  const latest = items[0];
                  return (
                    <Fragment key={period.id}>
                      <tr className="transition-colors hover:bg-slate-50 cursor-pointer" onClick={() => toggleExpand(period.id)}>
                        <td className="px-4 py-3.5 text-sm border-b border-slate-200 align-middle font-medium text-slate-700">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 text-xs w-4 text-center">{isExpanded ? '▼' : '▶'}</span>
                            {period.week_start.split('T')[0]} ~ {period.week_end.split('T')[0]}
                            {items.length > 1 && (
                              <span className="ml-2 px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-semibold">{items.length} 个版本</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-sm border-b border-slate-200 align-middle text-slate-500">
                          最新: {format(parseISO(latest.generated_at), 'yyyy-MM-dd HH:mm')}
                        </td>
                        <td className="px-4 py-3.5 text-sm border-b border-slate-200 align-middle flex items-center gap-1.5">
                           <button className={btnSmSecondary} onClick={(e) => { e.stopPropagation(); setViewSummary(latest); }}><FileText size={14} /> 查看最新</button>
                           {items.length === 1 && (
                             <a href={`/api/summaries/${latest.id}/download`} onClick={(e) => e.stopPropagation()} className={btnSmPrimary}><Download size={14} /> 下载</a>
                           )}
                        </td>
                      </tr>
                      {isExpanded && items.map((s: any, idx: number) => (
                        <tr key={s.id} className="bg-slate-50/50">
                          <td className="px-4 py-2.5 text-xs border-b border-slate-100 align-middle pl-11 text-slate-500">
                            版本 {items.length - idx}
                          </td>
                          <td className="px-4 py-2.5 text-xs border-b border-slate-100 align-middle text-slate-500">
                            {format(parseISO(s.generated_at), 'yyyy-MM-dd HH:mm:ss')}
                          </td>
                          <td className="px-4 py-2.5 text-xs border-b border-slate-100 align-middle flex items-center gap-1.5">
                            <button className={btnSmSecondary} onClick={() => setViewSummary(s)}><FileText size={12} /> 查看</button>
                            <a href={`/api/summaries/${s.id}/download`} className={btnSmPrimary}><Download size={12} /> 下载</a>
                            {s.week_period_id === data.current_period_id ? (
                              <button className={btnSmDanger} onClick={() => deleteSummary(s.id)}>删除</button>
                            ) : (
                              <button className={btnSmDanger} disabled title="历史周期不可修改">删除</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex justify-center items-center animate-modal-in" onClick={() => setViewSummary(null)}>
          <div className="bg-white border border-slate-200 rounded-2xl p-7 w-[90%] max-w-[800px] max-h-[85vh] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.5)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="text-lg font-bold">汇总报告详情</h3>
              <button className="bg-transparent border-none text-slate-500 text-xl cursor-pointer p-1 transition-colors hover:text-slate-900" onClick={() => setViewSummary(null)}>✕</button>
            </div>
            <div className="border border-slate-200 rounded-xl min-h-[200px] overflow-y-auto flex-1">
              <MdPreview modelValue={viewSummary.summary_content} previewTheme="github" />
            </div>
          </div>
        </div>
      )}

      {showConfig && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex justify-center items-center animate-modal-in" onClick={() => setShowConfig(false)}>
          <div className="bg-white border border-slate-200 rounded-2xl p-7 w-[95%] max-w-[1400px] max-h-[90vh] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.5)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="text-lg font-bold">配置汇总提示词</h3>
              <button className="bg-transparent border-none text-slate-500 text-xl cursor-pointer p-1 transition-colors hover:text-slate-900" onClick={() => setShowConfig(false)}>✕</button>
            </div>
            
            {/* 模板选择套用区 */}
            <div className="mb-5 shrink-0 bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 mb-1.5">套用周报模板快速填充 (载入后仍可编辑修改)</label>
                <select 
                  value={selectedTemplateId} 
                  onChange={(e) => handleSelectTemplate(e.target.value)} 
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">-- 请选择模板进行套用 --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id.toString()}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <form onSubmit={saveConfig} className="flex flex-col flex-1 overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-y-auto pr-1 mb-5">
                <div className="flex flex-col mb-5 lg:mb-0">
                  <label className="block text-[13px] font-semibold text-slate-500 mb-1">系统设定与指令 (System Prompt)</label>
                  <p className="text-xs text-slate-400 mb-2">告诉大模型它的角色以及必须遵守的规则。</p>
                  <textarea className={`${inputClass} flex-1 min-h-[350px] lg:min-h-[420px] resize-none`}
                    value={promptConfig.system_prompt} onChange={e => setPromptConfig({...promptConfig, system_prompt: e.target.value})}></textarea>
                </div>
                <div className="flex flex-col mb-5 lg:mb-0">
                  <label className="block text-[13px] font-semibold text-slate-500 mb-1">汇总 Markdown 模板 (User Template)</label>
                  <p className="text-xs text-slate-400 mb-2">在此处编辑最终期望生成的周报框架排版结构。</p>
                  <textarea className={`${inputClass} flex-1 min-h-[350px] lg:min-h-[420px] resize-none`}
                    value={promptConfig.user_template} onChange={e => setPromptConfig({...promptConfig, user_template: e.target.value})}></textarea>
                </div>
              </div>
              <button type="submit" className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-500 text-white border-none rounded-lg text-[15px] font-semibold cursor-pointer transition-all hover:bg-indigo-600 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] shrink-0">保存配置</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
