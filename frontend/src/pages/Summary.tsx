import { useEffect, useState } from 'react';
import api, { showToast } from '../api';
import { format, parseISO } from 'date-fns';
import { marked } from 'marked';

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

  if (loading || !data) return <div className="loading" style={{marginTop: 20}}><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>;

  return (
    <>
      <div className="page-header">
        <h2>AI 汇总</h2>
        <p>使用 AI 智能汇总团队周报</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>当前周期汇总</h3>
          <div style={{display: 'flex', gap: 10}}>
            <button className="btn btn-secondary" onClick={openConfig}>⚙️ 周报汇总模板</button>
            <button className="btn btn-primary" onClick={generateSummary} disabled={generating}>
              {generating ? '正在生成...' : '🤖 生成汇总'}
            </button>
          </div>
        </div>
        <p style={{color: 'var(--text-secondary)', fontSize: 14}}>
          点击按钮将对本周所有已提交的周报进行 AI 智能汇总。
          {data.current_summary && (
            <><br/><span style={{color: 'var(--accent)', fontWeight: 600}}>
              (本周期最近一次生成时间：{format(parseISO(data.current_summary.generated_at), 'yyyy-MM-dd HH:mm')})
            </span></>
          )}
          {data.last_report && (
            <><br/><span style={{color: 'var(--accent)', fontWeight: 600}}>
              (最后提交人员：{data.last_report.member.name} - {format(parseISO(data.last_report.submitted_at), 'yyyy-MM-dd HH:mm')})
            </span></>
          )}
        </p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>历史汇总记录</h3>
        </div>

        {data.summaries.length > 0 ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>周期</th>
                  <th>生成时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {data.summaries.map((s: any) => (
                  <tr key={s.id}>
                    <td>{s.week_period.week_start.split('T')[0]} ~ {s.week_period.week_end.split('T')[0]}</td>
                    <td>{format(parseISO(s.generated_at), 'yyyy-MM-dd HH:mm')}</td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => setViewSummary(s)} style={{marginRight: 4}}>查看</button>
                      <a href={`/api/summaries/${s.id}/download`} className="btn btn-primary btn-sm" style={{textDecoration: 'none', color: 'white', marginRight: 4}}>下载</a>
                      {s.week_period_id === data.current_period_id ? (
                        <button className="btn btn-danger btn-sm" onClick={() => deleteSummary(s.id)}>删除</button>
                      ) : (
                        <button className="btn btn-danger btn-sm" disabled title="历史周期不可修改">删除</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="icon">🤖</div>
            <p>暂无汇总记录，请先生成</p>
          </div>
        )}
      </div>

      {/* 查看汇总详情模态框 */}
      {viewSummary && (
        <div className="modal-overlay show">
          <div className="modal" style={{maxWidth: 800}}>
            <div className="modal-header">
              <h3>汇总报告详情</h3>
              <button className="modal-close" onClick={() => setViewSummary(null)}>✕</button>
            </div>
            <div className="summary-content" dangerouslySetInnerHTML={{ __html: marked.parse(viewSummary.summary_content) as string }}></div>
          </div>
        </div>
      )}

      {/* 配置提示词模态框 */}
      {showConfig && (
        <div className="modal-overlay show">
          <div className="modal" style={{maxWidth: 800}}>
            <div className="modal-header">
              <h3>配置汇总提示词</h3>
              <button className="modal-close" onClick={() => setShowConfig(false)}>✕</button>
            </div>
            <form onSubmit={saveConfig}>
              <div className="form-group">
                <label>系统设定与指令 (System Prompt)</label>
                <p style={{fontSize: 12, color: 'var(--text-muted)', marginBottom: 8}}>告诉大模型它的角色以及必须遵守的规则。</p>
                <textarea className="form-control" style={{minHeight: 120, fontFamily: 'monospace'}}
                  value={promptConfig.system_prompt} onChange={e => setPromptConfig({...promptConfig, system_prompt: e.target.value})}></textarea>
              </div>
              <div className="form-group">
                <label>汇总 Markdown 模板 (User Template)</label>
                <p style={{fontSize: 12, color: 'var(--text-muted)', marginBottom: 8}}>在此处编辑最终期望生成的周报框架排版结构。</p>
                <textarea className="form-control" style={{minHeight: 300, fontFamily: 'monospace'}}
                  value={promptConfig.user_template} onChange={e => setPromptConfig({...promptConfig, user_template: e.target.value})}></textarea>
              </div>
              <button type="submit" className="btn btn-primary btn-lg" style={{width: '100%'}}>保存配置</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
