var CertificatePage = (function () {
  'use strict';

  var currentTab = 'speed';

  function formatDate(date) {
    return date.getFullYear() + '年' + (date.getMonth() + 1) + '月' + date.getDate() + '日';
  }

  function getCertData(tab) {
    if (tab === 'speed') {
      return {
        subtitle: '电子荣誉证书',
        nickname: App.getNickname(),
        totalTime: App.getTotalTime(),
        timeStr: App.formatTime(App.getTotalTime()),
        certNum: App.getMedalNumber(),
        dateStr: formatDate(new Date())
      };
    } else {
      var fc = App.getFirstCompletion();
      if (fc) {
        return {
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
  }

  function buildCertCard(data) {
    return '<div class="certificate-preview">'
      + '<div class="cert-preview-title">文物拼图大挑战</div>'
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
    var speedData = getCertData('speed');

    var tabsHtml = '';
    if (hasCert) {
      tabsHtml = '<div class="cert-tabs">'
        + '<div class="cert-tab' + (currentTab === 'speed' ? ' active' : '') + '" data-tab="speed">🏆 最速记录</div>'
        + '<div class="cert-tab' + (currentTab === 'first' ? ' active' : '') + '" data-tab="first">🥇 首次通关</div>'
        + '</div>';
    }

    var certCard = '';
    if (currentTab === 'speed' || !hasCert) {
      certCard = buildCertCard(speedData);
    } else {
      var firstData = getCertData('first');
      if (firstData) {
        certCard = buildCertCard(firstData);
      }
    }

    var placeholder = '';
    if (!hasCert && currentTab === 'first') {
      placeholder = '<div class="cert-placeholder">尚未首次通关，继续努力！</div>';
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
        var tab = this.getAttribute('data-tab');
        if (tab !== currentTab) {
          currentTab = tab;
          refreshView();
        }
      });
    }

    document.getElementById('btn-save-cert-page').addEventListener('click', function () {
      var data = getCertData(currentTab);
      if (data) {
        GamePage.saveCertificateAsImage(data.nickname, data.timeStr, data.certNum, data.dateStr, data.subtitle);
      }
    });

    document.getElementById('btn-home-cert').addEventListener('click', function () {
      AudioManager.playClick();
      Router.navigate('home');
    });
  }

  function refreshView() {
    var body = document.querySelector('.certificate-body');
    var actions = document.querySelector('.certificate-actions');
    var tabs = document.querySelector('.cert-tabs');

    if (tabs) {
      var tabEls = tabs.querySelectorAll('.cert-tab');
      for (var i = 0; i < tabEls.length; i++) {
        if (tabEls[i].getAttribute('data-tab') === currentTab) {
          tabEls[i].classList.add('active');
        } else {
          tabEls[i].classList.remove('active');
        }
      }
    }

    var hasCert = App.hasFirstCompletion();
    var certCard = '';
    if (currentTab === 'speed' || !hasCert) {
      certCard = buildCertCard(getCertData('speed'));
    } else {
      var firstData = getCertData('first');
      if (firstData) {
        certCard = buildCertCard(firstData);
      }
    }

    var placeholder = '';
    if (!hasCert && currentTab === 'first') {
      placeholder = '<div class="cert-placeholder">尚未首次通关，继续努力！</div>';
    }

    body.innerHTML = placeholder + certCard;
  }

  function unmount() {}

  return {
    render: render,
    mount: mount,
    unmount: unmount
  };
})();
