var http = require('http');
var https = require('https');
var url = require('url');
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

var config = require('./config');

var dataPath = path.resolve(__dirname, 'data', 'data.json');
var data = { users: [], dailyScores: [] };

function loadData() {
  try {
    if (fs.existsSync(dataPath)) {
      var raw = fs.readFileSync(dataPath, 'utf8');
      data = JSON.parse(raw);
    }
  } catch (e) {
    console.error('Load data error:', e.message);
    data = { users: [], dailyScores: [] };
  }
}

function saveData() {
  try {
    var dir = path.dirname(dataPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Save data error:', e.message);
  }
}

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
  loadData();
  log('info', 'Database loaded:', dataPath);
  log('info', 'Users:', data.users.length, '| Daily scores:', data.dailyScores.length);
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
  return data.users.find(function(u) { return u.token === token; }) || null;
}

function getUserByOpenid(openid) {
  return data.users.find(function(u) { return u.openid === openid; }) || null;
}

function saveUser(user) {
  var index = data.users.findIndex(function(u) { return u.id === user.id; });
  if (index >= 0) {
    data.users[index] = user;
  } else {
    data.users.push(user);
  }
  saveData();
}

var NICKNAME_PREFIXES = [
  '快乐', '勇敢', '幸运', '勤劳', '智慧', '热心', '阳光', '可爱',
  '好奇', '自由', '聪慧', '温暖', '元气', '灵动', '远方', '追风'
];
var NICKNAME_SUFFIXES = [
  '拼图家', '探险者', '寻宝人', '收藏家', '访客', '文博迷', '发现者', '守护者'
];

function generateNickname() {
  var existingNicknames = {};
  for (var i = 0; i < data.users.length; i++) {
    existingNicknames[data.users[i].nickname] = true;
  }

  var attempts = 0;
  var maxAttempts = 300;
  while (attempts < maxAttempts) {
    var prefix = NICKNAME_PREFIXES[Math.floor(Math.random() * NICKNAME_PREFIXES.length)];
    var suffix = NICKNAME_SUFFIXES[Math.floor(Math.random() * NICKNAME_SUFFIXES.length)];
    var num = String(Math.floor(Math.random() * 900) + 100);
    var nickname = prefix + suffix + num;
    if (!existingNicknames[nickname]) {
      return nickname;
    }
    attempts++;
  }
  return '神秘' + Date.now().toString(36);
}

