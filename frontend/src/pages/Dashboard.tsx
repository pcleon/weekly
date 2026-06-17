import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { showToast } from '../api';
import { format, parseISO } from 'date-fns';
import { CalendarClock, Settings, Edit, Users } from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [configParams, setConfigParams] = useState({ day_of_week: 0, hour: 0, minute: 0, auto_send_enabled: false, auto_send_email: '', auto_send_delay: 0 });
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0, expired: false });
  const [showConfig, setShowConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);


  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/pages/dashboard');
      setData(res);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!data?.period?.deadline) return;
    const targetTime = parseISO(data.period.deadline).getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const diff = Math.floor((targetTime - now) / 1000);

      if (diff <= 0) {
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0, expired: true });
        return;
      }

      setTimeLeft({
        d: Math.floor(diff / (24 * 3600)),
        h: Math.floor((diff % (24 * 3600)) / 3600),
        m: Math.floor((diff % 3600) / 60),
        s: diff % 60,
        expired: false
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [data?.period?.deadline]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowConfig(false);
      }
    };
    if (showConfig) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showConfig]);

  const openConfig = async () => {
    try {
      const res: any = await api.get('/settings/deadline');
      setConfigParams({
        day_of_week: res.day_of_week,
        hour: res.hour,
        minute: res.minute,
        auto_send_enabled: res.auto_send_enabled || false,
        auto_send_email: res.auto_send_email || '',
        auto_send_delay: res.auto_send_delay || 0
      });
      setShowConfig(true);
    } catch (e) { }
  };

  const saveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingConfig(true);
      const res: any = await api.put('/settings/deadline', configParams);
      showToast(res.message || '保存成功');
      setShowConfig(false);
      fetchData();
    } catch (e) { } finally {
      setSavingConfig(false);
    }
  };

  const extendPeriod = async (weeks: number) => {
    const action = weeks > 0 ? "顺延" : "缩短";
    if (!window.confirm(`确定要将当前收集周期${action} ${Math.abs(weeks)} 周吗？\n注意：这也会自动将截止时间${action}。`)) return;
    try {
      const res: any = await api.post('/settings/period/extend', { weeks });
      showToast(res.message || '操作成功');
      fetchData();
    } catch (e) { }
  };

  const resetPeriod = async () => {
    if (!window.confirm("确定要取消顺延，将当前周期和截止时间恢复为默认配置吗？")) return;
    try {
      const res: any = await api.post('/settings/period/reset');
      showToast(res.message || '操作成功');
      fetchData();
    } catch (e) { }
  };

  const isExtended = () => {
    if (!data?.period?.week_start || !data?.period?.week_end) return false;
    const start = new Date(data.period.week_start.split('T')[0]);
    const end = new Date(data.period.week_end.split('T')[0]);
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
    return diffDays > 6;
  };

  if (loading || !data) return <div className="inline-flex items-center gap-1 mt-5"><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-load-pulse"></div><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-load-pulse delay-150"></div><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-load-pulse delay-300"></div></div>;

  const { period, status, deadline_str } = data;

  const isoWeek = (dateStr: string) => {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  };

  const inputClass = "w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm transition-colors focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/15";

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">仪表盘</h2>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <p className="text-slate-500 text-sm">{period.week_start.split('T')[0]} 至 {period.week_end.split('T')[0]} · 截止时间：{format(parseISO(period.deadline), 'MM-dd HH:mm')}</p>
            {isExtended() && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-rose-50 text-rose-600 border border-rose-200 shadow-sm animate-pulse">
                已顺延
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {isExtended() && (
            <button className="bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 hover:border-rose-500 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-sm" onClick={resetPeriod} title="取消顺延，将周期恢复为系统默认配置">
              <CalendarClock size={14} /> 取消顺延
            </button>
          )}
          <button className="bg-slate-50 text-slate-900 border border-slate-200 hover:bg-slate-100 hover:border-indigo-500 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-sm" onClick={() => extendPeriod(1)} title="如果遇到节假日，可将当前收集周期顺延一周">
            <CalendarClock size={14} /> 顺延一周
          </button>
          <button className="bg-slate-50 text-slate-900 border border-slate-200 hover:bg-slate-100 hover:border-indigo-500 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-sm" onClick={openConfig} title="配置每周截止时间">
            <Settings size={14} /> 周期设置
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-7">
        <div className="bg-white border border-slate-200 rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">当前周期</div>
          <div className="text-3xl font-bold text-indigo-500">第{isoWeek(period.week_start)}周</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">已提交</div>
          <div className="text-3xl font-bold text-emerald-500">{status.submitted_count}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">未提交</div>
          <div className="text-3xl font-bold text-red-500">{status.total - status.submitted_count}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-2 flex justify-between items-center">
            <span>截止倒计时</span>
            <span className="text-slate-400 font-medium text-[11px] tabular-nums">({deadline_str})</span>
          </div>
          <div className="bg-[#f0f0f0] text-[#333] p-1.5 rounded-md text-center font-mono text-lg mt-2">
            {timeLeft.expired ? '已截止' : (
              <div className="flex gap-1.5 justify-center">
                <div className="bg-white border border-slate-200 rounded p-1 text-center flex-1 min-w-0"><div className="text-lg font-bold text-indigo-500 tabular-nums leading-tight">{String(timeLeft.d).padStart(2, '0')}</div><div className="text-[10px] text-slate-500 mt-0.5">天</div></div>
                <div className="bg-white border border-slate-200 rounded p-1 text-center flex-1 min-w-0"><div className="text-lg font-bold text-indigo-500 tabular-nums leading-tight">{String(timeLeft.h).padStart(2, '0')}</div><div className="text-[10px] text-slate-500 mt-0.5">时</div></div>
                <div className="bg-white border border-slate-200 rounded p-1 text-center flex-1 min-w-0"><div className="text-lg font-bold text-indigo-500 tabular-nums leading-tight">{String(timeLeft.m).padStart(2, '0')}</div><div className="text-[10px] text-slate-500 mt-0.5">分</div></div>
                <div className="bg-white border border-slate-200 rounded p-1 text-center flex-1 min-w-0"><div className="text-lg font-bold text-indigo-500 tabular-nums leading-tight">{String(timeLeft.s).padStart(2, '0')}</div><div className="text-[10px] text-slate-500 mt-0.5">秒</div></div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-5 transition-colors hover:border-indigo-500/30">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-base font-semibold">提交状态一览</h3>
          <Link to="/report/new" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 text-white border-none rounded-lg text-xs font-semibold cursor-pointer transition-all hover:bg-indigo-600 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]"><Edit size={14} /> 提交周报</Link>
        </div>

        {status.total === 0 ? (
          <div className="text-center py-16 px-5 text-slate-500">
            <div className="flex justify-center mb-4 text-slate-400">
              <Users size={48} strokeWidth={1.5} />
            </div>
            <p className="text-[15px]">暂无团队成员，请先<Link to="/members" className="text-indigo-500 hover:underline">添加成员</Link></p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">状态</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">成员</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">团队</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">提交时间</th>
                </tr>
              </thead>
              <tbody>
                {status.not_submitted.map((m: any) => (
                  <tr key={`n_${m.id}`} className="transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3.5 text-sm border-b border-slate-200 align-middle"><span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-500"><span className="w-2 h-2 rounded-full shrink-0 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span> 未交</span></td>
                    <td className="px-4 py-3.5 text-sm border-b border-slate-200 align-middle">{m.alias || m.name}</td>
                    <td className="px-4 py-3.5 text-sm border-b border-slate-200 align-middle">{m.department}</td>
                    <td className="px-4 py-3.5 text-sm border-b border-slate-200 align-middle text-slate-400">-</td>
                  </tr>
                ))}
                {status.submitted.map((m: any) => (
                  <tr key={`s_${m.member ? m.member.id : m.id}`} className="transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3.5 text-sm border-b border-slate-200 align-middle"><span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500"><span className="w-2 h-2 rounded-full shrink-0 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span> 已交</span></td>
                    <td className="px-4 py-3.5 text-sm border-b border-slate-200 align-middle">{m.member ? (m.member.alias || m.member.name) : (m.alias || m.name)}</td>
                    <td className="px-4 py-3.5 text-sm border-b border-slate-200 align-middle">{m.member ? m.member.department : m.department}</td>
                    <td className="px-4 py-3.5 text-sm border-b border-slate-200 align-middle text-slate-400">{m.submitted_at ? format(parseISO(m.submitted_at), 'MM-dd HH:mm') : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showConfig && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-[1000] flex justify-center items-center animate-modal-in p-4 cursor-pointer"
          onClick={() => setShowConfig(false)}
        >
          <div 
            className="bg-white border border-slate-100 rounded-2xl p-6 w-full max-w-[420px] max-h-[90vh] overflow-y-auto shadow-[0_20px_50px_rgba(0,0,0,0.3)] cursor-default"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-4 mb-5 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">配置每周截止时间</h3>
              <button className="bg-transparent border-none text-slate-400 text-lg cursor-pointer p-1 transition-colors hover:text-slate-600 flex items-center justify-center rounded-full hover:bg-slate-50 w-7 h-7" onClick={() => setShowConfig(false)}>✕</button>
            </div>
            <form onSubmit={saveConfig} className="space-y-5">
              <div>
                <label className="block text-[13px] font-semibold text-slate-500 mb-2">截止星期</label>
                <div className="grid grid-cols-7 gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200/50">
                  {[
                    { label: '一', value: 0 },
                    { label: '二', value: 1 },
                    { label: '三', value: 2 },
                    { label: '四', value: 3 },
                    { label: '五', value: 4 },
                    { label: '六', value: 5 },
                    { label: '日', value: 6 }
                  ].map(item => (
                    <button
                      key={item.value}
                      type="button"
                      className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        configParams.day_of_week === item.value
                          ? 'bg-indigo-500 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
                      }`}
                      onClick={() => setConfigParams({ ...configParams, day_of_week: item.value })}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-500 mb-1.5">截止具体时间</label>
                <input
                  type="time"
                  className={inputClass}
                  required
                  value={`${String(configParams.hour).padStart(2, '0')}:${String(configParams.minute).padStart(2, '0')}`}
                  onChange={e => {
                    const [h, m] = e.target.value.split(':');
                    setConfigParams({
                      ...configParams,
                      hour: parseInt(h) || 0,
                      minute: parseInt(m) || 0
                    });
                  }}
                />
              </div>

              <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-start gap-3">
                <div className="pt-0.5">
                  <input
                    type="checkbox"
                    id="auto_send_enabled"
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                    checked={configParams.auto_send_enabled}
                    onChange={e => setConfigParams({ ...configParams, auto_send_enabled: e.target.checked })}
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="auto_send_enabled" className="text-sm font-semibold text-slate-900 cursor-pointer select-none block">
                    开启自动汇总发送
                  </label>
                  <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">到达截止时间后，自动通过 AI 汇总并向特定邮箱发送团队周报</p>
                </div>
              </div>

              {configParams.auto_send_enabled && (
                <div className="p-4 bg-indigo-50/20 border border-indigo-100/30 rounded-2xl space-y-4 animate-fade-in">
                  <div>
                    <label className="block text-[12px] font-semibold text-indigo-950/60 mb-1">
                      延迟发送时间 (分钟)
                    </label>
                    <input
                      type="number"
                      className="w-full px-3.5 py-2.5 bg-white border border-indigo-100 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/15"
                      min="0"
                      required
                      value={configParams.auto_send_delay}
                      onChange={e => setConfigParams({ ...configParams, auto_send_delay: Math.max(0, parseInt(e.target.value) || 0) })}
                    />
                    <p className="text-indigo-950/40 text-[10px] mt-1 leading-normal">设为 0 表示立即汇总发送，设置缓冲期可方便截止后成员补交</p>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-indigo-950/60 mb-1">
                      接收邮箱地址
                    </label>
                    <input
                      type="email"
                      className="w-full px-3.5 py-2.5 bg-white border border-indigo-100 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/15"
                      placeholder="leader@company.com"
                      required
                      value={configParams.auto_send_email}
                      onChange={e => setConfigParams({ ...configParams, auto_send_email: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingConfig}
                  className={`w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-500 text-white border-none rounded-xl text-[15px] font-bold cursor-pointer transition-all hover:bg-indigo-600 hover:shadow-[0_4px_20px_rgba(99,102,241,0.2)] ${
                    savingConfig ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {savingConfig ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      正在保存...
                    </>
                  ) : '保存配置'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
