var HomePage = (function () {
  'use strict';

  var selectedLevel = 'level1';

  function render() {
    var levels = [
      { id: 'level1', num: 1, name: '青铜鼎' },
      { id: 'level2', num: 2, name: '玉琮' },
      { id: 'level3', num: 3, name: '唐三彩' },
      { id: 'level4', num: 4, name: '青花瓷' },
      { id: 'level5', num: 5, name: '景泰蓝' }
    ];

    var completed = App.state.completedLevels.length;
    var total = 5;
    var percent = (completed / total) * 100;

    selectedLevel = getDefaultSelectedLevel();

    var levelHtml = '';
    for (var i = 0; i < levels.length; i++) {
      var lv = levels[i];
      var cls = 'level-item';
      if (App.isLevelCompleted(lv.id)) cls += ' completed';
      else if (!App.isLevelUnlocked(lv.id)) cls += ' locked';
      cls += (lv.id === selectedLevel) ? ' active' : '';

      levelHtml += '<div class="' + cls + '" data-level="' + lv.id + '">';
      levelHtml += '<div class="level-number">' + lv.num + '</div>';
      levelHtml += '<div class="level-name">' + lv.name + '</div>';
      if (App.isLevelCompleted(lv.id)) {
        levelHtml += '<div class="completed-badge">&#10003;</div>';
      }
      levelHtml += '</div>';
    }

    var currentRelic = getCurrentRelic();
    var previewHtml = '';
    if (currentRelic) {
      previewHtml = '<div class="preview-section">'
        + '<div class="preview-card">'
        + '<div class="preview-title">' + currentRelic.name + '</div>'
        + '<div class="preview-image"><img src="' + currentRelic.image + '" alt="' + currentRelic.name + '"></div>'
        + '<div class="preview-info">'
        + '<span class="info-item">' + currentRelic.era + '</span>'
        + '<span class="info-item">' + currentRelic.location + '</span>'
        + '</div>'
        + '</div>'
        + '</div>';
    }

    return '<div class="home-container">'
      + '<div class="home-header">'
      + '<div class="home-settings-btn" id="btn-settings">&#9881;</div>'
      + '</div>'
      + '<div class="progress-section">'
      + '<div class="progress-title">关卡进度</div>'
      + '<div class="progress-bar-container"><div class="progress-bar" style="width:' + percent + '%"></div></div>'
      + '<div class="progress-text">已完成 ' + completed + ' / 共 ' + total + ' 关</div>'
      + '</div>'
      + '<div class="level-selector">' + levelHtml + '</div>'
      + previewHtml
      + '<div class="action-buttons">'
      + '<button class="btn-primary start-btn" id="btn-start">开始游戏</button>'
      + '<button class="btn-secondary gallery-btn" id="btn-gallery">图库</button>'
      + '</div>'
      + '<div class="footer">公益科普 · 文化传承</div>'
      + '</div>';
  }

  function getDefaultSelectedLevel() {
    var levels = ['level1', 'level2', 'level3', 'level4', 'level5'];
    for (var i = levels.length - 1; i >= 0; i--) {
      if (App.isLevelUnlocked(levels[i])) {
        return levels[i];
      }
    }
    return 'level1';
  }

  function getCurrentRelic() {
    for (var i = 0; i < App.state.relics.length; i++) {
      if (App.state.relics[i].level === selectedLevel) {
        return App.state.relics[i];
      }
    }
    return App.state.relics[0];
  }

  function mount() {
    document.getElementById('btn-settings').addEventListener('click', function () {
      Router.navigate('settings');
    });

    var levelItems = document.querySelectorAll('.level-item');
    for (var i = 0; i < levelItems.length; i++) {
      levelItems[i].addEventListener('click', function () {
        var id = this.getAttribute('data-level');
        if (!App.isLevelUnlocked(id)) {
          Toast.show('请先完成前面的关卡');
          return;
        }
        selectedLevel = id;
        updateUI();
      });
    }

    document.getElementById('btn-start').addEventListener('click', function () {
      if (!selectedLevel) {
        Toast.show('请选择关卡');
        return;
      }
      Router.navigate('game', { level: selectedLevel });
    });

    document.getElementById('btn-gallery').addEventListener('click', function () {
      Router.navigate('gallery');
    });
  }

  function getCurrentRelic() {
    for (var i = 0; i < App.state.relics.length; i++) {
      if (App.state.relics[i].level === selectedLevel) {
        return App.state.relics[i];
      }
    }
    return App.state.relics[0];
  }

  function updateUI() {
    var levelItems = document.querySelectorAll('.level-item');
    for (var i = 0; i < levelItems.length; i++) {
      var item = levelItems[i];
      var id = item.getAttribute('data-level');
      if (id === selectedLevel) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    }
    
    var currentRelic = getCurrentRelic();
    var previewImage = document.querySelector('.preview-image img');
    var previewTitle = document.querySelector('.preview-title');
    var previewInfo = document.querySelector('.preview-info');
    
    if (previewImage && currentRelic) {
      previewImage.classList.add('fade-out');
      
      setTimeout(function() {
        previewImage.src = currentRelic.image;
        previewImage.alt = currentRelic.name;
        previewImage.classList.remove('fade-out');
        previewImage.classList.add('fade-in');
        
        setTimeout(function() {
          previewImage.classList.remove('fade-in');
        }, 300);
      }, 150);
    }
    
    if (previewTitle && currentRelic) {
      previewTitle.textContent = currentRelic.name;
    }
    
    if (previewInfo && currentRelic) {
      var infoItems = previewInfo.querySelectorAll('.info-item');
      if (infoItems.length >= 2) {
        infoItems[0].textContent = currentRelic.era;
        infoItems[1].textContent = currentRelic.location;
      }
    }
  }

  function unmount() {
  }

  return {
    render: render,
    mount: mount,
    unmount: unmount
  };
})();
