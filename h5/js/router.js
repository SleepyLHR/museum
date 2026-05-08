var Router = (function () {
  'use strict';

  var appEl = document.getElementById('app');
  var currentPage = null;

  function parseHash() {
    var hash = window.location.hash.replace('#/', '') || 'home';
    var parts = hash.split('?');
    var page = parts[0];
    var params = {};

    if (parts[1]) {
      var pairs = parts[1].split('&');
      for (var i = 0; i < pairs.length; i++) {
        var kv = pairs[i].split('=');
        params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
      }
    }

    return { page: page, params: params };
  }

  function navigate(page, params) {
    var hash = page;
    if (params) {
      var parts = [];
      for (var k in params) {
        if (params.hasOwnProperty(k)) {
          parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
        }
      }
      if (parts.length) {
        hash += '?' + parts.join('&');
      }
    }
    window.location.hash = '#/' + hash;
  }

  function replace(page, params) {
    var hash = page;
    if (params) {
      var parts = [];
      for (var k in params) {
        if (params.hasOwnProperty(k)) {
          parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
        }
      }
      if (parts.length) {
        hash += '?' + parts.join('&');
      }
    }
    window.location.replace('#' + '/'.concat(hash));
  }

  function goBack() {
    window.history.back();
  }

  function handleRoute() {
    var parsed = parseHash();
    var page = parsed.page;
    var params = parsed.params;

    var handler = null;
    switch (page) {
      case 'home': handler = HomePage; break;
      case 'game': handler = GamePage; break;
      case 'gallery': handler = GalleryPage; break;
      case 'settings': handler = SettingsPage; break;
      case 'certificate': handler = CertificatePage; break;
      default:
        handler = HomePage;
        page = 'home';
        params = {};
    }

    if (currentPage && currentPage.unmount) {
      currentPage.unmount();
    }

    currentPage = handler;

    appEl.innerHTML = '';
    if (handler && handler.render) {
      var html = handler.render(params);
      if (html) {
        appEl.innerHTML = html;
      }
    }

    if (handler && handler.mount) {
      handler.mount(params);
    }
  }

  function init() {
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
  }

  return {
    init: init,
    navigate: navigate,
    replace: replace,
    goBack: goBack
  };
})();
