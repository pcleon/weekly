import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { showToast } from '../api';
import { format, differenceInSeconds, parseISO } from 'date-fns';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0, expired: false });
  const [showConfig, setShowConfig] = useState(false);
  const [configParams, setConfigParams] = useState({ day_of_week: 0, hour: 0, minute: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/pages/dashboard');
      setData(res);
    } catch (error) {
      // Error handled by api interceptor
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
        minute: res.minute
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

  if (loading || !data) return <div className="loading" style={{ marginTop: 20 }}><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>;

  const { period, status, deadline_str } = data;

  const isoWeek = (dateStr: string) => {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  };

  return (
    <>
      <div className="page-header">
        <h2>仪表盘</h2>
        <p>{period.week_start.split('T')[0]} 至 {period.week_end.split('T')[0]} · 截止时间：{format(parseISO(period.deadline), 'MM-dd HH:mm')}</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card accent">
          <div className="label">当前周期</div>
          <div className="value">第{isoWeek(period.week_start)}周</div>
        </div>
        <div className="stat-card success">
          <div className="label">已提交</div>
          <div className="value">{status.submitted_count}</div>
        </div>
        <div className="stat-card danger">
          <div className="label">未提交</div>
          <div className="value">{status.total - status.submitted_count}</div>
        </div>
        <div className="stat-card warning">
          <div className="label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>截止倒计时 ({deadline_str})</span>
            <div>
              <button className="btn btn-sm btn-secondary" onClick={() => extendPeriod(1)} style={{ padding: '2px 8px', fontSize: 12, background: 'var(--bg-primary)', marginRight: 4 }} title="如果遇到节假日，可将当前收集周期顺延一周">📅 顺延</button>
              <button className="btn btn-sm btn-secondary" onClick={openConfig} style={{ padding: '2px 8px', fontSize: 12, background: 'var(--bg-primary)' }}>⚙️ 设置</button>
            </div>
          </div>
          <div className="countdown" style={{ background: '#f0f0f0', color: '#333', padding: '6px', borderRadius: '6px', textAlign: 'center', fontFamily: 'monospace', fontSize: 18, marginTop: 8 }}>
            {timeLeft.expired ? '已截止' : (
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                <div className="countdown-item"><div className="num">{String(timeLeft.d).padStart(2, '0')}</div><div className="unit">天</div></div>
                <div className="countdown-item"><div className="num">{String(timeLeft.h).padStart(2, '0')}</div><div className="unit">时</div></div>
                <div className="countdown-item"><div className="num">{String(timeLeft.m).padStart(2, '0')}</div><div className="unit">分</div></div>
                <div className="countdown-item"><div className="num">{String(timeLeft.s).padStart(2, '0')}</div><div className="unit">秒</div></div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>提交状态一览</h3>
          <Link to="/report/new" className="btn btn-primary btn-sm">📝 提交周报</Link>
        </div>

        {status.total === 0 ? (
          <div className="empty-state">
            <div className="icon">👥</div>
            <p>暂无团队成员，请先<Link to="/members" style={{ color: 'var(--accent)' }}>添加成员</Link></p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>状态</th>
                  <th>姓名</th>
                  <th>团队</th>
                  <th>提交时间</th>
                </tr>
              </thead>
              <tbody>
                {status.not_submitted.map((m: any) => (
                  <tr key={`n_${m.id}`}>
                    <td><span className="badge not-submitted"><span className="dot no"></span> 未交</span></td>
                    <td>{m.name}</td>
                    <td>{m.department}</td>
                    <td style={{ color: 'var(--text-muted)' }}>-</td>
                  </tr>
                ))}
                {status.submitted.map((m: any) => (
                  <tr key={`s_${m.id}`}>
                    <td><span className="badge submitted"><span className="dot yes"></span> 已交</span></td>
                    <td>{m.member ? m.member.name : m.name}</td>
                    <td>{m.member ? m.member.department : m.department}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{m.submitted_at ? format(parseISO(m.submitted_at), 'MM-dd HH:mm') : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 配置截止时间模态框 */}
      {showConfig && (
        <div className="modal-overlay show" id="deadlineConfigModal">
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3>配置每周截止时间</h3>
              <button className="modal-close" onClick={() => setShowConfig(false)}>✕</button>
            </div>
            <form onSubmit={saveConfig}>
              <div className="form-group">
                <label>星期</label>
                <select
                  className="form-control"
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
              <div className="form-group" style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label>小时 (0-23)</label>
                  <input type="number" className="form-control" min="0" max="23" required
                    value={configParams.hour}
                    onChange={e => setConfigParams({ ...configParams, hour: parseInt(e.target.value) })}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label>分钟 (0-59)</label>
                  <input type="number" className="form-control" min="0" max="59" required
                    value={configParams.minute}
                    onChange={e => setConfigParams({ ...configParams, minute: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>保存</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
