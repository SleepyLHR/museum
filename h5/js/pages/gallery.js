var GalleryPage = (function () {
  'use strict';

  function render() {
    var relics = App.state.relics;
    var cardsHtml = '';

    for (var i = 0; i < relics.length; i++) {
      var item = relics[i];
      var unlocked = App.isLevelCompleted(item.level);
      var cls = 'relic-card';
      if (!unlocked) cls += ' locked';

      cardsHtml += '<div class="' + cls + '" data-relic-index="' + i + '">'
        + '<div class="card-image"><img src="' + item.image + '" alt="' + item.name + '"></div>'
        + '<div class="card-info">'
        + '<div class="card-name">' + item.name + '</div>'
        + '<div class="card-era">' + item.era + '</div>'
        + '<div class="card-spec">规格：' + (item.spec || '') + '</div>'
        + '</div>'
        + '</div>';
    }

    return '<div class="gallery-container">'
      + '<div class="gallery-header">'
      + '<div class="back-btn" id="btn-back">←</div>'
      + '<div class="gallery-title">文物图库</div>'
      + '</div>'
      + '<div class="gallery-grid">' + cardsHtml + '</div>'
      + '</div>';
  }

  function mount() {
    document.getElementById('btn-back').addEventListener('click', function () {
      AudioManager.playClick();
      Router.goBack();
    });

    var cards = document.querySelectorAll('.relic-card');
    for (var i = 0; i < cards.length; i++) {
      cards[i].addEventListener('click', function () {
        var idx = parseInt(this.getAttribute('data-relic-index'));
        var relic = App.state.relics[idx];
        if (!App.isLevelCompleted(relic.level)) {
          Toast.show('完成关卡后解锁');
          AudioManager.playError();
          return;
        }
        AudioManager.playClick();
        showRelicModal(relic);
      });
    }
  }

  function showRelicModal(relic) {
    var overlay = document.createElement('div');
    overlay.className = 'relic-modal-overlay';
    overlay.id = 'relic-modal-overlay';

    overlay.innerHTML = '<div class="relic-modal-content">'
      + '<div class="relic-modal-header"><button class="relic-modal-close">✕</button></div>'
      + '<div class="relic-modal-image"><img src="' + relic.image + '" alt="' + relic.name + '"></div>'
      + '<div class="relic-modal-details">'
      + '<div class="modal-name">' + relic.name + '</div>'
      + '<div class="modal-era">' + relic.era + '</div>'
      + '<div class="modal-location">' + relic.location + '</div>'
      + '<div class="modal-spec">规格：' + (relic.spec || '') + '</div>'
      + (relic.value ? '<div class="modal-value">' + relic.value + '</div>' : '')
      + '<div class="modal-description">' + relic.description + '</div>'
      + '</div>'
      + '</div>';

    document.body.appendChild(overlay);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        overlay.remove();
      }
    });

    overlay.querySelector('.relic-modal-close').addEventListener('click', function () {
      overlay.remove();
    });
  }

  function unmount() {
    var existing = document.getElementById('relic-modal-overlay');
    if (existing) existing.remove();
  }

  return {
    render: render,
    mount: mount,
    unmount: unmount
  };
})();
