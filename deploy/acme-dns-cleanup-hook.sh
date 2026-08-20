#!/bin/bash
# =============================================================================
# Certbot manual DNS-01 cleanup hook
# 验证完成后调用。TXT 记录是手动添加的，这里只清理临时文件。
# =============================================================================
rm -f /tmp/acme-challenge-value.txt /tmp/acme-dns-done
echo "[cleanup-hook] temp files cleared"
exit 0
