import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { showToast } from '../api';
import SimpleMDE from 'react-simplemde-editor';
import 'easymde/dist/easymde.min.css';
import 'font-awesome/css/font-awesome.min.css';
import { Send } from 'lucide-react';

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
      autoDownloadFontAwesome: false,
      spellChecker: false,
      status: false,
      placeholder: "请输入本周工作内容...",
      renderingConfig: {
        singleLineBreaks: false,
        codeSyntaxHighlighting: true,
      }
    };
  }, []);

  if (loading || !data) return <div className="inline-flex items-center gap-1 mt-5"><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-load-pulse"></div><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-load-pulse delay-150"></div><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-load-pulse delay-300"></div></div>;

  const selectClass = "w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm transition-colors focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/15 appearance-none bg-[url('data:image/svg+xml,%3Csvg_xmlns=%22http://www.w3.org/2000/svg%22_width=%2212%22_height=%2212%22_viewBox=%220_0_24_24%22_fill=%22none%22_stroke=%22%239ca3b0%22_stroke-width=%222%22%3E%3Cpath_d=%22M6_9l6_6_6-6%22/%3E%3C/svg%3E')] bg-no-repeat bg-[position:right_12px_center] pr-9";

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight">提交周报</h2>
        <p className="text-slate-500 text-sm mt-1">{data.period.week_start.split('T')[0]} 至 {data.period.week_end.split('T')[0]}</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-5 transition-colors hover:border-indigo-500/30">
        <form onSubmit={onSubmit}>
          <div className="mb-5">
            <label className="block text-[13px] font-semibold text-slate-500 mb-1.5">选择成员 *</label>
            <select className={selectClass} required value={memberId} onChange={e => setMemberId(e.target.value)}>
              <option value="">-- 请选择 --</option>
              {data.members.map((m: any) => (
                <option key={m.id} value={m.id}>{m.name}（{m.department}）</option>
              ))}
            </select>
          </div>

          <div className="mb-5">
            <label className="block text-[13px] font-semibold text-slate-500 mb-1.5">使用模板</label>
            <select className={selectClass} value={templateId} onChange={e => loadTemplate(e.target.value)}>
              <option value="">-- 不使用模板 --</option>
              {data.templates.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name}{t.is_default ? ' (默认)' : ''}</option>
              ))}
            </select>
          </div>

          <div className="mb-5 bg-white">
            <label className="block text-[13px] font-semibold text-slate-500 mb-1.5">周报内容 *</label>
            <SimpleMDE value={content} onChange={setContent} options={mdeOptions as any} />
          </div>

          <button type="submit" className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-500 text-white border-none rounded-lg text-[15px] font-semibold cursor-pointer transition-all hover:bg-indigo-600 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] disabled:opacity-70 disabled:cursor-not-allowed" disabled={submitting}>
            {submitting ? '正在提交...' : <><Send size={18} /> 提交周报</>}
          </button>
        </form>
      </div>
    </>
  );
}
