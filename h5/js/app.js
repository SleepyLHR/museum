var App = (function () {
  'use strict';

  var state = {
    userInfo: null,
    completedLevels: [],
    unlockedLevels: ['level1'],
    relics: []
  };

  function init() {
    loadUserData();
    loadRelicsData();
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

  function loadRelicsData() {
    state.relics = [
      {
        id: 'relic1',
        name: '青铜兽面纹鼎',
        era: '商代晚期',
        location: '河南安阳殷墟出土',
        value: '国家一级文物',
        description: '此鼎造型雄伟，纹饰精美，是商代青铜艺术的杰出代表。兽面纹又称饕餮纹，是商代青铜器上最具特色的装饰纹样。',
        image: 'https://images.metmuseum.org/CRDImages/as/original/DP140735.jpg',
        level: 'level1',
        pieces: 6
      },
      {
        id: 'relic2',
        name: '玉琮',
        era: '良渚文化',
        location: '浙江余杭良渚遗址',
        value: '国家一级文物',
        description: '玉琮是良渚文化的典型器物，外方内圆的造型象征着天圆地方的宇宙观。这件玉琮制作精美，是中国古代玉器中的珍品。',
        image: 'https://images.metmuseum.org/CRDImages/as/original/DP161556.jpg',
        level: 'level2',
        pieces: 8
      },
      {
        id: 'relic3',
        name: '唐三彩骆驼载乐俑',
        era: '唐代',
        location: '陕西西安出土',
        value: '国家一级文物',
        description: '这件唐三彩骆驼载乐俑生动地展现了唐代丝绸之路的繁荣景象，骆驼上的乐师们正在演奏，充满了异域风情。',
        image: 'https://images.metmuseum.org/CRDImages/as/original/30_76_71_O1.jpg',
        level: 'level3',
        pieces: 10
      },
      {
        id: 'relic4',
        name: '青花瓷云龙纹罐',
        era: '元代',
        location: '江西景德镇',
        value: '国家一级文物',
        description: '元代青花瓷以其独特的青花纹饰和精湛的工艺著称于世。这件云龙纹罐是元代青花瓷器中的精品，龙纹矫健有力，栩栩如生。',
        image: 'https://images.metmuseum.org/CRDImages/as/original/DP229478.jpg',
        level: 'level4',
        pieces: 12
      },
      {
        id: 'relic5',
        name: '景泰蓝掐丝珐琅瓶',
        era: '清代乾隆年间',
        location: '北京故宫博物院',
        value: '国家一级文物',
        description: '景泰蓝是中国传统工艺的瑰宝，这件掐丝珐琅瓶色彩绚丽，工艺精湛，展现了清代珐琅工艺的最高水平。',
        image: 'https://images.metmuseum.org/CRDImages/as/original/DP-24606-001.jpg',
        level: 'level5',
        pieces: 15
      }
    ];
  }

  function completeLevel(levelId) {
    if (state.completedLevels.indexOf(levelId) === -1) {
      state.completedLevels.push(levelId);
    }

    var levelOrder = ['level1', 'level2', 'level3', 'level4', 'level5'];
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
    localStorage.removeItem('userData');
  }

  init();

  return {
    state: state,
    completeLevel: completeLevel,
    isLevelUnlocked: isLevelUnlocked,
    isLevelCompleted: isLevelCompleted,
    resetProgress: resetProgress
  };
})();
