# Linux 服务器部署指南

---

## 一、环境要求

| 项目 | 要求 |
|------|------|
| 系统 | CentOS / Ubuntu / Debian |
| Node.js | 18.x 或以上 |
| pm2 | 最新版（进程管理） |
| Nginx | 最新版（反向代理） |
| SSL | Let's Encrypt（可选，用于 HTTPS） |

---

## 二、安装 Node.js

### 2.1 通过 NodeSource 安装（推荐）

```bash
# Ubuntu / Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

### 2.2 验证安装

```bash
node -v
# 应显示 v18.x.x

npm -v
# 应显示 9.x.x 或更高
```

---

## 三、上传项目文件

### 3.1 创建目录

```bash
mkdir -p /www/wwwroot/museum-h5
mkdir -p /www/wwwroot/museum-server
```

### 3.2 上传前端文件

将 `h5/` 目录下的所有文件上传到 `/www/wwwroot/museum-h5/`：

```
index.html
config.json
css/
js/
images/
music/
```

### 3.3 上传服务端文件

将 `server/` 目录下的文件上传到 `/www/wwwroot/museum-server/`：

```
museum-server.js
package.json
config.example.js
config.js          ← 需要创建并编辑
data/              ← 自动创建
```

---

## 四、安装服务端依赖

### 4.1 安装编译工具（如未安装）

```bash
# Ubuntu / Debian
apt update
apt install -y build-essential python3

# CentOS
yum groupinstall -y "Development Tools"
yum install -y python3
```

### 4.2 安装依赖

```bash
cd /www/wwwroot/museum-server
npm install
```

正常输出：
```
added 38 packages in 10s
```

---

## 五、配置文件

### 5.1 创建 config.js

```bash
cd /www/wwwroot/museum-server
cp config.example.js config.js
```

### 5.2 编辑配置

```bash
vim /www/wwwroot/museum-server/config.js
```

参考配置：

```javascript
module.exports = {
  server: {
    port: 3001,
    host: '127.0.0.1',
  },

  database: {
    path: './data/data.db',
  },

  wx: {
    enabled: false,           // 开发阶段先设为 false
    appId: '',
    appSecret: '',
    oauthRedirectUri: 'https://你的域名/api/wx/callback',
    redirectAfterOAuth: 'https://你的域名/#/',
    oauthStateSecret: '随机字符串',
  },

  frontend: {
    staticPath: '/www/wwwroot/museum-h5',
    corsOrigin: 'https://你的域名',
  },

  log: {
    level: 'info',
  },

  security: {
    tokenLength: 32,
    rateLimitPerMinute: 100,
  },
};
```

### 5.3 创建数据目录

```bash
mkdir -p /www/wwwroot/museum-server/data
chmod 755 /www/wwwroot/museum-server/data
```

---

## 六、启动 Node.js 服务

### 6.1 全局安装 pm2

```bash
npm install -g pm2
```

### 6.2 启动服务

```bash
cd /www/wwwroot/museum-server
pm2 start museum-server.js --name museum-api
```

### 6.3 设置开机自启

```bash
pm2 startup
pm2 save
```

### 6.4 常用 pm2 命令

| 命令 | 说明 |
|------|------|
| `pm2 status` | 查看服务状态 |
| `pm2 logs museum-api` | 查看日志 |
| `pm2 restart museum-api` | 重启服务 |
| `pm2 stop museum-api` | 停止服务 |
| `pm2 delete museum-api` | 删除服务 |

---

## 七、配置 Nginx

### 7.1 创建 Nginx 配置文件

```bash
vim /etc/nginx/sites-available/museum.conf
```

### 7.2 配置文件内容

```nginx
server {
    listen 80;
    listen 443 ssl http2;
    server_name 你的域名或IP;

    root /www/wwwroot/museum-h5;
    index index.html;

    # SSL 证书（如已配置）
    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;
    ssl_protocols TLSv1.1 TLSv1.2 TLSv1.3;
    ssl_ciphers EECDH+CHACHA20:EECDH+CHACHA20-draft:EECDH+AES128:RSA+AES128:EECDH+AES256:RSA+AES256:EECDH+3DES:RSA+3DES:!MD5;
    ssl_prefer_server_ciphers on;

    # API 反向代理到 Node.js
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 微信 OAuth 回调
    location /wx/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 静态资源
    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(gif|jpg|jpeg|png|bmp|swf)$ {
        expires 30d;
    }

    location ~* \.(js|css)$ {
        expires 12h;
    }

    # 禁止访问敏感文件
    location ~* (\.user.ini|\.htaccess|\.env|\.git) {
        return 404;
    }
}
```

### 7.3 启用配置

```bash
# Ubuntu / Debian
ln -s /etc/nginx/sites-available/museum.conf /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# CentOS
cp /etc/nginx/sites-available/museum.conf /etc/nginx/conf.d/museum.conf
nginx -t
systemctl reload nginx
```

---

## 八、配置 SSL 证书（可选）

### 8.1 使用 Let's Encrypt（免费）

```bash
# 安装 certbot
apt install -y certbot python3-certbot-nginx

# 申请证书
certbot --nginx -d 你的域名
```

### 8.2 自动续期

Let's Encrypt 证书有效期 90 天，certbot 会自动配置续期。

---

## 九、防火墙配置

```bash
# Ubuntu / Debian (ufw)
ufw allow 80/tcp
ufw allow 443/tcp

# CentOS (firewalld)
firewall-cmd --permanent --add-port=80/tcp
firewall-cmd --permanent --add-port=443/tcp
firewall-cmd --reload
```

---

## 十、验证部署

### 10.1 测试 API

```bash
# 测试 session 接口
curl http://127.0.0.1:3001/api/user/session -X POST -H "Content-Type: application/json" -d '{}'

# 测试排行榜接口
curl http://127.0.0.1:3001/api/rank/total
```

### 10.2 测试外网访问

```
https://你的域名/
https://你的域名/api/user/session
```

---

## 十一、故障排查

| 问题 | 解决方法 |
|------|----------|
| 502 Bad Gateway | 检查 Node.js 服务是否启动：`pm2 status` |
| 502 Bad Gateway | 检查 Nginx 代理配置是否正确 |
| 500 Internal Server Error | 查看 Node.js 日志：`pm2 logs museum-api` |
| 端口被占用 | `lsof -i :3001`，杀死占用进程 |
| 依赖安装失败 | 确认已安装 build-essential 和 python3 |
| 数据库写入失败 | `chmod 755 /www/wwwroot/museum-server/data` |

### 查看日志

```bash
# Node.js 日志
pm2 logs museum-api

# Nginx 日志
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

---

## 十二、快速命令汇总

```bash
# 启动服务
cd /www/wwwroot/museum-server
pm2 start museum-server.js --name museum-api

# 重启服务
pm2 restart museum-api

# 查看状态
pm2 status

# 查看日志
pm2 logs museum-api

# 重载 Nginx
nginx -s reload

# 测试 Nginx 配置
nginx -t
```

---

## 十三、后续维护

### 更新代码

```bash
# 1. 上传新代码到服务器

# 2. 重启服务
pm2 restart museum-api
```

### 备份数据库

```bash
# 停止服务
pm2 stop museum-api

# 备份
cp /www/wwwroot/museum-server/data/data.db /backup/data_$(date +%Y%m%d).db

# 重启服务
pm2 start museum-api
```
