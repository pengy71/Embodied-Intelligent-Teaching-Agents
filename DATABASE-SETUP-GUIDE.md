# 数据库配置指南

## 当前问题

你的项目目前没有配置数据库，导致：
1. 教学知识API无法正常工作
2. 数据无法持久化
3. 换电脑会丢失所有数据
4. 无法多设备同步

## 解决方案

### 方案1：本地开发（Docker Compose）

**适用场景**：本地开发测试

**配置步骤**：
1. 确保安装了 Docker Desktop
2. 运行以下命令启动数据库：
   `ash
   docker compose --profile server-persistence up -d postgres
   `
3. 在 .env.local 文件中添加：
   `ash
   DATABASE_URL=postgresql://openmaic:openmaic-dev@localhost:5432/openmaic
   PERSISTENCE_DEV_TOKEN=dev-token-123
   `

**优点**：
- 简单易用
- 无需网络
- 免费

**缺点**：
- 数据只在本地
- 换电脑需要重新配置
- 无法多设备同步

### 方案2：Supabase（推荐）

**适用场景**：团队开发，需要多设备同步

**配置步骤**：
1. 访问 https://supabase.com 并注册账号
2. 创建新项目（选择免费套餐）
3. 在项目设置中获取数据库连接字符串
4. 在 .env.local 文件中添加：
   `ash
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres
   PERSISTENCE_DEV_TOKEN=your-secure-token
   `

**优点**：
- 免费额度足够开发
- 自动备份
- 多设备同步
- 简单易用

**缺点**：
- 需要网络
- 免费额度有限制

### 方案3：Neon

**适用场景**：Serverless架构，自动扩展

**配置步骤**：
1. 访问 https://neon.tech 并注册账号
2. 创建新项目
3. 获取数据库连接字符串
4. 在 .env.local 文件中添加：
   `ash
   DATABASE_URL=postgresql://[USER]:[PASSWORD]@[HOST]/[DATABASE]
   PERSISTENCE_DEV_TOKEN=your-secure-token
   `

**优点**：
- Serverless，自动扩展
- 免费额度
- 高性能

**缺点**：
- 需要网络
- 配置稍复杂

## 推荐配置

**开发阶段**：使用 Supabase
- 免费额度足够
- 简单易用
- 支持团队协作

**生产部署**：使用云数据库
- AWS RDS
- Google Cloud SQL
- Azure Database

## 快速配置

1. **编辑 .env.local 文件**：
   `ash
   # 添加以下配置
   DATABASE_URL=你的数据库连接字符串
   PERSISTENCE_DEV_TOKEN=你的安全令牌
   `

2. **重启开发服务器**：
   `ash
   pnpm dev
   `

3. **测试数据库连接**：
   访问 http://localhost:3000/teaching 测试功能

## 注意事项

1. **安全性**：不要将数据库密码提交到代码仓库
2. **备份**：定期备份数据库
3. **监控**：监控数据库使用情况
4. **扩展**：根据使用情况选择合适的数据库套餐
