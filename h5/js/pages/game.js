var GamePage = (function () {
  'use strict';

  var currentLevel = 'level1';
  var currentLevelNum = 1;
  var totalLevels = 5;
  var relic = {};
  var puzzlePieces = [];
  var selectedPiece = null;
  var gridCols = 3;
  var gridRows = 2;
  var completed = false;

  function render(params) {
    if (params && params.level) {
      currentLevel = params.level;
      currentLevelNum = parseInt(currentLevel.replace('level', ''));
    }

    var found = null;
    for (var i = 0; i < App.state.relics.length; i++) {
      if (App.state.relics[i].level === currentLevel) {
        found = App.state.relics[i];
        break;
      }
    }
    relic = found || App.state.relics[0];

    calcGrid(relic.pieces);

    initPuzzle();
    completed = false;
    selectedPiece = null;

    return buildHtml();
  }

  function calcGrid(pieces) {
    if (pieces === 6) { gridCols = 3; gridRows = 2; }
    else if (pieces === 8) { gridCols = 4; gridRows = 2; }
    else if (pieces === 10) { gridCols = 5; gridRows = 2; }
    else if (pieces === 12) { gridCols = 4; gridRows = 3; }
    else if (pieces === 15) { gridCols = 5; gridRows = 3; }
    else { gridCols = 3; gridRows = 2; }
  }

  function initPuzzle() {
    var pieceCount = relic.pieces || 6;
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
    return 'background-image: url(\'' + imgUrl + '\');'
      + ' background-size: ' + (gridCols * 100) + '% ' + (gridRows * 100) + '%;'
      + ' background-position: '
      + (gridCols > 1 ? (piece.col * 100 / (gridCols - 1)) + '%' : '0%') + ' '
      + (gridRows > 1 ? (piece.row * 100 / (gridRows - 1)) + '%' : '0%') + ';';
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

      console.log('Checking completion...');
      var isComplete = checkCompletion();
      console.log('Completion check result:', isComplete);
      if (isComplete) {
        console.log('Calling onCompletion...');
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
      cell.style.backgroundSize = (gridCols * 100) + '% ' + (gridRows * 100) + '%';
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
    console.log('Checking puzzle pieces:');
    for (var i = 0; i < puzzlePieces.length; i++) {
      var piece = puzzlePieces[i];
      console.log('  Piece ' + i + ': row=' + piece.row + ', currentRow=' + piece.currentRow
        + ', col=' + piece.col + ', currentCol=' + piece.currentCol);
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
    App.completeLevel(currentLevel);

    setTimeout(function () {
      if (currentLevelNum >= totalLevels) {
        showCertificateModal();
      } else {
        showCompletionModal();
      }
    }, 500);
  }

  function showCompletionModal() {
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

    overlay.innerHTML = '<div class="completion-content">'
      + '<div class="celebration">🎉 恭喜完成！</div>'
      + '<div class="completion-image"><img src="' + relic.image + '" alt="' + relic.name + '" onerror="this.style.display=\'none\'"></div>'
      + '<div class="relic-details">'
      + '<div class="relic-name">' + relic.name + '</div>'
      + '<div class="relic-era">' + relic.era + '</div>'
      + '<div class="relic-location">' + relic.location + '</div>'
      + '<div class="relic-spec">规格：' + (relic.spec || '') + '</div>'
      + '<div class="relic-value">' + relic.value + '</div>'
      + '<div class="relic-description">' + relic.description + '</div>'
      + '</div>'
      + '<div class="completion-buttons">'
      + '<button class="btn-primary" id="btn-continue">继续挑战</button>'
      + '<button class="btn-secondary" id="btn-home">返回首页</button>'
      + '</div>'
      + '</div>';

    document.body.appendChild(overlay);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        overlay.remove();
      }
    });

    document.getElementById('btn-continue').addEventListener('click', function () {
      overlay.remove();
      var nextLevelNum = currentLevelNum + 1;
      if (nextLevelNum <= totalLevels) {
        Router.replace('game', { level: 'level' + nextLevelNum });
      } else {
        showCertificateModal();
      }
    });

    document.getElementById('btn-home').addEventListener('click', function () {
      overlay.remove();
      Router.navigate('home');
    });
  }

  function showCertificateModal() {
    var now = new Date();
    var dateStr = now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日';
    var certNum = now.getFullYear() + String(Math.floor(Math.random() * 1000000)).padStart(6, '0');

    var overlay = document.createElement('div');
    overlay.className = 'completion-overlay';
    overlay.id = 'cert-overlay';

    overlay.innerHTML = '<div class="certificate-content">'
      + '<div class="certificate-title">文物拼图大挑战</div>'
      + '<div class="certificate-subtitle">电子荣誉证书</div>'
      + '<div class="certificate-name">玩家</div>'
      + '<div class="certificate-text">成功完成全部文物拼图挑战</div>'
      + '<div class="certificate-number">证书编号：BM' + certNum + '</div>'
      + '<div class="certificate-date">' + dateStr + '</div>'
      + '<div class="certificate-buttons">'
      + '<button class="btn-primary" id="btn-save-cert">保存证书</button>'
      + '<button class="btn-secondary" id="btn-close-cert">关闭</button>'
      + '</div>'
      + '</div>';

    document.body.appendChild(overlay);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        overlay.remove();
      }
    });

    document.getElementById('btn-save-cert').addEventListener('click', function () {
      Toast.show('证书已保存', 'success');
      setTimeout(function () {
        overlay.remove();
        Router.navigate('home');
      }, 1500);
    });

    document.getElementById('btn-close-cert').addEventListener('click', function () {
      overlay.remove();
      Router.navigate('home');
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
  }

  return {
    render: render,
    mount: mount,
    unmount: unmount
  };
})();
