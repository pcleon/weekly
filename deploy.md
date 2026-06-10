# 周报汇总系统部署指南

本文档介绍了如何将本系统（前端 React + 后端 FastAPI）部署到生产环境中。由于后端已经配置好了静态文件代理，所以在生产环境中，前端会被编译为静态文件并由 FastAPI 后端统一提供服务，这样只需运行一个服务端口即可。

## 一、环境准备

在开始部署前，请确保服务器已安装以下环境：
1. **Python 3.10+**（推荐使用虚拟环境）
2. **Node.js 18+** 和 npm（用于构建前端工程）
3. **MySQL 8.0+**（用于数据存储）

## 二、前端构建

1. 进入前端目录并安装依赖：
   ```bash
   cd frontend
   npm install
   ```

2. 执行生产环境构建：
   ```bash
   npm run build
   ```
   *构建完成后，会在 `frontend/dist` 目录下生成静态文件。后端的代码会自动将所有未知路由代理到此 `dist/index.html` 以及挂载 `assets` 目录。*

## 三、后端准备与数据库配置

1. 返回项目根目录并创建 Python 虚拟环境（假设您使用的是 `python3`）：
   ```bash
   cd ..
   python3 -m venv venv
   source venv/bin/activate
   ```

2. 安装后端依赖：
   ```bash
   pip install -r requirements.txt
   ```

3. 准备配置文件：
   复制环境配置模板并进行修改：
   ```bash
   cp .env_example .env
   ```
   修改 `.env` 文件，填入真实的数据库连接信息（如数据库用户名、密码、地址、库名等），以及需要的其他配置（如 LLM 的 API Key 等）。

4. 创建数据库：
   在 MySQL 中创建对应的数据库（必须与 `.env` 中配置的数据库名称一致）：
   ```sql
   CREATE DATABASE weekly_report CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

5. 执行数据库迁移（初始化表结构）：
   ```bash
   alembic upgrade head
   ```

## 四、启动服务

在确认前三步无误后，可以直接通过 `uvicorn` 启动服务：

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
服务启动后，通过浏览器访问 `http://服务器IP:8000` 即可看到系统页面。

---

## 五、生产环境进阶配置（推荐）

在正式的生产环境中，不建议直接在前台运行 `uvicorn`。通常我们会结合 `Systemd` 和 `Nginx` 来实现进程守护与反向代理。

### 1. 使用 Supervisor 守护进程

首先确保已安装 Supervisor（以 Ubuntu/Debian 为例）：
```bash
sudo apt-get install supervisor
```

创建一个 Supervisor 配置文件 `/etc/supervisor/conf.d/weekly.conf`：

```ini
[program:weekly]
command=/path/to/your/project/weekly/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
directory=/path/to/your/project/weekly
user=your_user
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
stderr_logfile=/var/log/weekly.err.log
stdout_logfile=/var/log/weekly.out.log
```
*请将上述路径和用户替换为您服务器上的实际路径，然后更新并启动服务：*
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start weekly
```

### 2. 使用 Nginx 反向代理

在 `/etc/nginx/sites-available/weekly` 中配置 Nginx：

```nginx
server {
    listen 80;
    server_name your_domain.com; # 您的域名或服务器公网 IP

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
*启用配置并重启 Nginx：*
```bash
sudo ln -s /etc/nginx/sites-available/weekly /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```
完成以上步骤后，您就可以通过 80 端口（或域名）稳定地访问周报汇总系统了。
