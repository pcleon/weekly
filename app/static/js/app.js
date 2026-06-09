/**
 * 周报汇总系统 - 前端交互逻辑
 */

// ── 通用工具 ──────────────────────────────────

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

async function api(url, options = {}) {
  const defaults = {
    headers: { 'Content-Type': 'application/json' },
  };
  const resp = await fetch(url, { ...defaults, ...options });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: '请求失败' }));
    throw new Error(err.detail || '请求失败');
  }
  return resp.json();
}

// ── 模态框 ────────────────────────────────────

function openModal(id) {
  document.getElementById(id).classList.add('show');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('show');
}

// 点击 overlay 关闭
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('show');
  }
});

// ── 倒计时 ────────────────────────────────────

function startCountdown(deadlineStr) {
  const el = document.getElementById('countdown');
  if (!el || !deadlineStr) return;

  function update() {
    const now = new Date();
    const deadline = new Date(deadlineStr);
    let diff = Math.max(0, deadline - now);

    const d = Math.floor(diff / 86400000); diff %= 86400000;
    const h = Math.floor(diff / 3600000);  diff %= 3600000;
    const m = Math.floor(diff / 60000);    diff %= 60000;
    const s = Math.floor(diff / 1000);

    el.innerHTML = `
      <div class="countdown-item"><div class="num">${d}</div><div class="unit">天</div></div>
      <div class="countdown-item"><div class="num">${String(h).padStart(2,'0')}</div><div class="unit">时</div></div>
      <div class="countdown-item"><div class="num">${String(m).padStart(2,'0')}</div><div class="unit">分</div></div>
      <div class="countdown-item"><div class="num">${String(s).padStart(2,'0')}</div><div class="unit">秒</div></div>
    `;
  }

  update();
  setInterval(update, 1000);
}

// ── 人员管理 ──────────────────────────────────

async function addMember(e) {
  e.preventDefault();
  const form = e.target;
  const name = form.querySelector('[name="name"]').value.trim();
  const department = form.querySelector('[name="department"]').value.trim();

  if (!name) { showToast('请输入姓名', 'error'); return; }

  try {
    await api('/api/members', {
      method: 'POST',
      body: JSON.stringify({ name, department }),
    });
    showToast('添加成功');
    closeModal('addMemberModal');
    location.reload();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function toggleMember(id, isActive) {
  try {
    await api(`/api/members/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: !isActive }),
    });
    showToast(isActive ? '已禁用' : '已启用');
    location.reload();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── 模板管理 ──────────────────────────────────

async function addTemplate(e) {
  e.preventDefault();
  const form = e.target;
  const name = form.querySelector('[name="name"]').value.trim();
  const content = form.querySelector('[name="content"]').value.trim();
  const is_default = form.querySelector('[name="is_default"]')?.checked || false;

  if (!name || !content) { showToast('请填写完整', 'error'); return; }

  try {
    await api('/api/templates', {
      method: 'POST',
      body: JSON.stringify({ name, content, is_default }),
    });
    showToast('模板创建成功');
    closeModal('addTemplateModal');
    location.reload();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteTemplate(id) {
  if (!confirm('确认删除此模板？')) return;
  try {
    await api(`/api/templates/${id}`, { method: 'DELETE' });
    showToast('已删除');
    location.reload();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function setDefaultTemplate(id) {
  try {
    await api(`/api/templates/${id}/default`, { method: 'PUT' });
    showToast('已设为默认');
    location.reload();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── 周报提交 ──────────────────────────────────

async function loadTemplate(selectEl) {
  const id = selectEl.value;
  if (!id) return;
  try {
    const tpl = await api(`/api/templates/${id}`);
    document.getElementById('reportContent').value = tpl.content;
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function submitReport(e) {
  e.preventDefault();
  const form = e.target;
  const member_id = parseInt(form.querySelector('[name="member_id"]').value);
  const template_id = form.querySelector('[name="template_id"]').value || null;
  const content = form.querySelector('[name="content"]').value.trim();

  if (!member_id || !content) { showToast('请选择成员并填写内容', 'error'); return; }

  try {
    await api('/api/reports', {
      method: 'POST',
      body: JSON.stringify({
        member_id,
        template_id: template_id ? parseInt(template_id) : null,
        content,
      }),
    });
    showToast('周报提交成功');
    setTimeout(() => location.href = '/', 1000);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── 汇总生成 ──────────────────────────────────

async function generateSummary() {
  const btn = document.getElementById('generateBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span> 生成中...';
  }

  try {
    const result = await api('/api/summaries/generate', { method: 'POST' });
    showToast('汇总生成成功');
    location.reload();
  } catch (err) {
    showToast(err.message, 'error');
    if (btn) {
      btn.disabled = false;
      btn.textContent = '🤖 生成汇总';
    }
  }
}
