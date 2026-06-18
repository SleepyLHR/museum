var RankPage = (function () {
  'use strict';

  var currentTab = 'total';
  var totalPage = 1;
  var dailyPage = 1;
  var limit = 20;
  var totalList = [];
  var dailyList = [];
  var myRankInfo = null;
  var loadVersion = 0;

  function formatTime(seconds) {
    var mins = Math.floor(seconds / 60);
    var secs = seconds % 60;
    return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
  }

  function getRankList(tab) {
    if (tab === 'total') return totalList;
    return dailyList;
  }

  function buildRankItem(item, isMe) {
    var rankIcon = '';
    if (item.rank === 1) rankIcon = '🥇';
    else if (item.rank === 2) rankIcon = '🥈';
    else if (item.rank === 3) rankIcon = '🥉';
    else rankIcon = '';

    var extraClass = isMe ? ' rank-item-me' : '';
    return '<div class="rank-item' + extraClass + '">'
      + '<div class="rank-position">' + rankIcon + (rankIcon ? '' : item.rank) + '</div>'
      + '<div class="rank-nickname">' + (isMe ? '<strong>' + item.nickname + '</strong>' : item.nickname) + '</div>'
      + '<div class="rank-time">' + formatTime(item.totalTime) + '</div>'
      + '</div>';
  }

  function buildMyRankCard() {
    if (!myRankInfo) {
      return '<div class="my-rank-card">'
        + '<div class="my-rank-title">📊 我的排名</div>'
        + '<div class="my-rank-stats">'
        + '<div class="my-rank-stat">'
        + '<div class="stat-label">总榜</div>'
        + '<div class="stat-value">加载中...</div>'
        + '</div>'
        + '<div class="my-rank-stat">'
        + '<div class="stat-label">日榜</div>'
        + '<div class="stat-value">加载中...</div>'
        + '</div>'
        + '</div>'
        + '</div>';
    }

    var dailyRank = myRankInfo.dailyRank > 0 ? myRankInfo.dailyRank : '暂无';
    var totalRank = myRankInfo.totalRank > 0 ? myRankInfo.totalRank : '暂无';

    return '<div class="my-rank-card">'
      + '<div class="my-rank-title">📊 我的排名</div>'
      + '<div class="my-rank-stats">'
      + '<div class="my-rank-stat">'
      + '<div class="stat-label">总榜</div>'
      + '<div class="stat-value">' + (typeof totalRank === 'number' ? '第 ' + totalRank + ' 名' : totalRank) + '</div>'
      + '</div>'
      + '<div class="my-rank-stat">'
      + '<div class="stat-label">日榜</div>'
      + '<div class="stat-value">' + (typeof dailyRank === 'number' ? '第 ' + dailyRank + ' 名' : dailyRank) + '</div>'
      + '</div>'
      + '</div>'
      + '</div>';
  }

  function buildRankListHtml(tab, list, page) {
    var html = '';
    if (list.length === 0) {
      html = '<div class="rank-empty">暂无数据</div>';
    } else {
      var userId = App.getUserId();
      for (var i = 0; i < list.length; i++) {
        var item = list[i];
        var isMe = item.userId === userId;
        html += buildRankItem(item, isMe);
      }
    }
    return html;
  }

  function buildPagination(tab, page, total) {
    var totalPages = Math.ceil(total / limit);
    if (totalPages <= 1) return '';

    var prevDisabled = page <= 1 ? ' disabled' : '';
    var nextDisabled = page >= totalPages ? ' disabled' : '';

    return '<div class="rank-pagination">'
      + '<button class="page-btn' + prevDisabled + '" data-action="prev" data-tab="' + tab + '">‹</button>'
      + '<span class="page-info">' + page + ' / ' + totalPages + '</span>'
      + '<button class="page-btn' + nextDisabled + '" data-action="next" data-tab="' + tab + '">›</button>'
      + '</div>';
  }

  function render() {
    var myCard = buildMyRankCard();
    var listHtml = buildRankListHtml(currentTab, getRankList(currentTab), currentTab === 'total' ? totalPage : dailyPage);

    var totalActive = currentTab === 'total' ? ' active' : '';
    var dailyActive = currentTab === 'daily' ? ' active' : '';

    return '<div class="rank-container">'
      + '<div class="rank-header">'
      + '<div class="back-btn" id="btn-back-rank">←</div>'
      + '<div class="rank-page-title">🏆 排行榜</div>'
      + '</div>'
      + myCard
      + '<div class="rank-tabs">'
      + '<div class="rank-tab' + totalActive + '" data-tab="total">总榜</div>'
      + '<div class="rank-tab' + dailyActive + '" data-tab="daily">日榜</div>'
      + '</div>'
      + '<div class="rank-body">'
      + '<div class="rank-list" id="rank-list">' + listHtml + '</div>'
      + '<div class="rank-pagination-area" id="rank-pagination"></div>'
      + '</div>'
      + '</div>';
  }

  function loadMyRank() {
    loadVersion++;
    var requestVersion = loadVersion;
    App.callApi('GET', '/api/rank/my', null)
      .then(function(data) {
        if (requestVersion !== loadVersion) return;
        if (data && data.data) {
          myRankInfo = data.data;
          var myCardEl = document.querySelector('.my-rank-card');
          if (myCardEl) {
            myCardEl.outerHTML = buildMyRankCard();
          }
        }
      })
      .catch(function(err) {
        console.error('Load my rank failed:', err);
      });
  }

  function loadRankList(tab, page) {
    loadVersion++;
    var requestVersion = loadVersion;
    var api = tab === 'daily' ? '/api/rank/daily' : '/api/rank/total';
    var params = '?page=' + page + '&limit=' + limit;

    App.callApi('GET', api + params, null)
      .then(function(data) {
        if (requestVersion !== loadVersion) return;
        if (!data || !data.data) return;
        data = data.data;
        if (tab === 'daily') {
          dailyList = data.list || [];
          dailyPage = page;
        } else {
          totalList = data.list || [];
          totalPage = page;
        }

        var listEl = document.getElementById('rank-list');
        if (listEl) {
          listEl.innerHTML = buildRankListHtml(tab, getRankList(tab), page);
        }

        var paginationEl = document.getElementById('rank-pagination');
        if (paginationEl) {
          var total = data.total || 0;
          paginationEl.innerHTML = buildPagination(tab, page, total);
          bindPagination();
        }

        App.markRankViewed();
      })
      .catch(function(err) {
        console.error('Load rank list failed:', err);
      });
  }

  function bindPagination() {
    var pageBtns = document.querySelectorAll('.page-btn');
    for (var i = 0; i < pageBtns.length; i++) {
      pageBtns[i].addEventListener('click', function () {
        if (this.classList.contains('disabled')) return;
        var action = this.getAttribute('data-action');
        var tab = this.getAttribute('data-tab');
        var page = tab === 'total' ? totalPage : dailyPage;
        if (action === 'prev') page--;
        else page++;
        loadRankList(tab, page);
      });
    }
  }

  function mount() {
    loadVersion = 0;
    document.getElementById('btn-back-rank').addEventListener('click', function () {
      AudioManager.playClick();
      Router.navigate('home');
    });

    var tabs = document.querySelectorAll('.rank-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener('click', function () {
        AudioManager.playClick();
        var tab = this.getAttribute('data-tab');
        currentTab = tab;
        document.getElementById('app').innerHTML = render();

        if (tab === 'total') loadRankList('total', totalPage);
        else loadRankList('daily', dailyPage);
        
        mount();
      });
    }

    if (currentTab === 'total') loadRankList('total', totalPage);
    else loadRankList('daily', dailyPage);

    loadMyRank();
  }

  return {
    render: render,
    mount: mount
  };
})();
