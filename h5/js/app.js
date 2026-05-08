var App = (function () {
  'use strict';

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
        loadUserData();
        loadLevelTimes();
        loadMedalNumber();
        loadFirstCompletion();
        if (readyCallback) readyCallback();
      })
      .catch(function(err) {
        console.error('加载配置失败:', err);
        config = { settings: { location: '巴渝民俗博物馆', totalLevels: 5, levelPrefix: 'level' } };
        state.relics = defaultRelics.slice();
        configLoaded = true;
        loadUserData();
        loadLevelTimes();
        loadMedalNumber();
        loadFirstCompletion();
        if (readyCallback) readyCallback();
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
    }
    saveLevelTimes();
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
  }

  function getNickname() {
    try {
      var stored = localStorage.getItem('nickname');
      if (stored && stored.trim()) {
        return stored.trim();
      }
    } catch (e) {}
    return '神秘玩家';
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
    isConfigLoaded: isConfigLoaded
  };
})();
