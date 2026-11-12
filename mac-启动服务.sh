#!/bin/bash
cd "$(dirname "$0")"
LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)"
if [ -z "$LAN_IP" ]; then
  LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
fi
if [ -z "$LAN_IP" ]; then
  LAN_IP="127.0.0.1"
fi

echo "Starting Infinite Canvas ..."
echo "Visit: http://${LAN_IP}:3000/"
echo "Local: http://127.0.0.1:3000/"
echo "(3000 被占用时 main.py 会自动顺延端口，以程序实际输出为准)"
echo "Press Ctrl+C to stop."
echo ""

# 浏览器由 main.py 在服务就绪后自动打开，这里不再延时开第二个。
python3 main.py

echo ""
echo "Server stopped."
