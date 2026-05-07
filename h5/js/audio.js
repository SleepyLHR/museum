var AudioManager = (function () {
  'use strict';

  var audioContext = null;
  var bgmAudio = null;
  var isMuted = false;
  var bgmVolume = 0.3;
  var sfxVolume = 0.5;
  var bgmEnabled = false;

  function init() {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
    
    bgmAudio = new Audio('music/民谣综艺-童趣萌宠-彩虹糖_爱给网_aigei_com.mp3');
    bgmAudio.loop = true;
    bgmAudio.volume = bgmVolume;
  }

  function createOscillator(frequency, duration, type, volume) {
    if (!audioContext || isMuted) return;
    
    var oscillator = audioContext.createOscillator();
    var gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = type || 'sine';
    
    gainNode.gain.setValueAtTime(volume * sfxVolume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  }

  function playClick() {
    if (isMuted || !audioContext) return;
    createOscillator(800, 0.05, 'sine', 0.3);
  }

  function playSuccess() {
    if (isMuted || !audioContext) return;
    createOscillator(523.25, 0.1, 'sine', 0.3);
    setTimeout(function() {
      createOscillator(659.25, 0.1, 'sine', 0.3);
    }, 100);
    setTimeout(function() {
      createOscillator(783.99, 0.2, 'sine', 0.4);
    }, 200);
  }

  function playMove() {
    if (isMuted || !audioContext) return;
    createOscillator(440, 0.03, 'sine', 0.2);
  }

  function playComplete() {
    if (isMuted || !audioContext) return;
    var notes = [523.25, 587.33, 659.25, 698.46, 783.99, 880];
    notes.forEach(function(note, index) {
      setTimeout(function() {
        createOscillator(note, 0.15, 'sine', 0.25);
      }, index * 100);
    });
  }

  function playUnlock() {
    if (isMuted || !audioContext) return;
    createOscillator(659.25, 0.1, 'sine', 0.3);
    setTimeout(function() {
      createOscillator(880, 0.15, 'sine', 0.35);
    }, 100);
    setTimeout(function() {
      createOscillator(1046.50, 0.2, 'sine', 0.4);
    }, 200);
  }

  function playError() {
    if (isMuted || !audioContext) return;
    createOscillator(200, 0.15, 'sawtooth', 0.2);
    setTimeout(function() {
      createOscillator(150, 0.2, 'sawtooth', 0.2);
    }, 100);
  }

  function startBgm() {
    if (!bgmAudio) return;
    bgmEnabled = true;
    
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    bgmAudio.play().catch(function(e) {
      console.log('BGM autoplay blocked:', e);
    });
  }

  function stopBgm() {
    bgmEnabled = false;
    if (bgmAudio) {
      bgmAudio.pause();
      bgmAudio.currentTime = 0;
    }
  }

  function toggleBgm() {
    if (bgmEnabled) {
      stopBgm();
    } else {
      startBgm();
    }
    return bgmEnabled;
  }

  function setBgmEnabled(enabled) {
    if (enabled) {
      startBgm();
    } else {
      stopBgm();
    }
  }

  function setSfxEnabled(enabled) {
    isMuted = !enabled;
  }

  function setVolume(volume) {
    bgmVolume = Math.max(0, Math.min(1, volume));
    sfxVolume = bgmVolume;
    if (bgmAudio) {
      bgmAudio.volume = bgmVolume;
    }
  }

  init();

  return {
    playClick: playClick,
    playSuccess: playSuccess,
    playMove: playMove,
    playComplete: playComplete,
    playUnlock: playUnlock,
    playError: playError,
    setVolume: setVolume,
    isMuted: function() { return isMuted; },
    startBgm: startBgm,
    stopBgm: stopBgm,
    toggleBgm: toggleBgm,
    setBgmEnabled: setBgmEnabled,
    setSfxEnabled: setSfxEnabled,
    isBgmEnabled: function() { return bgmEnabled; }
  };
})();
