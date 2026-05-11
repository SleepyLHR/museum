/**
 * 博物馆 H5 后端服务配置文件
 *
 * 部署前请根据实际情况修改以下配置
 * 敏感信息（AppSecret）请勿提交到代码仓库
 */

module.exports = {

  // ==================== 服务端配置 ====================

  server: {
    port: 3002,
    host: '0.0.0.0',
  },

  // ==================== 数据库配置 ====================

  database: {
    path: './data/data.db',
  },

  // ==================== 微信功能配置 ====================

  wx: {
    enabled: false,

    appId: 'YOUR_WX_APPID',
    appSecret: 'YOUR_WX_APPSECRET',
    oauthRedirectUri: 'https://YOUR_DOMAIN/api/wx/callback',
    redirectAfterOAuth: 'https://YOUR_DOMAIN/#/',
    oauthStateSecret: 'RANDOM_STATE_SECRET_STRING',
  },

  // ==================== 前端配置 ====================

  frontend: {
    staticPath: '..',
    corsOrigin: '*',
  },

  // ==================== 日志配置 ====================

  log: {
    level: 'info',
    maxFiles: 7,
  },

  // ==================== 安全配置 ====================

  security: {
    tokenLength: 32,
    rateLimitPerMinute: 100,
  },
};
