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
      const res: any = await api.put('/settings/deadline', configParams);
      showToast(res.message || '保存成功');
      setShowConfig(false);
      fetchData();
    } catch (e) { }
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
  const selectClass = `${inputClass} appearance-none bg-[url('data:image/svg+xml,%3Csvg_xmlns=%22http://www.w3.org/2000/svg%22_width=%2212%22_height=%2212%22_viewBox=%220_0_24_24%22_fill=%22none%22_stroke=%22%239ca3b0%22_stroke-width=%222%22%3E%3Cpath_d=%22M6_9l6_6_6-6%22/%3E%3C/svg%3E')] bg-no-repeat bg-[position:right_12px_center] pr-9`;

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight">仪表盘</h2>
        <p className="text-slate-500 text-sm mt-1">{period.week_start.split('T')[0]} 至 {period.week_end.split('T')[0]} · 截止时间：{format(parseISO(period.deadline), 'MM-dd HH:mm')}</p>
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
            <span>截止倒计时 ({deadline_str})</span>
            <div className="flex gap-1">
              <button className="bg-slate-50 text-slate-900 border border-slate-200 hover:bg-slate-100 hover:border-indigo-500 inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded transition-all cursor-pointer" onClick={() => extendPeriod(1)} title="如果遇到节假日，可将当前收集周期顺延一周"><CalendarClock size={12} /> 顺延</button>
              <button className="bg-slate-50 text-slate-900 border border-slate-200 hover:bg-slate-100 hover:border-indigo-500 inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded transition-all cursor-pointer" onClick={openConfig}><Settings size={12} /> 设置</button>
            </div>
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
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">姓名</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">团队</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">提交时间</th>
                </tr>
              </thead>
              <tbody>
                {status.not_submitted.map((m: any) => (
                  <tr key={`n_${m.id}`} className="transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3.5 text-sm border-b border-slate-200 align-middle"><span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-500"><span className="w-2 h-2 rounded-full shrink-0 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span> 未交</span></td>
                    <td className="px-4 py-3.5 text-sm border-b border-slate-200 align-middle">{m.name}</td>
                    <td className="px-4 py-3.5 text-sm border-b border-slate-200 align-middle">{m.department}</td>
                    <td className="px-4 py-3.5 text-sm border-b border-slate-200 align-middle text-slate-400">-</td>
                  </tr>
                ))}
                {status.submitted.map((m: any) => (
                  <tr key={`s_${m.member ? m.member.id : m.id}`} className="transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3.5 text-sm border-b border-slate-200 align-middle"><span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500"><span className="w-2 h-2 rounded-full shrink-0 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span> 已交</span></td>
                    <td className="px-4 py-3.5 text-sm border-b border-slate-200 align-middle">{m.member ? m.member.name : m.name}</td>
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex justify-center items-center animate-modal-in">
          <div className="bg-white border border-slate-200 rounded-2xl p-7 w-[90%] max-w-[400px] max-h-[85vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">配置每周截止时间</h3>
              <button className="bg-transparent border-none text-slate-500 text-xl cursor-pointer p-1 transition-colors hover:text-slate-900" onClick={() => setShowConfig(false)}>✕</button>
            </div>
            <form onSubmit={saveConfig}>
              <div className="mb-5">
                <label className="block text-[13px] font-semibold text-slate-500 mb-1.5">星期</label>
                <select
                  className={selectClass}
                  value={configParams.day_of_week}
                  onChange={e => setConfigParams({ ...configParams, day_of_week: parseInt(e.target.value) })}
                >
                  <option value="0">周一</option>
                  <option value="1">周二</option>
                  <option value="2">周三</option>
                  <option value="3">周四</option>
                  <option value="4">周五</option>
                  <option value="5">周六</option>
                  <option value="6">周日</option>
                </select>
              </div>
              <div className="mb-5 flex gap-2.5">
                <div className="flex-1">
                  <label className="block text-[13px] font-semibold text-slate-500 mb-1.5">小时 (0-23)</label>
                  <input type="number" className={inputClass} min="0" max="23" required
                    value={configParams.hour}
                    onChange={e => setConfigParams({ ...configParams, hour: parseInt(e.target.value) })}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[13px] font-semibold text-slate-500 mb-1.5">分钟 (0-59)</label>
                  <input type="number" className={inputClass} min="0" max="59" required
                    value={configParams.minute}
                    onChange={e => setConfigParams({ ...configParams, minute: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div className="mb-5">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="auto_send_enabled"
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                    checked={configParams.auto_send_enabled}
                    onChange={e => setConfigParams({ ...configParams, auto_send_enabled: e.target.checked })}
                  />
                  <label htmlFor="auto_send_enabled" className="text-[13px] font-semibold text-slate-500 cursor-pointer select-none">开启截止后自动汇总发送</label>
                </div>
              </div>
              {configParams.auto_send_enabled && (
                <>
                  <div className="mb-5 flex gap-2.5">
                    <div className="flex-1">
                      <label className="block text-[13px] font-semibold text-slate-500 mb-1.5">延迟发送时间 (分钟)</label>
                      <input type="number" className={inputClass} min="0" required
                        value={configParams.auto_send_delay}
                        onChange={e => setConfigParams({ ...configParams, auto_send_delay: Math.max(0, parseInt(e.target.value) || 0) })}
                      />
                    </div>
                  </div>
                  <div className="mb-5">
                    <label className="block text-[13px] font-semibold text-slate-500 mb-1.5">接收邮箱地址</label>
                    <input type="email" className={inputClass} placeholder="example@mail.com" required
                      value={configParams.auto_send_email}
                      onChange={e => setConfigParams({ ...configParams, auto_send_email: e.target.value })}
                    />
                  </div>
                </>
              )}
              <button type="submit" className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-500 text-white border-none rounded-lg text-[15px] font-semibold cursor-pointer transition-all hover:bg-indigo-600 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]">保存</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
