var SettingsPage = (function () {
  'use strict';

  function render() {
    var userId = App.getUserId() || '加载中...';
    var nickname = App.getNickname();
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
      + '<div class="user-name-container" id="user-name-container">'
      + '<span class="user-name" id="user-name-display">' + escapeHtml(nickname) + '</span>'
      + '<span class="user-name-edit" id="btn-edit-nickname">✎</span>'
      + '</div>'
      + '<div class="user-name-input-wrap" id="nickname-input-wrap">'
      + '<input type="text" class="user-name-input" id="nickname-input" maxlength="12" placeholder="请输入昵称">'
      + '<button class="nickname-save-btn" id="btn-save-nickname">保存</button>'
      + '</div>'
      + '<div class="user-id">ID: ' + escapeHtml(userId) + '</div>'
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
      + '<div class="version-info">版本号: v2.1.0 (H5)</div>'
      + '</div>'
      + '</div>';
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
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

    document.getElementById('btn-edit-nickname').addEventListener('click', function (e) {
      e.stopPropagation();
      showNicknameInput();
    });

    document.getElementById('user-name-display').addEventListener('click', function () {
      showNicknameInput();
    });

    document.getElementById('btn-save-nickname').addEventListener('click', function () {
      saveNickname();
    });

    document.getElementById('nickname-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        saveNickname();
      }
    });

    document.getElementById('nickname-input').addEventListener('blur', function () {
      var display = document.getElementById('user-name-display');
      if (display && display.style.display !== 'none') return;
      saveNickname();
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

  function showNicknameInput() {
    var display = document.getElementById('user-name-display');
    var edit = document.getElementById('btn-edit-nickname');
    var wrap = document.getElementById('nickname-input-wrap');
    var input = document.getElementById('nickname-input');

    display.style.display = 'none';
    edit.style.display = 'none';
    wrap.style.display = 'flex';

    var current = App.getNickname();
    input.value = (current === '神秘玩家') ? '' : current;
    input.focus();
  }

  function saveNickname() {
    var input = document.getElementById('nickname-input');
    var display = document.getElementById('user-name-display');
    var edit = document.getElementById('btn-edit-nickname');
    var wrap = document.getElementById('nickname-input-wrap');

    if (!input || !display || !edit || !wrap) return;

    var nickname = input.value.trim();
    if (!nickname) {
      nickname = '神秘玩家';
    }

    try {
      localStorage.setItem('nickname', nickname);
    } catch (e) {}

    display.textContent = nickname;
    display.style.display = '';
    edit.style.display = '';
    wrap.style.display = 'none';

    App.updateNicknameOnServer(nickname);
  }

  function unmount() {
  }

  return {
    render: render,
    mount: mount,
    unmount: unmount
  };
})();
