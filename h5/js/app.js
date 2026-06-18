var App = (function () {
  'use strict';

  var API_BASE_URL = '';

  var config = null;
  var defaultRelics = [
    {
      id: 'relic1',
      name: '加载中...',
      image: 'images/relic1.png',
      level: 1,
      pieces: 9,
      gridCols: 3,
      gridRows: 3,
      era: '清',
      spec: '',
      description: ''
    }
  ];

  var state = {
    userInfo: null,
    completedLevels: [],
    unlockedLevels: ['level1'],
    relics: defaultRelics.slice()
  };

  var levelTimes = {};
  var medalNumber = '';
  var firstCompletion = null;
  var readyCallback = null;
  var configLoaded = false;

  var token = '';
  var userId = '';
  var isAnonymousUser = true;
  var serverAvailable = true;
  var rankNewBadges = [];

  function init(callback) {
    readyCallback = callback;
    loadConfig();
  }

  function loadConfig() {
    fetch('config.json')
      .then(function(res) {
        if (!res.ok) throw new Error('配置文件加载失败');
        return res.json();
      })
      .then(function(data) {
        config = data;
        state.relics = data.relics || defaultRelics.slice();
        configLoaded = true;
        loadLocalData();
        initSession(function() {
          if (readyCallback) readyCallback();
        });
      })
      .catch(function(err) {
        console.error('加载配置失败:', err);
        config = { settings: { location: '巴渝民俗博物馆', totalLevels: 5, levelPrefix: 'level' } };
        state.relics = defaultRelics.slice();
        configLoaded = true;
        loadLocalData();
        initSession(function() {
          if (readyCallback) readyCallback();
        });
      });
  }

  function isConfigLoaded() {
    return configLoaded;
  }

  function getConfig() {
    return config;
  }

  function getSettings() {
    return config ? config.settings : { location: '巴渝民俗博物馆', totalLevels: 5, levelPrefix: 'level' };
  }

  function getTotalLevels() {
    return config ? (config.settings.totalLevels || 5) : 5;
  }

  function getLevelOrder() {
    var total = getTotalLevels();
    var prefix = config ? (config.settings.levelPrefix || 'level') : 'level';
    var order = [];
    for (var i = 1; i <= total; i++) {
      order.push(prefix + i);
    }
    return order;
  }

  function loadLocalData() {
    loadUserData();
    loadLevelTimes();
    loadMedalNumber();
    loadFirstCompletion();
  }

  function loadLevelTimes() {
    try {
      var data = localStorage.getItem('levelTimes');
      if (data) {
        levelTimes = JSON.parse(data);
      }
    } catch (e) {
      levelTimes = {};
    }
  }

  function saveLevelTimes() {
    try {
      localStorage.setItem('levelTimes', JSON.stringify(levelTimes));
    } catch (e) {
      console.error('保存关卡用时失败', e);
    }
  }

  function getLevelTime(levelId) {
    return levelTimes[levelId] || 0;
  }

  function setLevelTime(levelId, seconds) {
    if (!levelTimes[levelId] || seconds < levelTimes[levelId]) {
      levelTimes[levelId] = seconds;
      saveLevelTimes();
    }
  }

  function getTotalTime() {
    var total = 0;
    var levelOrder = getLevelOrder();
    for (var i = 0; i < levelOrder.length; i++) {
      total += (levelTimes[levelOrder[i]] || 0);
    }
    return total;
  }

  function formatTime(seconds) {
    var m = Math.floor(seconds / 60);
    var s = seconds % 60;
    if (m > 0) {
      return m + '分' + s + '秒';
    }
    return s + '秒';
  }

  function loadMedalNumber() {
    try {
      var stored = localStorage.getItem('medalNumber');
      if (stored) {
        medalNumber = stored;
      }
    } catch (e) {
      medalNumber = '';
    }
  }

  function getMedalNumber() {
    return medalNumber;
  }

  function generateMedalNumber() {
    if (medalNumber) return medalNumber;
    var now = new Date();
    var ts = String(Date.now());
    var suffix = ts.slice(-7);
    medalNumber = 'BM' + now.getFullYear() + suffix;
    try {
      localStorage.setItem('medalNumber', medalNumber);
    } catch (e) {}
    return medalNumber;
  }

  function loadFirstCompletion() {
    try {
      var data = localStorage.getItem('firstCompletion');
      if (data) {
        firstCompletion = JSON.parse(data);
      }
    } catch (e) {
      firstCompletion = null;
    }
  }

  function setFirstCompletion(time, nickname) {
    var now = new Date();
    var dateStr = now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日';
    firstCompletion = { time: time, date: dateStr, nickname: nickname };
    try {
      localStorage.setItem('firstCompletion', JSON.stringify(firstCompletion));
    } catch (e) {}
    generateMedalNumber();
  }

  function getFirstCompletion() {
    return firstCompletion;
  }

  function hasFirstCompletion() {
    return firstCompletion !== null && firstCompletion.time > 0;
  }

  function loadUserData() {
    try {
      var data = localStorage.getItem('userData');
      if (data) {
        var parsed = JSON.parse(data);
        state.completedLevels = parsed.completedLevels || [];
        state.unlockedLevels = parsed.unlockedLevels || ['level1'];
      }
    } catch (e) {
      console.error('加载用户数据失败', e);
    }
  }

  function saveUserData() {
    try {
      localStorage.setItem('userData', JSON.stringify({
        completedLevels: state.completedLevels,
        unlockedLevels: state.unlockedLevels
      }));
    } catch (e) {
      console.error('保存用户数据失败', e);
    }
  }

  function completeLevel(levelId) {
    if (state.completedLevels.indexOf(levelId) === -1) {
      state.completedLevels.push(levelId);
    }

    var levelOrder = getLevelOrder();
    var currentIndex = levelOrder.indexOf(levelId);
    if (currentIndex < levelOrder.length - 1) {
      var nextLevel = levelOrder[currentIndex + 1];
      if (state.unlockedLevels.indexOf(nextLevel) === -1) {
        state.unlockedLevels.push(nextLevel);
      }
    }

    saveUserData();
    if (serverAvailable) {
      syncProgress();
    }
  }

  function isLevelUnlocked(levelId) {
    return state.unlockedLevels.indexOf(levelId) !== -1;
  }

  function isLevelCompleted(levelId) {
    return state.completedLevels.indexOf(levelId) !== -1;
  }

  function resetProgress() {
    state.completedLevels = [];
    state.unlockedLevels = ['level1'];
    levelTimes = {};
    medalNumber = '';
    firstCompletion = null;
    localStorage.removeItem('userData');
    localStorage.removeItem('levelTimes');
    localStorage.removeItem('medalNumber');
    localStorage.removeItem('firstCompletion');
    if (serverAvailable && token) {
      syncProgress();
    }
  }

  var NICKNAME_WORDS = [
    '快乐', '勇敢', '幸运', '勤劳', '智慧', '热心', '阳光',
    '好奇', '自由', '温暖', '元气', '灵动', '远方', '追风'
  ];

  function generateFallbackNickname() {
    var word = NICKNAME_WORDS[Math.floor(Math.random() * NICKNAME_WORDS.length)];
    var num = String(Math.floor(Math.random() * 900) + 100);
    return word + '玩家' + num;
  }

  function getNickname() {
    try {
      var stored = localStorage.getItem('nickname');
      if (stored && stored.trim()) {
        return stored.trim();
      }
    } catch (e) {}
    var fallback = generateFallbackNickname();
    try { localStorage.setItem('nickname', fallback); } catch (e) {}
    return fallback;
  }

  function getRelicByLevel(levelId) {
    for (var i = 0; i < state.relics.length; i++) {
      var relic = state.relics[i];
      var relicLevelId = (config && config.settings ? config.settings.levelPrefix : 'level') + relic.level;
      if (relicLevelId === levelId) {
        return relic;
      }
    }
    return state.relics[0] || null;
  }

  function isInWechat() {
    var ua = navigator.userAgent || '';
    return ua.indexOf('MicroMessenger') !== -1;
  }

  function getToken() {
    if (token) return token;
    try {
      token = localStorage.getItem('serverToken') || '';
    } catch (e) {}
    return token;
  }

  function saveToken(newToken, newUserId) {
    token = newToken;
    userId = newUserId;
    try {
      localStorage.setItem('serverToken', token);
      localStorage.setItem('serverUserId', userId);
    } catch (e) {}
  }

  function clearToken() {
    token = '';
    userId = '';
    try {
      localStorage.removeItem('serverToken');
      localStorage.removeItem('serverUserId');
    } catch (e) {}
  }

  function callApi(method, path, body) {
    return new Promise(function(resolve, reject) {
      var headers = { 'Content-Type': 'application/json' };
      var t = getToken();
      if (t) {
        headers['Authorization'] = 'Bearer ' + t;
      }
      var options = {
        method: method,
        headers: headers
      };
      if (body && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(body);
      }
      fetch(API_BASE_URL + path, options)
        .then(function(res) {
          if (res.status === 401) {
            clearToken();
            reject(new Error('Unauthorized'));
            return;
          }
          if (!res.ok) {
            reject(new Error('API error: ' + res.status));
            return;
          }
          return res.json();
        })
        .then(function(data) {
          resolve(data);
        })
        .catch(function(err) {
          reject(err);
        });
    });
  }

  function initSession(callback) {
    var urlParams = (function() {
      try {
        var search = location.search;
      if (!search) {
        var hash = location.hash;
        var qi = hash.indexOf('?');
        if (qi >= 0) search = hash.substring(qi);
      }
      if (!search) return {};
      var params = {};
      search.slice(1).split('&').forEach(function(pair) {
        var parts = pair.split('=');
        params[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1] || '');
      });
      return params;
      } catch (e) { return {}; }
    })();

    var tokenFromUrl = urlParams.token;
    if (tokenFromUrl) {
      saveToken(tokenFromUrl, '');
      if (history.replaceState) {
        var hash = location.hash;
        var qi = hash.indexOf('?');
        if (qi >= 0) hash = hash.substring(0, qi);
        history.replaceState({}, '', location.pathname + hash);
      }
    }

    callApi('POST', '/api/user/session', {})
      .then(function(data) {
        serverAvailable = true;
        saveToken(data.token, data.userId);
        userId = data.userId;
        isAnonymousUser = data.isAnonymous;

        try {
          localStorage.setItem('serverUserId', data.userId);
          if (data.nickname) {
            localStorage.setItem('nickname', data.nickname);
          }
        } catch (e) {}

        if (data.unlockedLevels && data.unlockedLevels.length > 0) {
          state.unlockedLevels = data.unlockedLevels;
          state.completedLevels = data.completedLevels || [];
          levelTimes = data.levelTimes || {};
          saveUserData();
          saveLevelTimes();
        }

        console.log('[App] Session initialized:', data.userId, data.isAnonymous ? '(anonymous)' : '(wechat)');
        if (callback) callback();
      })
      .catch(function(err) {
        console.warn('[App] Server unavailable, using local mode:', err.message);
        serverAvailable = false;
        try {
          var storedToken = localStorage.getItem('serverToken');
          var storedUserId = localStorage.getItem('serverUserId');
          if (storedToken) token = storedToken;
          if (storedUserId) userId = storedUserId;
        } catch (e) {}
        if (callback) callback();
      });
  }

  function syncProgress() {
    if (!token || !serverAvailable) return;
    callApi('POST', '/api/user/progress', {
      unlockedLevels: state.unlockedLevels,
      completedLevels: state.completedLevels,
      levelTimes: levelTimes,
      totalTime: getTotalTime()
    }).catch(function(err) {
      console.warn('[App] Sync progress failed:', err.message);
    });
  }

  function loadProgress() {
    return callApi('GET', '/api/user/progress', null)
      .then(function(data) {
        if (data.unlockedLevels) {
          state.unlockedLevels = data.unlockedLevels;
          state.completedLevels = data.completedLevels || [];
          levelTimes = data.levelTimes || {};
          saveUserData();
          saveLevelTimes();
        }
        return data;
      });
  }

  function getUserId() {
    return userId;
  }

  function isAnonymous() {
    return isAnonymousUser;
  }

  function isServerAvailable() {
    return serverAvailable;
  }

  function updateNicknameOnServer(nickname) {
    if (!serverAvailable || !token) return Promise.resolve();
    return callApi('PUT', '/api/user/nickname', { nickname: nickname })
      .catch(function(err) {
        console.warn('[App] Update nickname failed:', err.message);
      });
  }

  function hasNewRank() {
    try {
      return localStorage.getItem('rankHasNew') === '1';
    } catch (e) {
      return false;
    }
  }

  function markRankViewed() {
    try {
      localStorage.setItem('rankHasNew', '0');
    } catch (e) {}
  }

  function setRankNew() {
    try {
      localStorage.setItem('rankHasNew', '1');
    } catch (e) {}
  }

  function getBestDailyRank() {
    try {
      var data = localStorage.getItem('bestRankInfo');
      if (data) {
        return JSON.parse(data).bestDailyRank || 0;
      }
    } catch (e) {}
    return 0;
  }

  function getBestTotalRank() {
    try {
      var data = localStorage.getItem('bestRankInfo');
      if (data) {
        return JSON.parse(data).bestTotalRank || 0;
      }
    } catch (e) {}
    return 0;
  }

  function saveBestRankInfo(bestDailyRank, bestTotalRank, updatedDate) {
    try {
      localStorage.setItem('bestRankInfo', JSON.stringify({
        bestDailyRank: bestDailyRank,
        bestTotalRank: bestTotalRank,
        updatedDate: updatedDate
      }));
    } catch (e) {}
  }

  return {
    init: init,
    state: state,
    getConfig: getConfig,
    getSettings: getSettings,
    getTotalLevels: getTotalLevels,
    getLevelOrder: getLevelOrder,
    completeLevel: completeLevel,
    isLevelUnlocked: isLevelUnlocked,
    isLevelCompleted: isLevelCompleted,
    resetProgress: resetProgress,
    getNickname: getNickname,
    getLevelTime: getLevelTime,
    setLevelTime: setLevelTime,
    getTotalTime: getTotalTime,
    formatTime: formatTime,
    getMedalNumber: getMedalNumber,
    generateMedalNumber: generateMedalNumber,
    setFirstCompletion: setFirstCompletion,
    getFirstCompletion: getFirstCompletion,
    hasFirstCompletion: hasFirstCompletion,
    getRelicByLevel: getRelicByLevel,
    isConfigLoaded: isConfigLoaded,
    isInWechat: isInWechat,
    getToken: getToken,
    getUserId: getUserId,
    isAnonymous: isAnonymous,
    isServerAvailable: isServerAvailable,
    syncProgress: syncProgress,
    loadProgress: loadProgress,
    updateNicknameOnServer: updateNicknameOnServer,
    callApi: callApi,
    hasNewRank: hasNewRank,
    markRankViewed: markRankViewed,
    setRankNew: setRankNew,
    getBestDailyRank: getBestDailyRank,
    getBestTotalRank: getBestTotalRank,
    saveBestRankInfo: saveBestRankInfo
  };
})();
