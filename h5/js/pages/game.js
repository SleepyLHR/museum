var GamePage = (function () {
  'use strict';

  var currentLevel = 'level1';
  var currentLevelNum = 1;
  var relic = {};
  var puzzlePieces = [];
  var selectedPiece = null;
  var gridCols = 3;
  var gridRows = 3;
  var completed = false;
  var levelStartTime = 0;

  function render(params) {
    if (params && params.level) {
      currentLevel = params.level;
      currentLevelNum = parseInt(currentLevel.replace('level', ''));
    }

    levelStartTime = Date.now();
    completed = false;

    relic = App.getRelicByLevel(currentLevel);

    gridCols = relic.gridCols || 3;
    gridRows = relic.gridRows || 3;

    initPuzzle();
    completed = false;
    selectedPiece = null;

    return buildHtml();
  }

  function initPuzzle() {
    var pieceCount = relic.pieces || 9;
    puzzlePieces = [];
    var idx = 0;
    for (var row = 0; row < gridRows; row++) {
      for (var col = 0; col < gridCols; col++) {
        if (idx >= pieceCount) break;
        puzzlePieces.push({
          id: 'piece-' + idx,
          originalIndex: idx,
          row: row,
          col: col,
          currentRow: row,
          currentCol: col
        });
        idx++;
      }
    }
    shufflePieces(puzzlePieces);
  }

  function shufflePieces(pieces) {
    var positions = pieces.map(function (p) { return { row: p.row, col: p.col }; });
    for (var i = positions.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = positions[i];
      positions[i] = positions[j];
      positions[j] = tmp;
    }
    for (var k = 0; k < pieces.length; k++) {
      pieces[k].currentRow = positions[k].row;
      pieces[k].currentCol = positions[k].col;
    }
  }

  function getGridPieces() {
    var grid = [];
    for (var r = 0; r < gridRows; r++) {
      for (var c = 0; c < gridCols; c++) {
        for (var i = 0; i < puzzlePieces.length; i++) {
          if (puzzlePieces[i].currentRow === r && puzzlePieces[i].currentCol === c) {
            grid.push(puzzlePieces[i]);
            break;
          }
        }
      }
    }
    return grid;
  }

  function buildPieceStyle(piece) {
    var imgUrl = relic.image || '';
    var bgSizeX = Math.max(gridCols, 2) * 100;
    var bgSizeY = Math.max(gridRows, 2) * 100;
    var bgX = gridCols > 1 ? (piece.col * 100 / (gridCols - 1)) + '%' : '0%';
    var bgY = gridRows > 1 ? (piece.row * 100 / (gridRows - 1)) + '%' : '0%';
    return 'background-image: url(\'' + imgUrl + '\');'
      + ' background-size: ' + bgSizeX + '% ' + bgSizeY + '%;'
      + ' background-position: ' + bgX + ' ' + bgY + ';';
  }

  function buildHtml() {
    var grid = getGridPieces();
    var cellsHtml = '';
    for (var i = 0; i < grid.length; i++) {
      var piece = grid[i];
      var cls = 'puzzle-cell';
      if (selectedPiece === piece.id) cls += ' selected';
      cellsHtml += '<div class="' + cls + '" data-piece-id="' + piece.id + '" style="' + buildPieceStyle(piece) + '">'
        + '</div>';
    }

    var totalLevels = App.getTotalLevels();

    return '<div class="game-container">'
      + '<div class="game-header">'
      + '<button class="btn-back" id="btn-back-game">← 返回</button>'
      + '<div class="level-info">关卡' + currentLevelNum + '</div>'
      + '<div class="progress-info">第' + currentLevelNum + '关 / 共' + totalLevels + '关</div>'
      + '</div>'
      + '<div class="puzzle-area">'
      + '<div class="puzzle-grid" style="grid-template-columns: repeat(' + gridCols + ', 1fr); grid-template-rows: repeat(' + gridRows + ', 1fr);">'
      + cellsHtml
      + '</div>'
      + '</div>'
      + '</div>';
  }

  function initGameEventListeners() {
    var backBtn = document.getElementById('btn-back-game');
    if (backBtn) {
      backBtn.addEventListener('click', function() {
        Router.navigate('home');
      });
    }
  }

  function selectPieceHandler(e) {
    if (completed) return;

    var cell = e.currentTarget;
    var pieceId = cell.getAttribute('data-piece-id');

    if (!selectedPiece) {
      selectedPiece = pieceId;
      updateSelection();
      AudioManager.playClick();
    } else if (selectedPiece === pieceId) {
      selectedPiece = null;
      updateSelection();
      AudioManager.playClick();
    } else {
      swapPieces(selectedPiece, pieceId);
      selectedPiece = null;
      rebuildPuzzleGrid();
      AudioManager.playMove();

      var isComplete = checkCompletion();
      if (isComplete) {
        AudioManager.playComplete();
        onCompletion();
      }
    }
  }

  function rebuildPuzzleGrid() {
    var grid = getGridPieces();
    var puzzleArea = document.querySelector('.puzzle-grid');
    puzzleArea.innerHTML = '';

    for (var i = 0; i < grid.length; i++) {
      var piece = grid[i];
      var cell = document.createElement('div');
      cell.className = 'puzzle-cell';
      cell.setAttribute('data-piece-id', piece.id);
      cell.style.backgroundImage = 'url(\'' + (relic.image || '') + '\')';
      cell.style.backgroundSize = (Math.max(gridCols, 2) * 100) + '% ' + (Math.max(gridRows, 2) * 100) + '%';
      cell.style.backgroundPosition = (gridCols > 1 ? (piece.col * 100 / (gridCols - 1)) + '%' : '0%') + ' '
        + (gridRows > 1 ? (piece.row * 100 / (gridRows - 1)) + '%' : '0%');
      cell.addEventListener('click', selectPieceHandler);
      puzzleArea.appendChild(cell);
    }
  }

  function swapPieces(id1, id2) {
    var idx1 = -1, idx2 = -1;
    for (var i = 0; i < puzzlePieces.length; i++) {
      if (puzzlePieces[i].id === id1) idx1 = i;
      if (puzzlePieces[i].id === id2) idx2 = i;
    }
    if (idx1 === -1 || idx2 === -1) return;

    var tmpRow = puzzlePieces[idx1].currentRow;
    var tmpCol = puzzlePieces[idx1].currentCol;
    puzzlePieces[idx1].currentRow = puzzlePieces[idx2].currentRow;
    puzzlePieces[idx1].currentCol = puzzlePieces[idx2].currentCol;
    puzzlePieces[idx2].currentRow = tmpRow;
    puzzlePieces[idx2].currentCol = tmpCol;
  }

  function checkCompletion() {
    for (var i = 0; i < puzzlePieces.length; i++) {
      var piece = puzzlePieces[i];
      if (piece.row !== piece.currentRow || piece.col !== piece.currentCol) {
        return false;
      }
    }
    return true;
  }

  function updateSelection() {
    var cells = document.querySelectorAll('.puzzle-cell');
    for (var i = 0; i < cells.length; i++) {
      var id = cells[i].getAttribute('data-piece-id');
      if (id === selectedPiece) {
        cells[i].classList.add('selected');
      } else {
        cells[i].classList.remove('selected');
      }
    }
  }

  function onCompletion() {
    completed = true;

    var elapsed = Math.round((Date.now() - levelStartTime) / 1000);
    App.setLevelTime(currentLevel, elapsed);
    App.completeLevel(currentLevel);

    var totalLevels = App.getTotalLevels();

    setTimeout(function () {
      if (currentLevelNum >= totalLevels) {
        if (!App.hasFirstCompletion()) {
          App.setFirstCompletion(App.getTotalTime(), App.getNickname());
          showFirstCompletionModal();
        } else {
          showCompletionModal(true);
        }
      } else {
        showCompletionModal(false);
      }
    }, 500);
  }

  function showCompletionModal(showCertBtn) {
    var settings = App.getSettings();
    var totalLevels = App.getTotalLevels();

    var overlay = document.createElement('div');
    overlay.className = 'completion-overlay';
    overlay.id = 'completion-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.background = 'rgba(0,0,0,0.75)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '9999';

    var buttonsHtml = '';
    if (currentLevelNum >= totalLevels) {
      if (showCertBtn) {
        buttonsHtml = '<button class="btn-primary" id="btn-view-cert">🏆 查看证书</button>'
          + '<button class="btn-secondary" id="btn-home">返回首页</button>';
      } else {
        buttonsHtml = '<button class="btn-secondary" id="btn-home">返回首页</button>';
      }
    } else {
      buttonsHtml = '<button class="btn-primary" id="btn-continue">继续挑战</button>'
        + '<button class="btn-secondary" id="btn-home">返回首页</button>';
    }

    overlay.innerHTML = '<div class="completion-content">'
      + '<div class="celebration">🎉 恭喜完成！</div>'
      + '<div class="completion-image"><img src="' + relic.image + '" alt="' + relic.name + '" onerror="this.style.display=\'none\'"></div>'
      + '<div class="relic-details">'
      + '<div class="relic-name">' + relic.name + '</div>'
      + '<div class="relic-era">' + relic.era + '</div>'
      + '<div class="relic-location">' + settings.location + '</div>'
      + '<div class="relic-spec">规格：' + (relic.spec || '') + '</div>'
      + '<div class="relic-description">' + relic.description + '</div>'
      + '</div>'
      + '<div class="completion-buttons">'
      + buttonsHtml
      + '</div>'
      + '</div>';

    document.body.appendChild(overlay);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        overlay.remove();
      }
    });

    if (currentLevelNum >= totalLevels) {
      if (showCertBtn) {
        document.getElementById('btn-view-cert').addEventListener('click', function () {
          overlay.remove();
          Router.navigate('certificate');
        });
      }
      document.getElementById('btn-home').addEventListener('click', function () {
        overlay.remove();
        Router.navigate('home');
      });
    } else {
      document.getElementById('btn-continue').addEventListener('click', function () {
        overlay.remove();
        var nextLevelNum = currentLevelNum + 1;
        var prefix = settings.levelPrefix || 'level';
        if (nextLevelNum <= totalLevels) {
          Router.replace('game', { level: prefix + nextLevelNum });
        }
      });

      document.getElementById('btn-home').addEventListener('click', function () {
        overlay.remove();
        Router.navigate('home');
      });
    }
  }

  function showFirstCompletionModal() {
    var now = new Date();
    var dateStr = now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日';
    var certNum = App.getMedalNumber();
    var nickname = App.getNickname();
    var totalSeconds = App.getTotalTime();
    var totalTimeStr = App.formatTime(totalSeconds);

    var overlay = document.createElement('div');
    overlay.className = 'completion-overlay';
    overlay.id = 'cert-overlay';

    overlay.innerHTML = '<div class="certificate-content first-completion">'
      + '<div class="celebration">🎉 恭喜首次通关！</div>'
      + '<div class="certificate-title">文物拼多多</div>'
      + '<div class="certificate-subtitle">电子荣誉证书 · 首次通关纪念</div>'
      + '<div class="certificate-name">' + nickname + '</div>'
      + '<div class="certificate-text">成功完成全部文物拼图挑战</div>'
      + '<div class="certificate-total-time">通关总耗时：' + totalTimeStr + '</div>'
      + '<div class="certificate-number">证书编号：' + certNum + '</div>'
      + '<div class="certificate-date">' + dateStr + '</div>'
      + '<div class="certificate-buttons">'
      + '<button class="btn-primary" id="btn-view-cert">🏆 查看证书</button>'
      + '<button class="btn-primary" id="btn-save-cert">📥 保存证书</button>'
      + '</div>'
      + '</div>';

    document.body.appendChild(overlay);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        overlay.remove();
        Router.navigate('home');
      }
    });

    document.getElementById('btn-view-cert').addEventListener('click', function () {
      overlay.remove();
      Router.navigate('certificate');
    });

    document.getElementById('btn-save-cert').addEventListener('click', function () {
      saveCertificateAsImage(nickname, totalTimeStr, certNum, dateStr, '电子荣誉证书 · 首次通关纪念');
    });
  }

  function saveCertificateAsImage(nickname, totalTimeStr, certNum, dateStr, subtitle) {
    subtitle = subtitle || '电子荣誉证书';
    var settings = App.getSettings();
    var canvas = document.createElement('canvas');
    var w = 750;
    var h = 1050;
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext('2d');

    var gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.5, '#f8f9fa');
    gradient.addColorStop(1, '#f0f3e8');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#2ecc71';
    ctx.lineWidth = 6;
    ctx.strokeRect(30, 30, w - 60, h - 60);

    ctx.strokeStyle = '#c8e6c9';
    ctx.lineWidth = 2;
    ctx.strokeRect(45, 45, w - 90, h - 90);

    ctx.fillStyle = '#333';
    ctx.font = 'bold 52px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('文物拼多多', w / 2, 160);

    ctx.fillStyle = '#2ecc71';
    ctx.font = 'bold 36px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(subtitle, w / 2, 220);

    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(100, 260);
    ctx.lineTo(w - 100, 260);
    ctx.stroke();

    ctx.fillStyle = '#2ecc71';
    ctx.font = 'bold 60px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(nickname, w / 2, 360);

    ctx.fillStyle = '#555';
    ctx.font = '32px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('成功完成全部文物拼图挑战', w / 2, 430);

    ctx.fillStyle = '#e67e22';
    ctx.font = 'bold 32px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('通关总耗时：' + totalTimeStr, w / 2, 510);

    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(100, 560);
    ctx.lineTo(w - 100, 560);
    ctx.stroke();

    ctx.fillStyle = '#888';
    ctx.font = '22px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('证书编号：' + certNum, w / 2, 620);

    ctx.fillStyle = '#aaa';
    ctx.font = '22px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(dateStr, w / 2, 670);

    ctx.fillStyle = '#999';
    ctx.font = '20px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(settings.location + ' · 公益科普 文化传承', w / 2, 740);

    var imgDataUrl = canvas.toDataURL('image/png');

    var certOverlay = document.createElement('div');
    certOverlay.className = 'certificate-image-overlay';
    certOverlay.id = 'cert-image-overlay';

    certOverlay.innerHTML = '<div class="cert-image-container">'
      + '<img src="' + imgDataUrl + '" class="cert-image" alt="荣誉证书">'
      + '<div class="save-hint">长按图片保存到相册</div>'
      + '<button class="btn-close-cert-image" id="btn-close-cert-image">关闭</button>'
      + '</div>';

    document.body.appendChild(certOverlay);

    document.getElementById('btn-close-cert-image').addEventListener('click', function () {
      document.body.removeChild(certOverlay);
      Router.navigate('home');
    });

    certOverlay.addEventListener('click', function (e) {
      if (e.target === certOverlay) {
        document.body.removeChild(certOverlay);
        Router.navigate('home');
      }
    });
  }

  function mount() {
    var cells = document.querySelectorAll('.puzzle-cell');
    for (var i = 0; i < cells.length; i++) {
      cells[i].addEventListener('click', selectPieceHandler);
    }
    initGameEventListeners();
  }

  function unmount() {
    var existing = document.getElementById('completion-overlay');
    if (existing) existing.remove();
    existing = document.getElementById('cert-overlay');
    if (existing) existing.remove();
    existing = document.getElementById('cert-image-overlay');
    if (existing) existing.remove();
  }

  return {
    render: render,
    mount: mount,
    unmount: unmount,
    saveCertificateAsImage: saveCertificateAsImage
  };
})();
