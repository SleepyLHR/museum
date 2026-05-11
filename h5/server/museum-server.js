var http = require('http');
var https = require('https');
var url = require('url');
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var Database = require('better-sqlite3');

var config = require('./config');

var db = null;

var LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
var currentLogLevel = LOG_LEVELS[config.log.level] || LOG_LEVELS.info;

function log(level) {
  var args = [].slice.call(arguments, 1);
  if (LOG_LEVELS[level] >= currentLogLevel) {
    var prefix = '[' + new Date().toISOString() + '][' + level.toUpperCase() + ']';
    if (level === 'error') {
      console.error.apply(console, [prefix].concat(args));
    } else {
      console.log.apply(console, [prefix].concat(args));
    }
  }
}

function initDatabase() {
  var dbPath = path.resolve(__dirname, config.database.path);
  var dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  log('info', 'Database connected:', dbPath);

  db.exec(''
    + 'CREATE TABLE IF NOT EXISTS users ('
    + '  id               TEXT PRIMARY KEY,'
    + '  openid           TEXT UNIQUE,'
    + '  token            TEXT NOT NULL UNIQUE,'
    + '  nickname         TEXT DEFAULT \'神秘玩家\','
    + '  unlocked_levels  TEXT DEFAULT \'["level1"]\','
    + '  completed_levels TEXT DEFAULT \'[]\','
    + '  level_times      TEXT DEFAULT \'{}\','
    + '  total_time       INTEGER DEFAULT 0,'
    + '  is_anonymous     INTEGER DEFAULT 1,'
    + '  best_daily_rank  INTEGER DEFAULT 0,'
    + '  best_total_rank  INTEGER DEFAULT 0,'
    + '  daily_rank_updated_date TEXT DEFAULT \'\','
    + '  yesterday_daily_rank INTEGER DEFAULT 0,'
    + '  yesterday_rank_updated TEXT DEFAULT \'\','
    + '  created_at       TEXT NOT NULL,'
    + '  last_active_at   TEXT NOT NULL'
    + ');'
  );

  db.exec(''
    + 'CREATE TABLE IF NOT EXISTS daily_scores ('
    + '  id INTEGER PRIMARY KEY AUTOINCREMENT,'
    + '  user_id TEXT NOT NULL,'
    + '  nickname TEXT NOT NULL,'
    + '  total_time INTEGER NOT NULL,'
    + '  score_date TEXT NOT NULL,'
    + '  created_at TEXT NOT NULL'
    + ');'
  );

  db.exec('CREATE INDEX IF NOT EXISTS idx_daily_scores_date ON daily_scores(score_date);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_daily_scores_date_time ON daily_scores(score_date, total_time);');

  log('info', 'Database tables initialized');
}

function generateToken() {
  return crypto.randomBytes(config.security.tokenLength / 2).toString('hex');
}

function generateUserId() {
  var ts = Date.now().toString(36);
  var suffix = crypto.randomBytes(2).toString('hex');
  return 'U' + ts + suffix;
}

function getUserByToken(token) {
  var stmt = db.prepare('SELECT * FROM users WHERE token = ?');
  return stmt.get(token);
}

function getUserByOpenid(openid) {
  var stmt = db.prepare('SELECT * FROM users WHERE openid = ?');
  return stmt.get(openid);
}

