var RankPage = (function () {
  'use strict';

  var currentTab = 'total';
  var totalPage = 1;
  var dailyPage = 1;
  var limit = 20;
  var totalList = [];
  var dailyList = [];
  var yesterdayList = [];
  var myRankInfo = null;

  function formatTime(seconds) {
    var mins = Math.floor(seconds / 60);
    var secs = seconds % 60;
    return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
  }

  function getRankList(tab) {
    if (tab === 'total') return totalList;
    if (tab === 'daily') return dailyList;
    return yesterdayList;
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
    if (!myRankInfo) return '';

    var bestDaily = myRankInfo.bestDailyRank || '-';
    var bestTotal = myRankInfo.bestTotalRank || '-';
    var dailyRank = myRankInfo.dailyRank || '-';
    var totalRank = myRankInfo.totalRank || '-';

    return '<div class="my-rank-card">'
      + '<div class="my-rank-title">📊 我的排名</div>'
      + '<div class="my-rank-stats">'
      + '<div class="my-rank-stat">'
      + '<div class="stat-label">总榜</div>'
      + '<div class="stat-value">第 ' + totalRank + ' 名</div>'
      + '</div>'
      + '<div class="my-rank-stat">'
      + '<div class="stat-label">日榜</div>'
      + '<div class="stat-value">第 ' + dailyRank + ' 名</div>'
      + '</div>'
      + '</div>'
      + '<div class="my-rank-best">'
      + '<span>🏅 总榜最佳: 第 ' + bestTotal + ' 名</span>'
      + '<span>📅 日榜最佳: 第 ' + bestDaily + ' 名</span>'
      + '</div>'
      + '</div>';
  }

  function buildYesterdayHeader() {
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    var dateStr = formatDate(yesterday.toISOString());
    return '<div class="yesterday-header">'
      + '<div class="yesterday-title">昨日榜单（' + dateStr + '）</div>'
      + '<div class="yesterday-desc">最终排名结果已锁定</div>'
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
    var yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    var yesterdayStr = formatDate(yesterdayDate.toISOString());

    var myCard = buildMyRankCard();
    var yesterdayHeader = currentTab === 'yesterday' ? buildYesterdayHeader() : '';
    var listHtml = buildRankListHtml(currentTab, getRankList(currentTab), currentTab === 'total' ? totalPage : dailyPage);

    var totalActive = currentTab === 'total' ? ' active' : '';
    var yesterdayActive = currentTab === 'yesterday' ? ' active' : '';
    var dailyActive = currentTab === 'daily' ? ' active' : '';

    return '<div class="rank-container">'
      + '<div class="rank-header">'
      + '<div class="back-btn" id="btn-back-rank">←</div>'
      + '<div class="rank-page-title">🏆 排行榜</div>'
      + '</div>'
      + myCard
      + '<div class="rank-tabs">'
      + '<div class="rank-tab' + totalActive + '" data-tab="total">总榜</div>'
      + '<div class="rank-tab' + yesterdayActive + '" data-tab="yesterday">昨日</div>'
      + '<div class="rank-tab' + dailyActive + '" data-tab="daily">日榜</div>'
      + '</div>'
      + '<div class="rank-body">'
      + yesterdayHeader
      + '<div class="rank-list" id="rank-list">' + listHtml + '</div>'
      + '<div class="rank-pagination-area" id="rank-pagination"></div>'
      + '</div>'
      + '</div>';
  }

  function loadMyRank() {
    App.callApi('/api/rank/my', 'GET', null, function (data) {
      myRankInfo = data;
      var myCardEl = document.querySelector('.my-rank-card');
      if (myCardEl) {
        myCardEl.outerHTML = buildMyRankCard();
      }
    });
  }

  function loadRankList(tab, page) {
    var api = tab === 'daily' ? '/api/rank/daily' : '/api/rank/total';
    var params = '?page=' + page + '&limit=' + limit;

    App.callApi(api + params, 'GET', null, function (data) {
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
    });
  }

  function loadYesterdayRank() {
    App.callApi('/api/rank/yesterday', 'GET', null, function (data) {
      yesterdayList = data.list || [];
      var listEl = document.getElementById('rank-list');
      if (listEl) {
        listEl.innerHTML = buildRankListHtml('yesterday', yesterdayList, 1);
      }
      var paginationEl = document.getElementById('rank-pagination');
      if (paginationEl) {
        paginationEl.innerHTML = '';
      }
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
        PageManager.render();

        if (tab === 'total') loadRankList('total', totalPage);
        else if (tab === 'daily') loadRankList('daily', dailyPage);
        else loadYesterdayRank();
      });
    }

    if (currentTab === 'total') loadRankList('total', totalPage);
    else if (currentTab === 'daily') loadRankList('daily', dailyPage);
    else loadYesterdayRank();

    loadMyRank();
  }

  return {
    render: render,
    mount: mount
  };
})();
