import { LockKeyhole } from 'lucide-react';

export default function Login() {
  const handleLogin = () => {
    window.location.href = '/api/auth/login';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-sm w-full shadow-[0_4px_20px_rgba(0,0,0,0.05)] text-center animate-modal-in">
        <div className="w-16 h-16 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <LockKeyhole size={32} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">周报汇总系统</h1>
        <p className="text-slate-500 text-sm mb-8">请登录以继续访问系统</p>
        
        <button 
          onClick={handleLogin}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-500 text-white border-none rounded-xl text-[15px] font-semibold cursor-pointer transition-all hover:bg-indigo-600 hover:shadow-[0_0_20px_rgba(99,102,241,0.25)] hover:-translate-y-0.5"
        >
          单点登录 (SSO)
        </button>
      </div>
      <p className="mt-8 text-xs text-slate-400">
        &copy; {new Date().getFullYear()} 周报汇总系统
      </p>
    </div>
  );
}