function createUser(openid, isAnonymous) {
  var userId = generateUserId();
  var token = generateToken();
  var now = new Date().toISOString();
  var nickname = generateNickname();
  var user = {
    id: userId,
    openid: openid || null,
    token: token,
    nickname: nickname,
    unlocked_levels: ['level1'],
    completed_levels: [],
    level_times: {},
    total_time: 0,
    is_anonymous: isAnonymous ? 1 : 0,
    best_daily_rank: 0,
    best_total_rank: 0,
    daily_rank_updated_date: '',
    yesterday_daily_rank: 0,
    yesterday_rank_updated: '',
    created_at: now,
    last_active_at: now
  };
  saveUser(user);
  return {
    id: userId,
    token: token,
    nickname: nickname,
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

async function handleSessionPost(req, res, pathname, query) {
  var token = getTokenFromHeader(req);
  var body = {};
  try { body = await parseJsonBody(req); } catch (e) {}

  if (token) {
    var user = getUserByToken(token);
    if (user) {
      var now = new Date().toISOString();
      user.last_active_at = now;
      saveData();
      sendJson(res, 200, {
        userId: user.id,
        token: user.token,
        nickname: user.nickname,
        openid: user.openid,
        isAnonymous: !!user.is_anonymous,
        unlockedLevels: user.unlocked_levels,
        completedLevels: user.completed_levels,
        levelTimes: user.level_times,
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
      res.writeHead(302, { 
        'Location': oauthUrl,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      });
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
  user.last_active_at = now;
  saveData();
  sendJson(res, 200, {
    userId: user.id,
    token: user.token,
    nickname: user.nickname,
    openid: user.openid,
    isAnonymous: !!user.is_anonymous,
    unlockedLevels: user.unlocked_levels,
    completedLevels: user.completed_levels,
    levelTimes: user.level_times,
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
  user.nickname = nickname;
  saveData();
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
    unlockedLevels: user.unlocked_levels,
    completedLevels: user.completed_levels,
    levelTimes: user.level_times,
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
  var now = new Date().toISOString();
  var today = now.split('T')[0];

  user.unlocked_levels = body.unlockedLevels;
  user.completed_levels = body.completedLevels;
  user.level_times = body.levelTimes;
  if (body.totalTime > 0) {
    user.total_time = body.totalTime;
  }
  user.last_active_at = now;

  var existingDaily = data.dailyScores.find(function(s) {
    return s.user_id === user.id && s.score_date === today;
  });
  if (body.totalTime > 0) {
    if (!existingDaily) {
      data.dailyScores.push({
        user_id: user.id,
        nickname: user.nickname,
        total_time: body.totalTime,
        score_date: today,
        created_at: now
      });
    } else {
      existingDaily.total_time = body.totalTime;
      existingDaily.nickname = user.nickname;
    }
  }

  saveData();

  var rankResult = calculateRanks(user.id, body.totalTime, today);
  var newDailyRank = rankResult.dailyRank;
  var newTotalRank = rankResult.totalRank;

  var rankBadges = [];
  var dailyRankImproved = false;
  var totalRankImproved = false;

  if (newDailyRank > 0) {
    if (user.best_daily_rank === 0 || newDailyRank < user.best_daily_rank) {
      user.best_daily_rank = newDailyRank;
      user.daily_rank_updated_date = today;
      rankBadges.push('best_daily_rank');
      dailyRankImproved = true;
    }
  }

  if (newTotalRank > 0) {
    if (user.best_total_rank === 0 || newTotalRank < user.best_total_rank) {
      user.best_total_rank = newTotalRank;
      rankBadges.push('best_total_rank');
      totalRankImproved = true;
    }
  }

  saveData();

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

  var dailyList = data.dailyScores.filter(function(s) { return s.score_date === today && s.total_time > 0; });
  dailyList.sort(function(a, b) { return a.total_time - b.total_time; });
  var dailyIndex = dailyList.findIndex(function(s) { return s.user_id === userId; });
  dailyRank = dailyIndex >= 0 ? dailyIndex + 1 : 0;

  var totalList = data.users.filter(function(u) { return u.total_time > 0; });
  totalList.sort(function(a, b) { return a.total_time - b.total_time; });
  var totalIndex = totalList.findIndex(function(u) { return u.id === userId; });
  totalRank = totalIndex >= 0 ? totalIndex + 1 : 0;

  return { dailyRank: dailyRank, totalRank: totalRank };
}

function handleRankTotal(req, res, pathname, query) {
  var page = parseInt(query.page) || 1;
  var limit = parseInt(query.limit) || 20;
  var offset = (page - 1) * limit;

  var list = data.users.filter(function(u) { return u.total_time > 0; });
  list.sort(function(a, b) {
    if (a.total_time !== b.total_time) return a.total_time - b.total_time;
    return a.last_active_at.localeCompare(b.last_active_at);
  });

  var total = list.length;
  var paged = list.slice(offset, offset + limit);

  var formattedList = paged.map(function(item, index) {
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

  var list = data.dailyScores.filter(function(s) { return s.score_date === date; });
  list.sort(function(a, b) {
    if (a.total_time !== b.total_time) return a.total_time - b.total_time;
    return a.created_at.localeCompare(b.created_at);
  });

  var total = list.length;
  var paged = list.slice(offset, offset + limit);

  var formattedList = paged.map(function(item, index) {
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

  var token = getTokenFromHeader(req);
  var user = token ? getUserByToken(token) : null;
  var myRank = user ? user.yesterday_daily_rank || 0 : 0;

  var list = data.dailyScores.filter(function(s) { return s.score_date === yesterdayStr; });
  list.sort(function(a, b) {
    if (a.total_time !== b.total_time) return a.total_time - b.total_time;
    return a.created_at.localeCompare(b.created_at);
  });

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
      total: formattedList.length,
      page: 1,
      limit: formattedList.length,
      date: yesterdayStr,
      myRank: myRank
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

  if (newRankInfo.dailyRank > 0) {
    if (user.best_daily_rank === 0 || newRankInfo.dailyRank < user.best_daily_rank) {
      user.best_daily_rank = newRankInfo.dailyRank;
      user.daily_rank_updated_date = today;
    }
  }
  if (newRankInfo.totalRank > 0) {
    if (user.best_total_rank === 0 || newRankInfo.totalRank < user.best_total_rank) {
      user.best_total_rank = newRankInfo.totalRank;
    }
  }

  if (newRankInfo.dailyRank > 0 || newRankInfo.totalRank > 0) {
    saveData();
  }

  sendJson(res, 200, {
    code: 0,
    data: {
      dailyRank: newRankInfo.dailyRank,
      totalRank: newRankInfo.totalRank,
      bestDailyRank: user.best_daily_rank,
      bestTotalRank: user.best_total_rank,
      yesterdayRank: user.yesterday_daily_rank,
      hasNewRank: false
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
      existingUser.token = newToken;
      existingUser.last_active_at = now;
      saveData();
      user = {
        id: existingUser.id,
        token: newToken,
        nickname: existingUser.nickname,
        openid: existingUser.openid,
        isAnonymous: !!existingUser.is_anonymous,
        unlockedLevels: existingUser.unlocked_levels,
        completedLevels: existingUser.completed_levels,
        levelTimes: existingUser.level_times,
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
    if (req.method === 'OPTIONS') {
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      });
      res.end();
      return;
    }
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

function saveYesterdayRank() {
  var yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  var yesterdayStr = yesterday.toISOString().split('T')[0];

  var yesterdayScores = data.dailyScores.filter(function(s) {
    return s.score_date === yesterdayStr;
  });
  yesterdayScores.sort(function(a, b) {
    if (a.total_time !== b.total_time) return a.total_time - b.total_time;
    return a.created_at.localeCompare(b.created_at);
  });

  for (var i = 0; i < yesterdayScores.length; i++) {
    var score = yesterdayScores[i];
    var user = data.users.find(function(u) { return u.id === score.user_id; });
    if (user) {
      user.yesterday_daily_rank = i + 1;
      user.yesterday_rank_updated = new Date().toISOString();
    }
  }

  saveData();
  log('info', 'Yesterday rank saved for date:', yesterdayStr, '| users:', yesterdayScores.length);
}

function scheduleDailyTask() {
  var now = new Date();
  var tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  var delay = tomorrow.getTime() - now.getTime();

  setTimeout(function executeDailyTask() {
    saveYesterdayRank();

    var nextDelay = 24 * 60 * 60 * 1000;
    setInterval(function() {
      saveYesterdayRank();
    }, nextDelay);
  }, delay);

  log('info', 'Daily rank save task scheduled, first run at:', tomorrow.toLocaleString());
}

function start() {
  initDatabase();
  scheduleDailyTask();
  server.listen(config.server.port, config.server.host, function() {
    log('info', 'Museum server started on', config.server.host + ':' + config.server.port);
    log('info', 'WeChat auth:', config.wx.enabled ? 'enabled' : 'disabled');
  });
}

start();