function createUser(openid, isAnonymous) {
  var userId = generateUserId();
  var token = generateToken();
  var now = new Date().toISOString();
  var stmt = db.prepare(''
    + 'INSERT INTO users (id, openid, token, nickname, unlocked_levels, completed_levels, level_times, total_time, is_anonymous, created_at, last_active_at)'
    + ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  stmt.run(
    userId,
    openid || null,
    token,
    '神秘玩家',
    '["level1"]',
    '[]',
    '{}',
    0,
    isAnonymous ? 1 : 0,
    now,
    now
  );
  return {
    id: userId,
    token: token,
    nickname: '神秘玩家',
    openid: openid,
    isAnonymous: !!isAnonymous,
    unlockedLevels: ['level1'],
    completedLevels: [],
    levelTimes: {},
    totalTime: 0,
    createdAt: now
  };
}

function parseJsonBody(req) {
  return new Promise(function(resolve, reject) {
    var body = '';
    req.on('data', function(chunk) { body += chunk; });
    req.on('end', function() {
      if (!body) { resolve({}); return; }
      try { resolve(JSON.parse(body)); }
      catch (e) { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': config.frontend.corsOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { error: message });
}

function getTokenFromHeader(req) {
  var auth = req.headers['authorization'] || '';
  if (auth.startsWith('Bearer ')) {
    return auth.slice(7);
  }
  return null;
}

function validateProgress(progress) {
  if (typeof progress !== 'object' || progress === null) {
    return { valid: false, message: 'progress must be an object' };
  }
  if (!Array.isArray(progress.unlockedLevels)) {
    return { valid: false, message: 'unlockedLevels must be an array' };
  }
  if (!Array.isArray(progress.completedLevels)) {
    return { valid: false, message: 'completedLevels must be an array' };
  }
  if (typeof progress.levelTimes !== 'object') {
    return { valid: false, message: 'levelTimes must be an object' };
  }
  if (typeof progress.totalTime !== 'number') {
    return { valid: false, message: 'totalTime must be a number' };
  }
  for (var key in progress.levelTimes) {
    if (typeof progress.levelTimes[key] !== 'number') {
      return { valid: false, message: 'levelTimes values must be numbers' };
    }
  }
  return { valid: true };
}

var ipRequestCounts = {};
var rateLimitWindow = 60 * 1000;

function checkRateLimit(ip) {
  if (!config.security.rateLimitPerMinute) return true;
  var now = Date.now();
  if (!ipRequestCounts[ip]) ipRequestCounts[ip] = { count: 0, resetAt: now + rateLimitWindow };
  var record = ipRequestCounts[ip];
  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + rateLimitWindow;
  }
  record.count++;
  return record.count <= config.security.rateLimitPerMinute;
}

function getClientIp(req) {
  return req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
}

var router = {
  '/api/user/session': { GET: handleSessionGet, POST: handleSessionPost },
  '/api/user/info': { GET: handleUserInfo },
  '/api/user/nickname': { PUT: handleUserNickname },
  '/api/user/progress': { GET: handleProgressGet, POST: handleProgressPost },
  '/api/wx/callback': { GET: handleWxCallback },
  '/api/wx/jsapi-config': { GET: handleWxJsapiConfig },
  '/api/rank/total': { GET: handleRankTotal },
  '/api/rank/daily': { GET: handleRankDaily },
  '/api/rank/yesterday': { GET: handleRankYesterday },
  '/api/rank/my': { GET: handleRankMy }
};

function findHandler(pathname, method) {
  if (router[pathname] && router[pathname][method]) {
    return router[pathname][method];
  }
  var wxMatch = pathname.match(/^\/api\/wx\/callback/);
  if (wxMatch && method === 'GET') return handleWxCallback;
  return null;
}

async function handleSessionPost(req, res, pathname, query) {
  var token = getTokenFromHeader(req);
  var body = {};
  try { body = await parseJsonBody(req); } catch (e) {}

  if (token) {
    var user = getUserByToken(token);
    if (user) {
      var now = new Date().toISOString();
      db.prepare('UPDATE users SET last_active_at = ? WHERE id = ?').run(now, user.id);
      sendJson(res, 200, {
        userId: user.id,
        token: user.token,
        nickname: user.nickname,
        openid: user.openid,
        isAnonymous: !!user.is_anonymous,
        unlockedLevels: JSON.parse(user.unlocked_levels),
        completedLevels: JSON.parse(user.completed_levels),
        levelTimes: JSON.parse(user.level_times),
        totalTime: user.total_time,
        isNew: false
      });
      return;
    } else {
      sendError(res, 401, 'Invalid token');
      return;
    }
  }

  if (config.wx.enabled) {
    var referer = req.headers['referer'] || '';
    var userAgent = req.headers['user-agent'] || '';
    var isWechat = userAgent.indexOf('MicroMessenger') !== -1;
    if (isWechat) {
      var state = crypto.randomBytes(8).toString('hex');
      var redirectUri = encodeURIComponent(config.wx.oauthRedirectUri);
      var oauthUrl = 'https://open.weixin.qq.com/connect/oauth2/authorize'
        + '?appid=' + config.wx.appId
        + '&redirect_uri=' + redirectUri
        + '&response_type=code'
        + '&scope=snsapi_base'
        + '&state=' + state
        + '#wechat_redirect';
      log('info', 'Redirecting to WeChat OAuth:', oauthUrl);
      res.writeHead(302, { 'Location': oauthUrl });
      res.end();
      return;
    }
  }

  var newUser = createUser(null, true);
  log('info', 'Anonymous user created:', newUser.id);
  sendJson(res, 200, {
    userId: newUser.id,
    token: newUser.token,
    nickname: newUser.nickname,
    openid: null,
    isAnonymous: true,
    unlockedLevels: newUser.unlockedLevels,
    completedLevels: newUser.completedLevels,
    levelTimes: newUser.levelTimes,
    totalTime: newUser.totalTime,
    isNew: true
  });
}

function handleSessionGet(req, res, pathname, query) {
  var token = getTokenFromHeader(req);
  if (!token) {
    sendError(res, 401, 'Missing token');
    return;
  }
  var user = getUserByToken(token);
  if (!user) {
    sendError(res, 401, 'Invalid token');
    return;
  }
  var now = new Date().toISOString();
  db.prepare('UPDATE users SET last_active_at = ? WHERE id = ?').run(now, user.id);
  sendJson(res, 200, {
    userId: user.id,
    token: user.token,
    nickname: user.nickname,
    openid: user.openid,
    isAnonymous: !!user.is_anonymous,
    unlockedLevels: JSON.parse(user.unlocked_levels),
    completedLevels: JSON.parse(user.completed_levels),
    levelTimes: JSON.parse(user.level_times),
    totalTime: user.total_time,
    isNew: false
  });
}

function handleUserInfo(req, res, pathname, query) {
  var token = getTokenFromHeader(req);
  if (!token) {
    sendError(res, 401, 'Missing token');
    return;
  }
  var user = getUserByToken(token);
  if (!user) {
    sendError(res, 401, 'Invalid token');
    return;
  }
  sendJson(res, 200, {
    userId: user.id,
    nickname: user.nickname,
    openid: user.openid,
    isAnonymous: !!user.is_anonymous,
    createdAt: user.created_at
  });
}

async function handleUserNickname(req, res, pathname, query) {
  var token = getTokenFromHeader(req);
  if (!token) {
    sendError(res, 401, 'Missing token');
    return;
  }
  var user = getUserByToken(token);
  if (!user) {
    sendError(res, 401, 'Invalid token');
    return;
  }
  var body = {};
  try { body = await parseJsonBody(req); } catch (e) {}
  var nickname = body.nickname || '神秘玩家';
  if (nickname.length > 20) nickname = nickname.slice(0, 20);
  db.prepare('UPDATE users SET nickname = ? WHERE id = ?').run(nickname, user.id);
  log('info', 'User nickname updated:', user.id, nickname);
  sendJson(res, 200, { success: true, nickname: nickname });
}

function handleProgressGet(req, res, pathname, query) {
  var token = getTokenFromHeader(req);
  if (!token) {
    sendError(res, 401, 'Missing token');
    return;
  }
  var user = getUserByToken(token);
  if (!user) {
    sendError(res, 401, 'Invalid token');
    return;
  }
  sendJson(res, 200, {
    unlockedLevels: JSON.parse(user.unlocked_levels),
    completedLevels: JSON.parse(user.completed_levels),
    levelTimes: JSON.parse(user.level_times),
    totalTime: user.total_time,
    syncedAt: user.last_active_at
  });
}

async function handleProgressPost(req, res, pathname, query) {
  var token = getTokenFromHeader(req);
  if (!token) {
    sendError(res, 401, 'Missing token');
    return;
  }
  var user = getUserByToken(token);
  if (!user) {
    sendError(res, 401, 'Invalid token');
    return;
  }
  var body = {};
  try { body = await parseJsonBody(req); } catch (e) {
    sendError(res, 400, 'Invalid JSON body');
    return;
  }
  var validation = validateProgress(body);
  if (!validation.valid) {
    sendError(res, 400, validation.message);
    return;
  }
  var unlockedLevels = JSON.stringify(body.unlockedLevels);
  var completedLevels = JSON.stringify(body.completedLevels);
  var levelTimes = JSON.stringify(body.levelTimes);
  var totalTime = body.totalTime;
  var now = new Date().toISOString();

  var rankBadges = [];
  var dailyRankImproved = false;
  var totalRankImproved = false;
  var newDailyRank = 0;
  var newTotalRank = 0;

  db.prepare(''
    + 'UPDATE users SET unlocked_levels = ?, completed_levels = ?, level_times = ?, total_time = ?, last_active_at = ?'
    + ' WHERE id = ?'
  ).run(unlockedLevels, completedLevels, levelTimes, totalTime, now, user.id);

  var today = now.split('T')[0];
  var stmtCheckToday = db.prepare('SELECT id FROM daily_scores WHERE user_id = ? AND score_date = ?');
  var existingToday = stmtCheckToday.get(user.id, today);
  if (!existingToday) {
    var stmtInsertDaily = db.prepare('INSERT INTO daily_scores (user_id, nickname, total_time, score_date, created_at) VALUES (?, ?, ?, ?, ?)');
    stmtInsertDaily.run(user.id, user.nickname, totalTime, today, now);
  } else {
    var stmtUpdateDaily = db.prepare('UPDATE daily_scores SET total_time = ?, nickname = ? WHERE user_id = ? AND score_date = ?');
    stmtUpdateDaily.run(totalTime, user.nickname, user.id, today);
  }

  var rankResult = calculateRanks(user.id, totalTime, today);
  newDailyRank = rankResult.dailyRank;
  newTotalRank = rankResult.totalRank;

  if (newDailyRank > 0) {
    var currentBestDaily = user.best_daily_rank;
    if (currentBestDaily === 0 || newDailyRank < currentBestDaily) {
      db.prepare('UPDATE users SET best_daily_rank = ?, daily_rank_updated_date = ? WHERE id = ?')
        .run(newDailyRank, today, user.id);
      rankBadges.push('best_daily_rank');
      dailyRankImproved = true;
    }
  }

  if (newTotalRank > 0) {
    var currentBestTotal = user.best_total_rank;
    if (currentBestTotal === 0 || newTotalRank < currentBestTotal) {
      db.prepare('UPDATE users SET best_total_rank = ? WHERE id = ?')
        .run(newTotalRank, user.id);
      rankBadges.push('best_total_rank');
      totalRankImproved = true;
    }
  }

  log('debug', 'Progress synced for user:', user.id, '| dailyRank:', newDailyRank, 'totalRank:', newTotalRank);
  sendJson(res, 200, {
    success: true,
    syncedAt: now,
    dailyRank: newDailyRank,
    totalRank: newTotalRank,
    bestDailyRank: dailyRankImproved ? newDailyRank : user.best_daily_rank,
    bestTotalRank: totalRankImproved ? newTotalRank : user.best_total_rank,
    dailyRankImproved: dailyRankImproved,
    totalRankImproved: totalRankImproved,
    rankBadges: rankBadges
  });
}

function calculateRanks(userId, totalTime, today) {
  var dailyRank = 0;
  var totalRank = 0;

  var stmtDaily = db.prepare('SELECT COUNT(*) + 1 as rank FROM daily_scores WHERE score_date = ? AND total_time < ?');
  var dailyResult = stmtDaily.get(today, totalTime);
  dailyRank = dailyResult ? dailyResult.rank : 0;

  var stmtTotal = db.prepare('SELECT COUNT(*) + 1 as rank FROM users WHERE total_time > 0 AND total_time < ?');
  var totalResult = stmtTotal.get(totalTime);
  totalRank = totalResult ? totalResult.rank : 0;

  return { dailyRank: dailyRank, totalRank: totalRank };
}

function handleRankTotal(req, res, pathname, query) {
  var page = parseInt(query.page) || 1;
  var limit = parseInt(query.limit) || 20;
  var offset = (page - 1) * limit;

  var stmtCount = db.prepare('SELECT COUNT(*) as total FROM users WHERE total_time > 0');
  var totalResult = stmtCount.get();
  var total = totalResult ? totalResult.total : 0;

  var stmtList = db.prepare('SELECT id, nickname, total_time FROM users WHERE total_time > 0 ORDER BY total_time ASC, last_active_at ASC LIMIT ? OFFSET ?');
  var list = stmtList.all(limit, offset);

  var formattedList = list.map(function(item, index) {
    return {
      rank: offset + index + 1,
      userId: item.id,
      nickname: item.nickname,
      totalTime: item.total_time
    };
  });

  sendJson(res, 200, {
    code: 0,
    data: {
      list: formattedList,
      total: total,
      page: page,
      limit: limit
    }
  });
}

function handleRankDaily(req, res, pathname, query) {
  var page = parseInt(query.page) || 1;
  var limit = parseInt(query.limit) || 20;
  var offset = (page - 1) * limit;
  var date = query.date || new Date().toISOString().split('T')[0];

  var stmtCount = db.prepare('SELECT COUNT(*) as total FROM daily_scores WHERE score_date = ?');
  var totalResult = stmtCount.get(date);
  var total = totalResult ? totalResult.total : 0;

  var stmtList = db.prepare('SELECT id, user_id, nickname, total_time FROM daily_scores WHERE score_date = ? ORDER BY total_time ASC, created_at ASC LIMIT ? OFFSET ?');
  var list = stmtList.all(date, limit, offset);

  var formattedList = list.map(function(item, index) {
    return {
      rank: offset + index + 1,
      userId: item.user_id,
      nickname: item.nickname,
      totalTime: item.total_time
    };
  });

  sendJson(res, 200, {
    code: 0,
    data: {
      list: formattedList,
      total: total,
      page: page,
      limit: limit,
      date: date
    }
  });
}

function handleRankYesterday(req, res, pathname, query) {
  var yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  var yesterdayStr = yesterday.toISOString().split('T')[0];

  var stmtCount = db.prepare('SELECT COUNT(*) as total FROM daily_scores WHERE score_date = ?');
  var totalResult = stmtCount.get(yesterdayStr);
  var total = totalResult ? totalResult.total : 0;

  var stmtList = db.prepare('SELECT id, user_id, nickname, total_time FROM daily_scores WHERE score_date = ? ORDER BY total_time ASC, created_at ASC');
  var list = stmtList.all(yesterdayStr);

  var formattedList = list.map(function(item, index) {
    return {
      rank: index + 1,
      userId: item.user_id,
      nickname: item.nickname,
      totalTime: item.total_time
    };
  });

  sendJson(res, 200, {
    code: 0,
    data: {
      list: formattedList,
      total: total,
      page: 1,
      limit: total,
      date: yesterdayStr,
      myRank: 0
    }
  });
}

function handleRankMy(req, res, pathname, query) {
  var token = getTokenFromHeader(req);
  if (!token) {
    sendError(res, 401, 'Missing token');
    return;
  }
  var user = getUserByToken(token);
  if (!user) {
    sendError(res, 401, 'Invalid token');
    return;
  }

  var today = new Date().toISOString().split('T')[0];
  var newRankInfo = calculateRanks(user.id, user.total_time, today);

  var stmtYesterday = db.prepare('SELECT yesterday_daily_rank, yesterday_rank_updated FROM users WHERE id = ?');
  var yesterdayInfo = stmtYesterday.get(user.id);

  var hasNewRank = false;
  if (newRankInfo.dailyRank > 0 && user.best_daily_rank > 0) {
    if (newRankInfo.dailyRank < user.best_daily_rank) {
      hasNewRank = true;
    }
  }
  if (newRankInfo.totalRank > 0 && user.best_total_rank > 0) {
    if (newRankInfo.totalRank < user.best_total_rank) {
      hasNewRank = true;
    }
  }

  sendJson(res, 200, {
    code: 0,
    data: {
      dailyRank: newRankInfo.dailyRank,
      totalRank: newRankInfo.totalRank,
      bestDailyRank: user.best_daily_rank,
      bestTotalRank: user.best_total_rank,
      yesterdayRank: yesterdayInfo ? yesterdayInfo.yesterday_daily_rank : 0,
      hasNewRank: hasNewRank
    }
  });
}

async function handleWxCallback(req, res, pathname, query) {
  if (!config.wx.enabled) {
    sendError(res, 400, 'WeChat auth is disabled');
    return;
  }
  var code = query.code;
  var state = query.state;
  var error = query.error;
  if (error) {
    log('warn', 'WeChat OAuth error:', error);
    res.writeHead(302, { 'Location': config.wx.redirectAfterOAuth + '?error=' + error });
    res.end();
    return;
  }
  if (!code) {
    sendError(res, 400, 'Missing code');
    return;
  }
  try {
    var tokenData = await fetchWxAccessToken(code);
    var openid = tokenData.openid;
    if (!openid) {
      throw new Error('Failed to get openid from WeChat');
    }
    var existingUser = getUserByOpenid(openid);
    var user;
    if (existingUser) {
      var newToken = generateToken();
      var now = new Date().toISOString();
      db.prepare('UPDATE users SET token = ?, last_active_at = ? WHERE id = ?')
        .run(newToken, now, existingUser.id);
      user = {
        id: existingUser.id,
        token: newToken,
        nickname: existingUser.nickname,
        openid: existingUser.openid,
        isAnonymous: !!existingUser.is_anonymous,
        unlockedLevels: JSON.parse(existingUser.unlocked_levels),
        completedLevels: JSON.parse(existingUser.completed_levels),
        levelTimes: JSON.parse(existingUser.level_times),
        totalTime: existingUser.total_time
      };
      log('info', 'WeChat user re-authenticated:', openid, user.id);
    } else {
      user = createUser(openid, false);
      log('info', 'New WeChat user created:', openid, user.id);
    }
    var redirectUrl = config.wx.redirectAfterOAuth + '?token=' + user.token;
    res.writeHead(302, { 'Location': redirectUrl });
    res.end();
  } catch (err) {
    log('error', 'WeChat OAuth failed:', err.message);
    res.writeHead(302, { 'Location': config.wx.redirectAfterOAuth + '?error=wx_auth_failed' });
    res.end();
  }
}

function fetchWxAccessToken(code) {
  return new Promise(function(resolve, reject) {
    var apiUrl = 'https://api.weixin.qq.com/sns/oauth2/access_token'
      + '?appid=' + config.wx.appId
      + '&secret=' + config.wx.appSecret
      + '&code=' + code
      + '&grant_type=authorization_code';
    https.get(apiUrl, function(wxRes) {
      var data = '';
      wxRes.on('data', function(chunk) { data += chunk; });
      wxRes.on('end', function() {
        try {
          var json = JSON.parse(data);
          if (json.errcode) {
            reject(new Error('WeChat error: ' + json.errmsg));
          } else {
            resolve(json);
          }
        } catch (e) {
          reject(new Error('Invalid response from WeChat'));
        }
      });
    }).on('error', function(e) {
      reject(e);
    });
  });
}

function handleWxJsapiConfig(req, res, pathname, query) {
  var pageUrl = query.url || '';
  sendJson(res, 200, {
    appId: config.wx.appId,
    timestamp: Math.floor(Date.now() / 1000),
    nonceStr: crypto.randomBytes(8).toString('hex'),
    signature: '',
    url: pageUrl
  });
}

var mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.txt': 'text/plain'
};

var staticRoot = path.resolve(__dirname, config.frontend.staticPath);

function serveStatic(req, res, pathname) {
  var filePath = path.join(staticRoot, pathname);
  var ext = path.extname(filePath).toLowerCase();
  var contentType = mimeTypes[ext] || 'application/octet-stream';

  if (filePath.indexOf(staticRoot) !== 0) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, function(err, data) {
    if (err) {
      if (err.code === 'ENOENT') {
        fs.readFile(path.join(staticRoot, 'index.html'), function(err2, data2) {
          if (err2) {
            res.writeHead(404);
            res.end('Not Found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(data2);
          }
        });
      } else {
        res.writeHead(500);
        res.end('Server Error');
      }
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

var server = http.createServer(async function(req, res) {
  var ip = getClientIp(req);
  if (!checkRateLimit(ip)) {
    sendError(res, 429, 'Too many requests');
    return;
  }
  var parsedUrl = url.parse(req.url, true);
  var pathname = parsedUrl.pathname;
  var query = parsedUrl.query;

  if (pathname.startsWith('/api/')) {
    var handler = router[pathname] && router[pathname][req.method];
    if (handler) {
      await handler(req, res, pathname, query);
      return;
    }
    sendError(res, 404, 'Not found');
    return;
  }

  serveStatic(req, res, pathname);
});

server.on('error', function(err) {
  log('error', 'Server error:', err.message);
});

process.on('uncaughtException', function(err) {
  log('error', 'Uncaught exception:', err.stack || err.message);
});

process.on('unhandledRejection', function(reason) {
  log('error', 'Unhandled rejection:', reason);
});

function start() {
  initDatabase();
  server.listen(config.server.port, config.server.host, function() {
    log('info', 'Museum server started on', config.server.host + ':' + config.server.port);
    log('info', 'WeChat auth:', config.wx.enabled ? 'enabled' : 'disabled');
  });
}

start();
