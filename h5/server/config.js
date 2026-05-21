/**
 * 博物馆 H5 后端服务配置文件
 *
 * 部署前请根据实际情况修改以下配置。
 * 敏感信息（AppSecret、oauthStateSecret）请勿提交到代码仓库。
 *
 * ============================
 * 微信登录配置步骤
 * ============================
 *
 * 第1步：申请公众号
 *   1. 前往 https://mp.weixin.qq.com 注册公众号
 *   2. 完成认证（企业需要营业执照），个人订阅号不支持网页授权
 *   3. 进入 "设置与开发 → 基本配置" 获取 AppID 和 AppSecret
 *   4. 测试阶段可使用微信测试号：https://mp.weixin.qq.com/debug/cgi-bin/sandbox
 *
 * 第2步：配置 JS 接口安全域名
 *   1. 登录公众号后台 → 设置与开发 → 公众号设置 → 功能设置
 *   2. 在 "JS接口安全域名" 中添加您的部署域名（如 example.com）
 *   3. 将下载的验证文件上传到服务器 h5 静态目录根路径
 *
 * 第3步：配置网页授权回调域名
 *   1. 登录公众号后台 → 设置与开发 → 公众号设置 → 功能设置
 *   2. 在 "网页授权域名" 中添加您的部署域名（如 example.com）
 *   3. 注意：此处只需填写域名，不要加 http:// 或路径
 *
 * 第4步：填写本配置文件的 wx 部分
 *   1. 将 enabled 设为 true
 *   2. 填入 appId（步骤1获取）
 *   3. 填入 appSecret（步骤1获取，注意保密！）
 *   4. 将 oauthRedirectUri 中的 YOUR_DOMAIN 替换为真实域名
 *   5. 将 redirectAfterOAuth 中的 YOUR_DOMAIN 替换为前端域名
 *   6. 修改 oauthStateSecret 为随机字符串（16位以上，大小写字母+数字）
 *
 * 第5步：部署并测试
 *   1. 重启后端服务：node museum-server.js
 *   2. 在微信中打开 H5 页面
 *   3. 确认授权流程正常（跳转 → 授权 → 回调 → 登录成功）
 *
 * 注意事项：
 *   - 生产环境必须使用 HTTPS，微信要求域名已备案且支持 HTTPS
 *   - 测试号允许 HTTP，方便本地开发调试
 *   - 如只在内网使用或不需微信登录，保持 wx.enabled = false 即可
 */

module.exports = {

  // ==================== 服务端配置 ====================

  server: {
    /** 服务器监听端口，默认 3002，避免与常见端口冲突 */
    port: 3002,
    /** 绑定地址，'0.0.0.0' 表示监听所有网络接口，内外网均可访问 */
    host: '0.0.0.0',
  },

  // ==================== 数据库配置 ====================

  database: {
    /** 数据存储文件路径（相对于本文件所在目录），使用 JSON 文件存储 */
    path: './data/data.db',
  },

  // ==================== 微信功能配置 ====================

  wx: {
    /**
     * 是否启用微信 OAuth 登录
     * false：仅匿名登录，不要求微信授权（适合开发/测试/非微信场景）
     * true： 启用微信授权，用户需在微信内打开页面
     */
    enabled: false,

    /** 公众号 AppID，在公众号后台 "开发 → 基本配置" 获取 */
    appId: 'YOUR_WX_APPID',

    /** 公众号 AppSecret，在公众号后台 "开发 → 基本配置" 获取。请勿提交到代码仓库！ */
    appSecret: 'YOUR_WX_APPSECRET',

    /**
     * 微信 OAuth 授权成功后的回调地址（必须与公众号后台配置的授权域名一致）
     * 示例：'https://example.com/api/wx/callback'
     */
    oauthRedirectUri: 'https://YOUR_DOMAIN/api/wx/callback',

    /**
     * 授权完成后跳转回前端的地址（附带 token 参数完成登录）
     * 示例：'https://example.com/#/'
     */
    redirectAfterOAuth: 'https://YOUR_DOMAIN/#/',

    /**
     * OAuth state 加密密钥，用于生成和验证随机 state 防止 CSRF 攻击
     * 请设置为 16 位以上随机字符串，示例仅供参考，生产环境请重新生成
     */
    oauthStateSecret: 'RANDOM_STATE_SECRET_STRING',
  },

  // ==================== 前端资源配置 ====================

  frontend: {
    /**
     * 静态文件根目录路径（相对于本文件所在目录）
     * '..' 表示上级目录 h5/，即 index.html 及所有前端资源所在位置
     */
    staticPath: '..',

    /**
     * CORS 跨域访问控制
     * '*'：允许所有来源访问（开发环境推荐）
     * 具体域名：仅允许指定来源（生产环境推荐，如 'https://example.com'）
     */
    corsOrigin: '*',
  },

  // ==================== 日志配置 ====================

  log: {
    /**
     * 日志输出级别
     * debug：输出所有调试信息（开发调试用）
     * info：  常规运行信息（生产推荐）
     * warn：  仅警告和错误
     * error： 仅错误信息
     */
    level: 'info',

    /** 日志文件保留天数，过期自动清理 */
    maxFiles: 7,
  },

  // ==================== 安全配置 ====================

  security: {
    /**
     * 用户 Token 长度（字符数）
     * Token 由大小写字母、数字、下划线随机组成，推荐 32-64
     */
    tokenLength: 32,

    /**
     * 每 IP 每分钟 API 请求上限
     * 超过限制返回 429 状态码，设为 0 关闭限流
     */
    rateLimitPerMinute: 100,
  },
};
