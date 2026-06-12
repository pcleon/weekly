import os
import argparse
import httpx
from typing import List, Union

# 尝试加载本地环境变量，以支持独立的命令行运行模式
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


def send_mail(
    subject: str,
    body: str,
    to: Union[str, List[str]],
    attach: List[str] = None
) -> httpx.Response:
    """邮件发送工具的通用发送库函数。

    使用 httpx 替换原本的 requests 发送 POST 请求，实现附件和主题正文的推送。

    Args:
        subject: 邮件主题。
        body: 邮件正文。
        to: 收件人，可以是单个邮箱、逗号分隔的多邮箱或邮箱列表。
        attach: 物理附件文件路径列表。

    Returns:
        httpx.Response 响应对象。
    """
    url = os.getenv("MAIL_URL", "http://localhost:8888/api/mail/send")
    token = os.getenv("MAIL_TOKEN", "default_token")

    if isinstance(to, list):
        to_str = ",".join(to)
    else:
        to_str = str(to)

    # 封装基础表单属性
    data = {
        "subject": subject,
        "body": body,
        "to": to_str
    }

    # 包装待上传的多文件对象
    files = []
    file_handles = []
    if attach:
        for filepath in attach:
            if os.path.exists(filepath):
                filename = os.path.basename(filepath)
                try:
                    f = open(filepath, "rb")
                    file_handles.append(f)
                    files.append(("attach", (filename, f)))
                except Exception as e:
                    print(f"打开附件 {filepath} 失败: {e}")
            else:
                print(f"附件文件路径不存在: {filepath}")

    try:
        headers = {"token": token}
        # 使用 httpx 替换原 requests.post 的实现，满足 SSL 忽略与超时要求
        with httpx.Client(verify=False, timeout=60.0) as client:
            response = client.post(
                url,
                data=data,
                files=files,
                headers=headers
            )
            response.raise_for_status()
            return response
    finally:
        # 确保生命周期结束时清理关闭文件流
        for fh in file_handles:
            fh.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="邮件发送工具--支持主题、正文、多个收件人、多个附件")
    parser.add_argument("--subject", required=True, help="邮件主题")
    parser.add_argument("--body", required=True, help="邮件正文")
    parser.add_argument("-to", "--to", action="append", required=True, help="收件人，可多次指定添加多个")
    parser.add_argument("-attach", "--attach", action="append", help="附件文件路径，可多次指定添加多个")

    args = parser.parse_args()

    try:
        res = send_mail(
            subject=args.subject,
            body=args.body,
            to=args.to,
            attach=args.attach
        )
        print(f"邮件投递成功，状态码: {res.status_code}, 响应: {res.text}")
    except Exception as e:
        print(f"邮件投递发生异常: {e}")
        import sys
        sys.exit(1)
