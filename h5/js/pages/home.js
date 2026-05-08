var HomePage = (function () {
  'use strict';

  var selectedLevel = 'level1';

  function render() {
    var settings = App.getSettings();
    var totalLevels = App.getTotalLevels();
    var levelPrefix = settings.levelPrefix || 'level';

    var levels = [];
    for (var i = 1; i <= totalLevels; i++) {
      levels.push({ id: levelPrefix + i, num: i });
    }

    var completed = App.state.completedLevels.length;
    var percent = (completed / totalLevels) * 100;

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
      if (App.isLevelCompleted(lv.id)) {
        levelHtml += '<div class="completed-badge">&#10003;</div>';
      }
      levelHtml += '</div>';
    }

    var currentRelic = App.getRelicByLevel(selectedLevel);
    var previewHtml = '';
    if (currentRelic) {
      previewHtml = '<div class="preview-section">'
        + '<div class="preview-card">'
        + '<div class="preview-title">' + currentRelic.name + '</div>'
        + '<div class="preview-image"><img src="' + currentRelic.image + '" alt="' + currentRelic.name + '"></div>'
        + '<div class="preview-info">'
        + '<span class="info-item">' + currentRelic.era + '</span>'
        + '<span class="info-item">' + settings.location + '馆藏</span>'
        + '</div>'
        + '</div>'
        + '</div>';
    }

    var hasCert = App.hasFirstCompletion();

    var bottomButtonsHtml = '';
    if (hasCert) {
      bottomButtonsHtml = '<div class="bottom-nav-row">'
        + '<button class="bottom-nav-btn" id="btn-gallery-new">🖼 图库</button>'
        + '<button class="bottom-nav-btn cert-btn" id="btn-cert">🏆 证书</button>'
        + '<button class="bottom-nav-btn" id="btn-settings-new">⚙ 设置</button>'
        + '</div>';
    } else {
      bottomButtonsHtml = '<div class="bottom-nav-row">'
        + '<button class="bottom-nav-btn" id="btn-gallery-new">🖼 图库</button>'
        + '<button class="bottom-nav-btn" id="btn-settings-new">⚙ 设置</button>'
        + '</div>';
    }

    return '<div class="home-container">'
      + '<div class="progress-section">'
      + '<div class="progress-title">关卡进度</div>'
      + '<div class="progress-bar-container"><div class="progress-bar" style="width:' + percent + '%"></div></div>'
      + '<div class="progress-text">已完成 ' + completed + ' / 共 ' + totalLevels + ' 关</div>'
      + '</div>'
      + '<div class="level-selector">' + levelHtml + '</div>'
      + previewHtml
      + '<div class="action-buttons">'
      + '<button class="btn-primary start-btn" id="btn-start">开始游戏</button>'
      + bottomButtonsHtml
      + '</div>'
      + '<div class="footer">公益科普 · 文化传承</div>'
      + '</div>';
  }

  function getDefaultSelectedLevel() {
    var levelOrder = App.getLevelOrder();
    for (var i = levelOrder.length - 1; i >= 0; i--) {
      if (App.isLevelUnlocked(levelOrder[i])) {
        return levelOrder[i];
      }
    }
    return levelOrder[0];
  }

  function mount() {
    var levelItems = document.querySelectorAll('.level-item');
    for (var i = 0; i < levelItems.length; i++) {
      levelItems[i].addEventListener('click', function () {
        var id = this.getAttribute('data-level');
        if (!App.isLevelUnlocked(id)) {
          Toast.show('请先完成前面的关卡');
          AudioManager.playError();
          return;
        }
        AudioManager.playClick();
        selectedLevel = id;
        updateUI();
      });
    }

    document.getElementById('btn-start').addEventListener('click', function () {
      if (!selectedLevel) {
        Toast.show('请选择关卡');
        AudioManager.playError();
        return;
      }
      AudioManager.playClick();
      Router.navigate('game', { level: selectedLevel });
    });

    var galleryBtn = document.getElementById('btn-gallery-new');
    if (galleryBtn) {
      galleryBtn.addEventListener('click', function () {
        AudioManager.playClick();
        Router.navigate('gallery');
      });
    }

    var certBtn = document.getElementById('btn-cert');
    if (certBtn) {
      certBtn.addEventListener('click', function () {
        AudioManager.playClick();
        Router.navigate('certificate');
      });
    }

    var settingsBtn = document.getElementById('btn-settings-new');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', function () {
        AudioManager.playClick();
        Router.navigate('settings');
      });
    }
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
    
    var currentRelic = App.getRelicByLevel(selectedLevel);
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
      var settings = App.getSettings();
      var infoItems = previewInfo.querySelectorAll('.info-item');
      if (infoItems.length >= 2) {
        infoItems[0].textContent = currentRelic.era;
        infoItems[1].textContent = settings.location + '馆藏';
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
