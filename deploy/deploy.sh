#!/usr/bin/env bash
# =============================================================================
# 应用部署脚本（在服务器项目根目录执行）
# 功能：拉取最新代码 → 构建 Docker 镜像 → 启动/重启容器 → 配置 Nginx + HTTPS
# 用法：bash deploy/deploy.sh [域名]
#   不传域名：仅用 IP 访问（HTTP），跳过 HTTPS
#   传域名：  配置 Nginx 反代 + 自动申请 Let's Encrypt 证书
# =============================================================================
set -euo pipefail

DOMAIN="${1:-}"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

echo "========================================"
echo " OpenMAIC 部署"
echo " 项目目录：$PROJECT_DIR"
echo " 域名：${DOMAIN:-（未指定，仅 IP 访问）}"
echo "========================================"

# ---------- 1. 检查 .env.local ----------
if [ ! -f .env.local ]; then
    echo "❌ 未找到 .env.local，请先按 .env.example 创建并填写密钥"
    exit 1
fi
# 检查关键变量是否已填（非空）
check_var() {
    local name="$1"
    if ! grep -q "^${name}=.\+" .env.local; then
        echo "⚠️  .env.local 中 ${name} 未设置，相关功能可能不可用"
    fi
}
check_var "DATABASE_URL"
check_var "AUTH_SECRET"
check_var "GLM_API_KEY"
check_var "PERSISTENCE_DEV_TOKEN"

# ---------- 2. 构建 + 启动容器 ----------
echo "[build] 构建 Docker 镜像并启动（首次较慢，约 5-10 分钟）..."
docker compose -f deploy/docker-compose.prod.yml up -d --build

# 等待容器健康
echo "[wait] 等待应用启动..."
for i in $(seq 1 30); do
    if curl -sf http://127.0.0.1:3000 >/dev/null 2>&1; then
        echo "[wait] ✅ 应用已启动"
        break
    fi
    sleep 2
    [ "$i" -eq 30 ] && { echo "[wait] ⚠️ 应用 60s 内未响应，查看日志：docker logs openmaic-app"; }
done

docker compose -f deploy/docker-compose.prod.yml ps

# ---------- 3. Nginx 反向代理 ----------
echo "[nginx] 配置反向代理..."
NGINX_CONF="/etc/nginx/conf.d/openmaic.conf"
cp deploy/nginx/openmaic.conf "$NGINX_CONF"

if [ -z "$DOMAIN" ]; then
    # 无域名：配置一个简单的 IP 反代（HTTP），注释掉 HTTPS 部分
    echo "[nginx] 未指定域名，配置 HTTP 反代（IP 访问）..."
    cat > "$NGINX_CONF" <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    client_max_body_size 200m;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_read_timeout 300s;
    }
}
EOF
else
    # 有域名：替换占位符
    sed -i "s|__DOMAIN__|${DOMAIN}|g" "$NGINX_CONF"
fi

nginx -t && systemctl reload nginx
echo "[nginx] ✅ 已配置并 reload"

# ---------- 4. HTTPS 证书（仅指定域名时） ----------
if [ -n "$DOMAIN" ]; then
    # 准备 webroot 目录
    mkdir -p /var/www/certbot
    if [ -d "/etc/letsencrypt/live/${DOMAIN}" ]; then
        echo "[cert] 证书已存在，尝试续期..."
        certbot renew --quiet || true
    else
        echo "[cert] 申请 Let's Encrypt 证书（需域名已解析到本机）..."
        # 先用 standalone 模式前，确保 80 端口未被 nginx 占用临时停一下
        certbot --nginx -d "$DOMAIN" \
            --non-interactive --agree-tos \
            --register-unsafely-without-email \
            --redirect || {
            echo "[cert] ⚠️ 自动申请失败，可能域名尚未解析或 80 未放行"
            echo "       解析生效后重新运行：certbot --nginx -d ${DOMAIN}"
        }
    fi
fi

echo "========================================"
if [ -n "$DOMAIN" ]; then
    echo " ✅ 部署完成：https://${DOMAIN}"
else
    PUBLIC_IP="$(curl -s ifconfig.me 2>/dev/null || echo '服务器IP')"
    echo " ✅ 部署完成：http://${PUBLIC_IP}"
    echo "    后续加域名运行：bash deploy/deploy.sh your.domain.com"
fi
echo "========================================"
echo "常用命令："
echo "  查看日志：docker logs -f openmaic-app"
echo "  重启应用：docker compose -f deploy/docker-compose.prod.yml restart"
echo "  更新代码后重新部署：git pull && bash deploy/deploy.sh ${DOMAIN}"
