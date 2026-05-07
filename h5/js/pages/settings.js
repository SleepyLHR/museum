var SettingsPage = (function () {
  'use strict';

  function render() {
    var userId = getUserId();

    var musicChecked = getSetting('musicEnabled', true) ? 'checked' : '';
    var soundChecked = getSetting('soundEnabled', true) ? 'checked' : '';

    return '<div class="settings-container">'
      + '<div class="settings-header">'
      + '<div class="back-btn" id="btn-back">←</div>'
      + '<div class="settings-title">设置</div>'
      + '</div>'
      + '<div class="settings-content">'
      + '<div class="settings-card">'
      + '<div class="user-section">'
      + '<div class="user-avatar">👤</div>'
      + '<div class="user-info">'
      + '<div class="user-name">玩家</div>'
      + '<div class="user-id">ID: ' + userId + '</div>'
      + '</div>'
      + '</div>'
      + '</div>'
      + '<div class="settings-card">'
      + buildSwitchItem('🎵', '音乐', 'setting-music', musicChecked)
      + buildSwitchItem('🔊', '音效', 'setting-sound', soundChecked)
      + '</div>'
      + '<div class="settings-card">'
      + '<div class="action-section">'
      + '<button class="action-btn secondary" id="btn-restart">重新开始</button>'
      + '<button class="action-btn primary" id="btn-home">返回首页</button>'
      + '</div>'
      + '</div>'
      + '<div class="version-info">版本号: v2.0.0 (H5)</div>'
      + '</div>'
      + '</div>';
  }

  function buildSwitchItem(icon, label, id, checked) {
    return '<div class="setting-item">'
      + '<div class="setting-label">'
      + '<span class="label-icon">' + icon + '</span>'
      + '<span class="label-text">' + label + '</span>'
      + '</div>'
      + '<label class="toggle-switch">'
      + '<input type="checkbox" id="' + id + '" ' + checked + '>'
      + '<span class="toggle-slider"></span>'
      + '</label>'
      + '</div>';
  }

  function getUserId() {
    var userId = localStorage.getItem('userId');
    if (!userId) {
      userId = 'U' + Date.now() + Math.floor(Math.random() * 1000);
      localStorage.setItem('userId', userId);
    }
    return userId;
  }

  function getSetting(key, defaultVal) {
    try {
      var settings = localStorage.getItem('gameSettings');
      if (settings) {
        var parsed = JSON.parse(settings);
        if (parsed[key] !== undefined) return parsed[key];
      }
    } catch (e) {}
    return defaultVal;
  }

  function saveSettings() {
    try {
      localStorage.setItem('gameSettings', JSON.stringify({
        musicEnabled: document.getElementById('setting-music').checked,
        soundEnabled: document.getElementById('setting-sound').checked
      }));
    } catch (e) {
      console.error('保存设置失败', e);
    }
  }

  function mount() {
    document.getElementById('btn-back').addEventListener('click', function () {
      AudioManager.playClick();
      Router.goBack();
    });

    document.getElementById('btn-home').addEventListener('click', function () {
      AudioManager.playClick();
      Router.navigate('home');
    });

    var switches = ['setting-music', 'setting-sound'];
    for (var i = 0; i < switches.length; i++) {
      document.getElementById(switches[i]).addEventListener('change', function (e) {
        saveSettings();
        
        var settingId = e.target.id;
        
        if (settingId === 'setting-music') {
          var musicEnabled = document.getElementById('setting-music').checked;
          AudioManager.setBgmEnabled(musicEnabled);
        }
        
        if (settingId === 'setting-sound') {
          var soundEnabled = document.getElementById('setting-sound').checked;
          AudioManager.setSfxEnabled(soundEnabled);
        }
      });
    }

    document.getElementById('btn-restart').addEventListener('click', function () {
      AudioManager.playClick();
      Modal.confirm('确认重新开始', '重新开始将清除所有游戏进度，确定要继续吗？', function (confirmed) {
        if (confirmed) {
          App.resetProgress();
          Toast.show('已重置进度', 'success');
        }
      });
    });
  }

  function unmount() {
  }

  return {
    render: render,
    mount: mount,
    unmount: unmount
  };
})();