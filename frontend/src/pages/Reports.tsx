import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { showToast } from '../api';
import { format, parseISO } from 'date-fns';
import { marked } from 'marked';
import SimpleMDE from 'react-simplemde-editor';
import 'easymde/dist/easymde.min.css';

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

  if (loading || !data) return <div className="loading" style={{marginTop: 20}}><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>;

  return (
    <>
      <div className="page-header">
        <h2>存档管理</h2>
        <p>查看历史周报记录</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>历史周报</h3>
          <div>
            <select className="form-control" style={{ width: 'auto', display: 'inline-block' }} value={searchParams.get('period_id') || ''} onChange={handleFilter}>
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
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>成员</th>
                  <th>团队</th>
                  <th>周期</th>
                  <th>提交时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {data.reports.map((r: any) => (
                  <tr key={r.id}>
                    <td>{r.member.name}</td>
                    <td>{r.member.department}</td>
                    <td>{r.week_period.week_start.split('T')[0]} ~ {r.week_period.week_end.split('T')[0]}</td>
                    <td>{r.submitted_at ? format(parseISO(r.submitted_at), 'MM-dd HH:mm') : ''}</td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => openView(r)} style={{marginRight: 4}}>查看</button>
                      {r.week_period_id === data.current_period_id ? (
                        <button className="btn btn-primary btn-sm" onClick={() => openEdit(r)} style={{marginRight: 4}}>重新提交</button>
                      ) : (
                        <button className="btn btn-primary btn-sm" disabled title="历史周期不可修改" style={{marginRight: 4}}>重新提交</button>
                      )}
                      <button className="btn btn-danger btn-sm" onClick={() => deleteReport(r.id)}>删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="icon">📂</div>
            <p>暂无周报记录</p>
          </div>
        )}
      </div>

      {viewReport && (
        <div className="modal-overlay show">
          <div className="modal" style={{ maxWidth: 720 }}>
            <div className="modal-header">
              <h3>{viewReport.member?.name} 的周报</h3>
              <button className="modal-close" onClick={() => setViewReport(null)}>✕</button>
            </div>
            <div className="summary-content" style={{ minHeight: 200 }} dangerouslySetInnerHTML={{ __html: marked.parse(viewReport.content) as string }}></div>
          </div>
        </div>
      )}

      {editReport && (
        <div className="modal-overlay show">
          <div className="modal" style={{ maxWidth: 800 }}>
            <div className="modal-header">
              <h3>重新提交周报</h3>
              <button className="modal-close" onClick={() => setEditReport(null)}>✕</button>
            </div>
            <form onSubmit={submitEdit}>
              <div className="form-group" style={{background: 'var(--bg-input)'}}>
                <SimpleMDE value={editContent} onChange={setEditContent} options={{ spellChecker: false, status: false } as any} />
              </div>
              <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={submitting}>保存提交</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
