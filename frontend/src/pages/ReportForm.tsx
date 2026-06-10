import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { showToast } from '../api';
import SimpleMDE from 'react-simplemde-editor';
import 'easymde/dist/easymde.min.css';

export default function ReportForm() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [memberId, setMemberId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res: any = await api.get('/pages/report-form');
      setData(res);
      if (res.default_template) {
        setTemplateId(String(res.default_template.id));
        setContent(res.default_template.content);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const loadTemplate = async (id: string) => {
    setTemplateId(id);
    if (!id) {
      setContent('');
      return;
    }
    try {
      const tpl: any = await api.get(`/templates/${id}`);
      setContent(tpl.content);
    } catch (e) {}
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId || !content.trim()) {
      showToast('请选择成员并填写内容', 'error');
      return;
    }
    
    try {
      setSubmitting(true);
      await api.post('/reports', {
        member_id: parseInt(memberId),
        template_id: templateId ? parseInt(templateId) : null,
        content: content.trim()
      });
      showToast('周报提交成功');
      setTimeout(() => navigate('/'), 1000);
    } catch (e) {
      setSubmitting(false);
    }
  };

  const mdeOptions = useMemo(() => {
    return {
      spellChecker: false,
      status: false,
      placeholder: "请输入本周工作内容...",
      renderingConfig: {
        singleLineBreaks: false,
        codeSyntaxHighlighting: true,
      }
    };
  }, []);

  if (loading || !data) return <div className="loading" style={{marginTop: 20}}><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>;

  return (
    <>
      <div className="page-header">
        <h2>提交周报</h2>
        <p>{data.period.week_start.split('T')[0]} 至 {data.period.week_end.split('T')[0]}</p>
      </div>

      <div className="card">
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label>选择成员 *</label>
            <select className="form-control" required value={memberId} onChange={e => setMemberId(e.target.value)}>
              <option value="">-- 请选择 --</option>
              {data.members.map((m: any) => (
                <option key={m.id} value={m.id}>{m.name}（{m.department}）</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>使用模板</label>
            <select className="form-control" value={templateId} onChange={e => loadTemplate(e.target.value)}>
              <option value="">-- 不使用模板 --</option>
              {data.templates.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name}{t.is_default ? ' (默认)' : ''}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{background: 'var(--bg-input)'}}>
            <label>周报内容 *</label>
            <SimpleMDE value={content} onChange={setContent} options={mdeOptions as any} />
          </div>

          <button type="submit" className="btn btn-primary btn-lg" style={{width: '100%'}} disabled={submitting}>
            {submitting ? '正在提交...' : '📤 提交周报'}
          </button>
        </form>
      </div>
    </>
  );
}
