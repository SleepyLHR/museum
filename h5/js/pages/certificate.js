var CertificatePage = (function () {
  'use strict';

  var currentTab = 'speed';

  function formatDate(date) {
    return date.getFullYear() + '年' + (date.getMonth() + 1) + '月' + date.getDate() + '日';
  }

  function getCertData(tab) {
    if (tab === 'speed') {
      return {
        type: 'speed',
        icon: '🏆',
        title: '最速记录',
        subtitle: '电子荣誉证书 · 最速通关纪念',
        nickname: App.getNickname(),
        totalTime: App.getTotalTime(),
        timeStr: App.formatTime(App.getTotalTime()),
        certNum: App.getMedalNumber(),
        dateStr: formatDate(new Date())
      };
    } else if (tab === 'first') {
      var fc = App.getFirstCompletion();
      if (fc) {
        return {
          type: 'first',
          icon: '🥇',
          title: '首次通关',
          subtitle: '电子荣誉证书 · 首次通关纪念',
          nickname: fc.nickname,
          totalTime: fc.time,
          timeStr: App.formatTime(fc.time),
          certNum: App.getMedalNumber(),
          dateStr: fc.date
        };
      }
      return null;
    }
    return null;
  }

  function buildCertCard(data) {
    return '<div class="certificate-preview">'
      + '<div class="cert-preview-title">文物拼多多</div>'
      + '<div class="cert-preview-subtitle">' + data.subtitle + '</div>'
      + '<div class="cert-preview-divider"></div>'
      + '<div class="cert-preview-name">' + data.nickname + '</div>'
      + '<div class="cert-preview-text">成功完成全部文物拼图挑战</div>'
      + '<div class="cert-preview-time">通关总耗时：' + data.timeStr + '</div>'
      + '<div class="cert-preview-number">证书编号：' + data.certNum + '</div>'
      + '<div class="cert-preview-date">' + data.dateStr + '</div>'
      + '<div class="cert-preview-footer">巴渝民俗博物馆 · 公益科普 文化传承</div>'
      + '</div>';
  }

  function render() {
    var hasCert = App.hasFirstCompletion();

    var tabsHtml = '';
    if (hasCert) {
      var speedActive = currentTab === 'speed' ? ' active' : '';
      var firstActive = currentTab === 'first' ? ' active' : '';

      tabsHtml = '<div class="cert-tabs">'
        + '<div class="cert-tab' + speedActive + '" data-tab="speed">🏆 最速</div>'
        + '<div class="cert-tab' + firstActive + '" data-tab="first">🥇 首次</div>'
        + '</div>';
    }

    var certCard = '';
    var placeholder = '';

    if (currentTab === 'speed') {
      certCard = buildCertCard(getCertData('speed'));
    } else if (currentTab === 'first') {
      if (hasCert) {
        var firstData = getCertData('first');
        if (firstData) {
          certCard = buildCertCard(firstData);
        }
      } else {
        placeholder = '<div class="cert-placeholder">尚未首次通关，继续努力！</div>';
      }
    }

    return '<div class="certificate-container">'
      + '<div class="certificate-header">'
      + '<div class="back-btn" id="btn-back-cert">←</div>'
      + '<div class="certificate-page-title">我的荣誉证书</div>'
      + '</div>'
      + tabsHtml
      + '<div class="certificate-body">'
      + placeholder
      + certCard
      + '</div>'
      + '<div class="certificate-actions">'
      + '<button class="btn-primary cert-action-btn" id="btn-save-cert-page">📥 保存证书</button>'
      + '<button class="btn-secondary cert-action-btn" id="btn-home-cert">↩ 返回首页</button>'
      + '</div>'
      + '</div>';
  }

  function mount() {
    document.getElementById('btn-back-cert').addEventListener('click', function () {
      AudioManager.playClick();
      Router.navigate('home');
    });

    var tabs = document.querySelectorAll('.cert-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener('click', function () {
        AudioManager.playClick();
        var tab = this.getAttribute('data-tab');
        if (tab !== currentTab) {
          currentTab = tab;
          refreshView();
        }
      });
    }

    document.getElementById('btn-save-cert-page').addEventListener('click', function () {
      AudioManager.playClick();
      var data = getCertData(currentTab);
      if (data && data.nickname) {
        GamePage.saveCertificateAsImage(data.nickname, data.timeStr, data.certNum, data.dateStr, data.subtitle);
      } else {
        Toast.show('暂无可保存的证书');
      }
    });

    document.getElementById('btn-home-cert').addEventListener('click', function () {
      AudioManager.playClick();
      Router.navigate('home');
    });
  }

  function refreshView() {
    var body = document.querySelector('.certificate-body');
    if (!body) return;

    var hasCert = App.hasFirstCompletion();
    var certCard = '';
    var placeholder = '';

    if (currentTab === 'speed') {
      certCard = buildCertCard(getCertData('speed'));
    } else if (currentTab === 'first') {
      if (hasCert) {
        var firstData = getCertData('first');
        if (firstData) {
          certCard = buildCertCard(firstData);
        }
      } else {
        placeholder = '<div class="cert-placeholder">尚未首次通关，继续努力！</div>';
      }
    }

    body.innerHTML = placeholder + certCard;

    var tabs = document.querySelectorAll('.cert-tab');
    for (var i = 0; i < tabs.length; i++) {
      var tabEl = tabs[i];
      if (tabEl.getAttribute('data-tab') === currentTab) {
        tabEl.classList.add('active');
      } else {
        tabEl.classList.remove('active');
      }
    }
  }

  function unmount() {
    var imgOverlay = document.getElementById('cert-image-overlay');
    if (imgOverlay) imgOverlay.remove();
  }

  return {
    render: render,
    mount: mount,
    unmount: unmount
  };
})();
