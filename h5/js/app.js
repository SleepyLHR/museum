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
        name: '龚晴皋题行书轴',
        era: '清',
        location: '巴渝民俗博物馆',
        value: '国家二级文物',
        spec: '纵108.7厘米，横26.5厘米',
        description: '龚晴皋被誉为"巴渝书坛第一人"，民间素有"家无晴皋字，必是俗家人"之说。《巴县志》称其为"县三百年来极高逸文艺之誉者"。馆藏《清龚晴皋题行书轴》碑帖交融、遒劲硬朗，为其上乘佳作。',
        image: 'images/龚晴皋题行书轴.png',
        level: 'level1',
        pieces: 6
      },
      {
        id: 'relic2',
        name: '红陶提囊执便面俑',
        era: '汉',
        location: '巴渝民俗博物馆',
        value: '国家二级文物',
        spec: '长9.1厘米，宽8.6厘米，高27.8厘米',
        description: '此俑为泥质红陶圆雕中空立姿，梳高发髻，左手提袋，右手持便面。便面是古代遮面扇具，可遮挡面容，用于社交场合回避旁人、化解尴尬。',
        image: 'images/红陶提囊执便面俑.jpg',
        level: 'level2',
        pieces: 8
      },
      {
        id: 'relic3',
        name: '祭祀风俗画',
        era: '清',
        location: '巴渝民俗博物馆',
        value: '国家二级文物',
        spec: '纵132厘米，横61.3厘米',
        description: '此系列风俗画色彩明亮，通过丰富的文化符号和传统元素，展现了不同历史阶段的社会风貌、民间信仰以及人们的生活方式，是研究古代民间绘画艺术发展的重要实例。',
        image: 'images/祭祀风俗画.png',
        level: 'level3',
        pieces: 10
      },
      {
        id: 'relic4',
        name: '满金雕花家神龛',
        era: '清',
        location: '巴渝民俗博物馆',
        value: '国家二级文物',
        spec: '高458厘米，宽170厘米，厚67厘米',
        description: '家神龛俗称"香火"，民间用以敬香报本祈福。巴渝重其规制以显家族实力。此龛分座、身、顶三段，雕双龙飞龙、群仙图，恪守古法书"天地君亲师"牌位，楹联寓意慎终追远，金漆精工、庄严罕见，为国家二级文物。',
        image: 'images/满金雕花家神龛.png',
        level: 'level4',
        pieces: 12
      },
      {
        id: 'relic5',
        name: '镂雕满金漆花鸟纹拔步床',
        era: '清',
        location: '巴渝民俗博物馆',
        value: '国家二级文物',
        spec: '高291厘米，宽274厘米，深281厘米',
        description: '此重庆两江悦来戴氏古床，耗时三年由三位匠师精作。满金髹饰，雕有瓜蝶、牡丹、佛手寿桃及梅兰竹菊等纹样，寓意子孙绵延、富贵福寿、君子风骨。此床工艺精湛、意蕴丰厚，是巴渝金木雕代表作，为国家二级文物。',
        image: 'images/镂雕满金漆花鸟纹拔步床.png',
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
