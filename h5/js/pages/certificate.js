var CertificatePage = (function () {
  'use strict';

  var currentTab = 'speed';
  var bestRankInfo = null;

  function formatDate(date) {
    return date.getFullYear() + '年' + (date.getMonth() + 1) + '月' + date.getDate() + '日';
  }

  function formatShortDate(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
  }

  function loadBestRankInfo(callback) {
    App.callApi('/api/rank/my', 'GET', null, function(data) {
      bestRankInfo = data;
      App.saveBestRankInfo(data.bestDailyRank, data.bestTotalRank, formatShortDate(new Date().toISOString()));
      if (callback) callback(data);
    }).catch(function() {
      var localBest = {
        bestDailyRank: App.getBestDailyRank(),
        bestTotalRank: App.getBestTotalRank()
      };
      bestRankInfo = localBest;
      if (callback) callback(localBest);
    });
  }

  function getCertData(tab) {
    if (tab === 'speed') {
      return {
        type: 'speed',
        icon: '🏆',
        title: '最速记录',
        subtitle: '电子荣誉证书',
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
    } else if (tab === 'daily_best') {
      var bestDaily = bestRankInfo ? bestRankInfo.bestDailyRank : App.getBestDailyRank();
      var rankDate = '';
      try {
        var info = JSON.parse(localStorage.getItem('bestRankInfo') || '{}');
        rankDate = info.updatedDate || formatShortDate(new Date().toISOString());
      } catch (e) {
        rankDate = formatShortDate(new Date().toISOString());
      }
      return {
        type: 'daily_best',
        icon: '🏅',
        title: '日榜最佳',
        subtitle: '电子荣誉证书 · 日榜最佳',
        nickname: App.getNickname(),
        rank: bestDaily > 0 ? bestDaily : '-',
        dateStr: bestDaily > 0 ? rankDate : ''
      };
    } else if (tab === 'total_best') {
      var bestTotal = bestRankInfo ? bestRankInfo.bestTotalRank : App.getBestTotalRank();
      var rankDate = '';
      try {
        var info = JSON.parse(localStorage.getItem('bestRankInfo') || '{}');
        rankDate = info.updatedDate || formatShortDate(new Date().toISOString());
      } catch (e) {
        rankDate = formatShortDate(new Date().toISOString());
      }
      return {
        type: 'total_best',
        icon: '🎖️',
        title: '总榜最佳',
        subtitle: '电子荣誉证书 · 总榜最佳',
        nickname: App.getNickname(),
        rank: bestTotal > 0 ? bestTotal : '-',
        dateStr: bestTotal > 0 ? rankDate : ''
      };
    }
    return null;
  }

  function buildCertCard(data) {
    if (data.type === 'daily_best' || data.type === 'total_best') {
      return '<div class="certificate-preview rank-cert">'
        + '<div class="cert-preview-title">文物拼多多</div>'
        + '<div class="cert-preview-subtitle">' + data.subtitle + '</div>'
        + '<div class="cert-preview-divider"></div>'
        + '<div class="cert-preview-icon">' + data.icon + '</div>'
        + '<div class="cert-preview-rank">第 ' + data.rank + ' 名</div>'
        + '<div class="cert-preview-text">历史最佳</div>'
        + '<div class="cert-preview-date">' + data.dateStr + '</div>'
        + '<div class="cert-preview-footer">巴渝民俗博物馆 · 公益科普 文化传承</div>'
        + '</div>';
    }

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
    var hasRankCert = bestRankInfo && (bestRankInfo.bestDailyRank > 0 || bestRankInfo.bestTotalRank > 0);
    if (!bestRankInfo && hasCert) {
      hasRankCert = App.getBestDailyRank() > 0 || App.getBestTotalRank() > 0;
    }

    var tabsHtml = '';
    if (hasCert) {
      var speedActive = currentTab === 'speed' ? ' active' : '';
      var firstActive = currentTab === 'first' ? ' active' : '';
      var dailyActive = currentTab === 'daily_best' ? ' active' : '';
      var totalActive = currentTab === 'total_best' ? ' active' : '';

      tabsHtml = '<div class="cert-tabs">'
        + '<div class="cert-tab' + speedActive + '" data-tab="speed">🏆 最速</div>'
        + '<div class="cert-tab' + firstActive + '" data-tab="first">🥇 首次</div>'
        + '<div class="cert-tab' + dailyActive + '" data-tab="daily_best">📅 日榜</div>'
        + '<div class="cert-tab' + totalActive + '" data-tab="total_best">🎖️ 总榜</div>'
        + '</div>';
    }

    var certCard = '';
    var placeholder = '';

    if (currentTab === 'daily_best' || currentTab === 'total_best') {
      var rankData = getCertData(currentTab);
      if (rankData && rankData.rank && rankData.rank !== '-') {
        certCard = buildCertCard(rankData);
      } else {
        placeholder = '<div class="cert-placeholder">暂无排名记录，继续努力！</div>';
      }
    } else if (currentTab === 'speed') {
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
        var tab = this.getAttribute('data-tab');
        if (tab !== currentTab) {
          currentTab = tab;
          refreshView();
        }
      });
    }

    document.getElementById('btn-save-cert-page').addEventListener('click', function () {
      var data = getCertData(currentTab);
      if (data && data.nickname) {
        GamePage.saveCertificateAsImage(data.nickname, data.timeStr, data.certNum, data.dateStr, data.subtitle);
      } else if (data && data.rank && data.rank !== '-') {
        var canvas = document.createElement('canvas');
        canvas.width = 750;
        canvas.height = 1050;
        var ctx = canvas.getContext('2d');
        var gradient = ctx.createLinearGradient(0, 0, 750, 1050);
        gradient.addColorStop(0, '#fef3c7');
        gradient.addColorStop(1, '#fef9e7');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 750, 1050);
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 8;
        ctx.strokeRect(20, 20, 710, 1010);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 4;
        ctx.strokeRect(30, 30, 690, 990);
        ctx.fillStyle = '#92400e';
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('文物拼多多', 375, 120);
        ctx.font = '32px sans-serif';
        ctx.fillStyle = '#78350f';
        ctx.fillText(data.subtitle, 375, 180);
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(100, 210);
        ctx.lineTo(650, 210);
        ctx.stroke();
        ctx.font = '120px sans-serif';
        ctx.fillText(data.icon, 375, 400);
        ctx.font = 'bold 80px sans-serif';
        ctx.fillStyle = '#b45309';
        ctx.fillText('第 ' + data.rank + ' 名', 375, 530);
        ctx.font = '36px sans-serif';
        ctx.fillStyle = '#78350f';
        ctx.fillText('历史最佳', 375, 600);
        ctx.font = '32px sans-serif';
        ctx.fillText(data.dateStr, 375, 660);
        ctx.font = '24px sans-serif';
        ctx.fillStyle = '#92400e';
        ctx.fillText('巴渝民俗博物馆 · 公益科普 文化传承', 375, 950);
        canvas.toBlob(function(blob) {
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = 'cert_' + data.type + '_' + Date.now() + '.png';
          a.click();
          URL.revokeObjectURL(url);
        });
      } else {
        Toast.show('暂无可保存的证书');
      }
    });

    document.getElementById('btn-home-cert').addEventListener('click', function () {
      AudioManager.playClick();
      Router.navigate('home');
    });

    loadBestRankInfo(function(data) {
      refreshView();
    });
  }

  function refreshView() {
    var body = document.querySelector('.certificate-body');
    if (!body) return;

    var hasCert = App.hasFirstCompletion();
    var certCard = '';
    var placeholder = '';

    if (currentTab === 'daily_best' || currentTab === 'total_best') {
      var rankData = getCertData(currentTab);
      if (rankData && rankData.rank && rankData.rank !== '-') {
        certCard = buildCertCard(rankData);
      } else {
        placeholder = '<div class="cert-placeholder">暂无排名记录，继续努力！</div>';
      }
    } else if (currentTab === 'speed') {
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
  }

  function unmount() {}

  return {
    render: render,
    mount: mount,
    unmount: unmount
  };
})();
