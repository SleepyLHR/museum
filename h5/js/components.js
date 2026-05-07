var Toast = (function () {
  'use strict';

  var el = document.getElementById('toast');
  var timer = null;

  function show(message, icon) {
    if (timer) {
      clearTimeout(timer);
    }

    var iconHtml = '';
    if (icon === 'success') {
      iconHtml = '<span class="toast-icon">&#10003;</span>';
    } else if (icon === 'error') {
      iconHtml = '<span class="toast-icon">&#10005;</span>';
    }

    el.innerHTML = iconHtml + '<span class="toast-text">' + message + '</span>';
    el.className = 'toast toast-show';

    timer = setTimeout(function () {
      el.className = 'toast';
    }, 2000);
  }

  return {
    show: show
  };
})();

var Modal = (function () {
  'use strict';

  var overlay = document.getElementById('modal');
  var titleEl = overlay.querySelector('.modal-title');
  var bodyEl = overlay.querySelector('.modal-body');
  var footerEl = overlay.querySelector('.modal-footer');

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) {
      hide();
    }
  });

  function show(title, body, buttons) {
    titleEl.textContent = title || '';
    bodyEl.innerHTML = body || '';
    footerEl.innerHTML = '';

    if (buttons && buttons.length) {
      buttons.forEach(function (btn) {
        var btnEl = document.createElement('button');
        btnEl.textContent = btn.text;
        btnEl.className = btn.type === 'primary' ? 'btn-primary' : 'btn-secondary';
        btnEl.addEventListener('click', function () {
          if (btn.onClick) {
            btn.onClick();
          }
          hide();
        });
        footerEl.appendChild(btnEl);
      });
    }

    overlay.style.display = 'flex';
  }

  function hide() {
    overlay.style.display = 'none';
  }

  function confirm(title, body, cb) {
    show(title, body, [
      { text: '取消', type: 'secondary', onClick: function () { if (cb) cb(false); } },
      { text: '确定', type: 'primary', onClick: function () { if (cb) cb(true); } }
    ]);
  }

  return {
    show: show,
    hide: hide,
    confirm: confirm
  };
})();
