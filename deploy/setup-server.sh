#!/usr/bin/env bash
# =============================================================================
# 服务器初始化脚本（在腾讯云轻量 Ubuntu/Debian 上执行一次）
# 功能：
#   1. 创建 4G swap 分区（解决 4G 内存构建 OOM）
#   2. 安装 Docker + Docker Compose 插件
#   3. 安装 Nginx + Certbot（Let's Encrypt HTTPS）
#   4. 配置防火墙（放行 22/80/443）
# 用法：bash setup-server.sh
# =============================================================================
set -euo pipefail

echo "========================================"
echo " OpenMAIC 服务器初始化"
echo "========================================"

# ---------- 1. Swap 分区 ----------
if swapon --show | grep -q "/swapfile"; then
    echo "[swap] 已存在 /swapfile，跳过"
else
    echo "[swap] 创建 4G swap 文件..."
    fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    # 开机自动挂载
    if ! grep -q "/swapfile" /etc/fstab; then
        echo "/swapfile none swap sw 0 0" >> /etc/fstab
    fi
    # 降低 swap 使用倾向（内存够用时尽量不用 swap）
    sysctl vm.swappiness=10
    if ! grep -q "vm.swappiness" /etc/sysctl.conf; then
        echo "vm.swappiness=10" >> /etc/sysctl.conf
    fi
    echo "[swap] 完成，当前内存与 swap："
    free -h
fi

# ---------- 2. Docker ----------
if command -v docker &>/dev/null; then
    echo "[docker] 已安装，跳过"
else
    echo "[docker] 安装 Docker..."
    # 用官方一键脚本（国内可换阿里云镜像，脚本内已含）
    curl -fsSL https://get.docker.com | sh
    systemctl enable --now docker
    # 当前用户加入 docker 组（root 无所谓，非 root 用户需要）
    if [ "${USER:-root}" != "root" ]; then
        usermod -aG docker "$USER"
    fi
fi
echo "[docker] 版本：$(docker --version)"
echo "[docker] compose 版本：$(docker compose version 2>/dev/null || echo '未安装插件')"

# ---------- 3. Nginx + Certbot ----------
if command -v nginx &>/dev/null; then
    echo "[nginx] 已安装，跳过"
else
    echo "[nginx] 安装 Nginx + Certbot..."
    apt-get update -y
    apt-get install -y nginx certbot python3-certbot-nginx
    systemctl enable --now nginx
fi

# ---------- 4. 防火墙 ----------
echo "[firewall] 配置 UFW（放行 22/80/443）..."
if command -v ufw &>/dev/null; then
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    # 非交互式启用
    yes | ufw enable || true
    ufw status
else
    echo "[firewall] 未安装 ufw，跳过（腾讯云安全组需在控制台放行 22/80/443）"
fi

echo "========================================"
echo " ✅ 服务器初始化完成"
echo "========================================"
echo "下一步："
echo "  1. 在腾讯云安全组放行 22/80/443 端口（如使用 ufw 已放行）"
echo "  2. 把域名 A 记录解析到本机公网 IP"
echo "  3. 运行 deploy.sh 拉取代码并构建"
