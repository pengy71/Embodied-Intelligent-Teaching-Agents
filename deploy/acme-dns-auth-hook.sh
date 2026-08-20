#!/bin/bash
# =============================================================================
# Certbot manual DNS-01 auth hook
# 作用：certbot 调用此脚本时，它会通过环境变量 CERTBOT_VALIDATION 传入
#       challenge 值。脚本把值写到文件供外部读取，然后等待标志文件
#       /tmp/acme-dns-done 出现（表示运维已添加 TXT 记录并确认生效）。
#       标志出现后退出 0，certbot 继续 Let's Encrypt 验证。
# =============================================================================
set -euo pipefail

VAL_FILE="/tmp/acme-challenge-value.txt"
DONE_FLAG="/tmp/acme-dns-done"

# 清理上一次残留
rm -f "$DONE_FLAG"

# 写出 challenge 值（外部脚本读取后告知运维去阿里云加 TXT）
echo "$CERTBOT_VALIDATION" > "$VAL_FILE"
chmod 644 "$VAL_FILE"

echo "[auth-hook] challenge value written to $VAL_FILE"
echo "[auth-hook] domain=$CERTBOT_DOMAIN validation=$CERTBOT_VALIDATION"
echo "[auth-hook] waiting for $DONE_FLAG (up to 15 min)..."

# 等待标志文件，最长 15 分钟（180 * 5s = 900s）
for i in $(seq 1 180); do
    if [ -f "$DONE_FLAG" ]; then
        rm -f "$DONE_FLAG"
        echo "[auth-hook] flag detected, granting LE extra 15s for DNS propagation"
        sleep 15
        echo "[auth-hook] exiting 0, certbot will now verify"
        exit 0
    fi
    sleep 5
done

echo "[auth-hook] ERROR: timed out waiting for $DONE_FLAG"
exit 1
