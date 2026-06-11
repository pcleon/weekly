# 周报汇总系统

基于 FastAPI + LangChain + React 构建的智能周报汇总系统，支持 AI 自动汇总团队周报内容。

## 功能特性

### 核心功能

- **人员管理**：团队成员信息的增删改查，支持启用/禁用状态
- **周报模板**：预设模板内容，方便快速填写周报
- **周报录入**：团队成员按周提交周报，支持 Markdown 格式
- **AI 智能汇总**：使用 LangChain 调用 LLM 自动生成周报汇总
- **导出功能**：支持将汇总结果导出为 Word 文档（.docx）

### 特色功能

- **周期管理**：以周为周期，默认周五 15:00 截止，可自定义截止时间
- **状态提示**：清晰标记已录入/未录入人员状态
- **历史存档**：支持查看历史周报和汇总记录
- **SSO 单点登录**：支持 OAuth2/OIDC 协议的 SSO 登录

## 技术栈

### 后端

- **框架**：FastAPI 0.115.0
- **ORM**：SQLAlchemy 2.0.35
- **数据库**：MariaDB / MySQL 8.0+
- **AI**：LangChain + LangChain-OpenAI/Anthropic
- **认证**：Authlib（SSO）、itsdangerous（Token）
- **文档生成**：python-docx
- **日志**：Loguru

### 前端

- **框架**：React 19 + TypeScript
- **构建工具**：Vite 8
- **样式**：Tailwind CSS v4
- **Markdown 编辑器**：EasyMDE
- **路由**：React Router v7
- **HTTP 客户端**：Axios

## 项目结构

```
weekly/
├── app/                      # 后端应用
│   ├── api/                  # API 路由
│   │   ├── auth.py          # SSO 认证
│   │   ├── members.py       # 人员管理
│   │   ├── reports.py       # 周报管理
│   │   ├── summaries.py     # 汇总管理
│   │   ├── templates.py     # 模板管理 API
│   │   └── pages.py         # 页面聚合数据
│   ├── services/            # 业务逻辑
│   │   ├── report_service.py
│   │   └── summary_service.py
│   ├── uploads/             # 上传文件（模板附件等）
│   ├── config.py            # 配置管理
│   ├── database.py          # 数据库连接
│   ├── logger.py            # 日志配置
│   ├── main.py              # 应用入口
│   ├── models.py            # 数据模型
│   ├── schemas.py           # Pydantic 模型
│   ├── system_prompt.txt    # AI 系统提示词
│   └── prompt_template.txt  # 用户提示词模板
├── frontend/                 # 前端应用
│   ├── src/                  # 源代码
│   ├── dist/                 # 构建产物
│   └── package.json
├── alembic/                  # 数据库迁移
├── logs/                     # 日志目录
├── .env                       # 环境配置
├── .env_example              # 环境配置模板
├── requirements.txt          # Python 依赖
├── deploy.md                 # 部署指南
└── readme.md                 # 本文件
```

## 快速开始

### 环境要求

- Python 3.10+
- Node.js 18+
- MySQL 8.0+ / MariaDB

### 安装步骤

1. **克隆项目**

```bash
git clone <repository-url>
cd weekly
```

2. **配置环境变量**

```bash
cp .env_example .env
# 编辑 .env 文件，填入数据库和 LLM 配置
```

3. **后端安装与初始化**

```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 创建数据库
mysql -u root -p -e "CREATE DATABASE weekly_report CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 执行数据库迁移
alembic upgrade head
```

4. **前端构建**

```bash
cd frontend
npm install
npm run build
cd ..
```

5. **启动服务**

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

访问 `http://localhost:8000` 即可使用。

## 配置说明

### 环境变量（.env）

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `DB_HOST` | 数据库地址 | `localhost` |
| `DB_PORT` | 数据库端口 | `3306` |
| `DB_USER` | 数据库用户名 | `root` |
| `DB_PASSWORD` | 数据库密码 | `password` |
| `DB_NAME` | 数据库名称 | `weekly_report` |
| `LLM_API_KEY` | LLM API 密钥 | `sk-xxx` |
| `LLM_API_BASE` | LLM API 地址 | `https://api.openai.com/v1` |
| `LLM_MODEL` | LLM 模型名称 | `gpt-4o` |
| `APP_TITLE` | 应用标题 | `周报汇总系统` |
| `TIMEZONE` | 时区 | `Asia/Shanghai` |
| `ENABLE_SSO` | 是否启用 SSO | `True` |
| `SSO_CLIENT_ID` | SSO 客户端 ID | - |
| `SSO_CLIENT_SECRET` | SSO 客户端密钥 | - |
| `SSO_AUTHORIZE_URL` | SSO 授权地址 | - |
| `SSO_TOKEN_URL` | SSO Token 地址 | - |
| `SSO_USERINFO_URL` | SSO 用户信息地址 | - |
| `SSO_SECRET_KEY` | SSO 会话密钥 | - |

## API 接口

### 认证

- `GET /api/auth/login` - SSO 登录
- `GET /api/auth/callback` - SSO 回调
- `POST /api/auth/logout` - 退出登录
- `GET /api/auth/me` - 获取当前用户信息

### 人员管理

- `GET /api/members` - 获取人员列表
- `POST /api/members` - 创建人员
- `PUT /api/members/{id}` - 更新人员
- `DELETE /api/members/{id}` - 删除人员

### 周报管理

- `GET /api/reports` - 获取周报列表
- `POST /api/reports` - 提交周报
- `PUT /api/reports/{id}` - 更新周报
- `GET /api/reports/status` - 获取当前周期提交状态

### 模板管理

- `GET /api/templates` - 获取模板列表
- `POST /api/templates` - 创建模板
- `PUT /api/templates/{id}` - 更新模板
- `DELETE /api/templates/{id}` - 删除模板

### 汇总管理

- `GET /api/summaries` - 获取汇总列表
- `POST /api/summaries/generate` - 生成 AI 汇总
- `GET /api/summaries/{id}` - 获取汇总详情
- `PUT /api/summaries/{id}` - 更新汇总内容
- `DELETE /api/summaries/{id}` - 删除汇总
- `GET /api/summaries/{id}/download` - 下载 Word 文档

### 系统设置

- `GET /api/settings/deadline` - 获取截止时间配置
- `PUT /api/settings/deadline` - 更新截止时间配置
- `POST /api/settings/period/extend` - 延长/缩短当前周期

## 部署指南

详细的生产环境部署指南请参考 [deploy.md](./deploy.md)。

## 开发

### 开发模式

```bash
# 后端
uvicorn app.main:app --reload

# 前端（另一个终端）
cd frontend
npm run dev
```

### 数据库迁移

```bash
# 生成迁移文件
alembic revision --autogenerate -m "描述"

# 执行迁移
alembic upgrade head
```

## License

MIT