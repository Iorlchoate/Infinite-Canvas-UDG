"""打印本机在局域网中的 IPv4 地址，供 start.bat 提示手机 / 平板访问地址。

优先取默认路由出口网卡（UDP connect 不发包），失败时回退到 hostname 解析。
"""

import socket
import sys


def lan_ip() -> str:
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("8.8.8.8", 80))
        return sock.getsockname()[0]
    except OSError:
        pass
    finally:
        sock.close()
    try:
        return socket.gethostbyname(socket.gethostname())
    except OSError:
        return "127.0.0.1"


if __name__ == "__main__":
    ip = lan_ip()
    if len(sys.argv) > 1 and sys.argv[1] == "--quiet":
        print(ip)
    else:
        print(ip)
