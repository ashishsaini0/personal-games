import { useMemo, useState, useCallback } from 'react';
import StartScreen from './components/StartScreen';
import LevelSelect from './components/LevelSelect';
import GameBoard from './components/GameBoard';
import LevelHeader from './components/LevelHeader';
import ComboNotification from './components/ComboNotification';
import FusionNotification from './components/FusionNotification';
import { useGameLogic } from './hooks/useGameLogic';
import { useSound } from './hooks/useSound';
import { useStorage } from './hooks/useStorage';
import { useHaptics } from './hooks/useHaptics';
import { generateLevels } from './utils/generateLevels';
import './styles/game.css';

export default function App() {
  const levels = useMemo(() => generateLevels(), []);
  const [screen, setScreen] = useState('start');
  const [startLevel, setStartLevel] = useState(0);

  const {
    highestLevel, totalScore, levelScores,
    soundEnabled, completeLevel, toggleSound,
  } = useStorage();

  const { playSwap, playMatch, playLevelComplete, playFail, playLightning } = useSound(soundEnabled);
  const { hapticLight, hapticMatch, hapticSuccess, hapticFail, hapticPowerUp } = useHaptics();

  const onLevelComplete = useCallback(() => {
    playLevelComplete();
    hapticSuccess();
  }, [playLevelComplete, hapticSuccess]);

  const onFail = useCallback(() => {
    playFail();
    hapticFail();
  }, [playFail, hapticFail]);

  const soundCallbacks = useMemo(
    () => ({
      onSwap:          () => { playSwap();      hapticLight();   },
      onMatch:         () => { playMatch();     hapticMatch();   },
      onLevelComplete,
      onFail,
      onLightning:     () => { playLightning(); hapticPowerUp(); },
    }),
    [playSwap, playMatch, onLevelComplete, onFail, playLightning,
     hapticLight, hapticMatch, hapticPowerUp]
  );

  const {
    board, obstacles, score, movesLeft, gameState, currentLevel,
    selectedCandy, animatingCells, shakeCell, lightningEffect, paused, targetScore,
    gravityDir, movesUntilShift, gravityShifting, comboNotification, fusionNotification,
    swappingCells,
    handleCandyClick, handleDragSwap, nextLevel, retryLevel,
    goToLevel, togglePause,
  } = useGameLogic(levels, soundCallbacks, startLevel);

  // Handle level completion persistence
  const handleNextLevel = useCallback(() => {
    completeLevel(currentLevel, score);
    nextLevel();
  }, [completeLevel, currentLevel, score, nextLevel]);

  const handleRetry = useCallback(() => {
    retryLevel();
  }, [retryLevel]);

  // Screen navigation
  const handlePlay = useCallback(() => {
    goToLevel(highestLevel < 100 ? highestLevel : 0);
    setStartLevel(highestLevel < 100 ? highestLevel : 0);
    setScreen('game');
  }, [highestLevel, goToLevel]);

  const handleLevelSelect = useCallback(() => {
    setScreen('levels');
  }, []);

  const handleSelectLevel = useCallback((index) => {
    goToLevel(index);
    setStartLevel(index);
    setScreen('game');
  }, [goToLevel]);

  const handleBackToStart = useCallback(() => {
    setScreen('start');
  }, []);

  if (screen === 'start') {
    return (
      <div className="app">
        <StartScreen
          totalScore={totalScore}
          highestLevel={highestLevel}
          onPlay={handlePlay}
          onLevelSelect={handleLevelSelect}
        />
        <button
          className="btn-sound"
          onClick={toggleSound}
          title={soundEnabled ? 'Mute' : 'Unmute'}
        >
          {soundEnabled ? '\u266B' : '\u2716'}
        </button>
      </div>
    );
  }

  if (screen === 'levels') {
    return (
      <div className="app">
        <LevelSelect
          highestLevel={highestLevel}
          levelScores={levelScores}
          levels={levels}
          onSelectLevel={handleSelectLevel}
          onBack={handleBackToStart}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <div className="title-row">
        <button className="btn-icon" onClick={handleBackToStart} title="Menu">
          &#9776;
        </button>
        <h1 className="game-title">GRAVITY ORCHARD</h1>
        <button className="btn-icon" onClick={togglePause} title={paused ? 'Resume' : 'Pause'}>
          {paused ? '\u25B6' : '\u2759\u2759'}
        </button>
        <button
          className="btn-icon"
          onClick={toggleSound}
          title={soundEnabled ? 'Mute' : 'Unmute'}
        >
          {soundEnabled ? '\u266B' : '\u2716'}
        </button>
      </div>

      <LevelHeader
        level={currentLevel + 1}
        score={score}
        targetScore={targetScore}
        movesLeft={movesLeft}
        gravityDir={gravityDir}
        movesUntilShift={movesUntilShift}
        gravityShifting={gravityShifting}
      />

      <div className="board-wrapper">
        <GameBoard
          board={board}
          obstacles={obstacles}
          selectedCandy={selectedCandy}
          animatingCells={animatingCells}
          swappingCells={swappingCells}
          shakeCell={shakeCell}
          lightningEffect={lightningEffect}
          gravityShifting={gravityShifting}
          onCandyClick={handleCandyClick}
          onDragSwap={handleDragSwap}
        />
        <ComboNotification notification={comboNotification} />
        <FusionNotification notification={fusionNotification} />
      </div>

      {paused && gameState === 'playing' && (
        <div className="overlay">
          <div className="overlay-card">
            <div className="overlay-icon">&#9208;</div>
            <div className="overlay-title">Paused</div>
            <div className="overlay-buttons">
              <button className="btn btn-primary" onClick={togglePause}>
                Resume
              </button>
              <button className="btn btn-secondary" onClick={handleBackToStart}>
                Quit
              </button>
            </div>
          </div>
        </div>
      )}

      {gameState === 'won' && (
        <div className="overlay">
          <div className="overlay-card">
            <div className="overlay-icon">&#9733;</div>
            <div className="overlay-title win">Harvest Complete!</div>
            <div className="overlay-score">
              {score} / {targetScore}
            </div>
            <div className="overlay-total">Total Harvest Energy: {totalScore}</div>
            <div className="overlay-buttons">
              {currentLevel < 99 ? (
                <button className="btn btn-primary" onClick={handleNextLevel}>
                  Next Level
                </button>
              ) : (
                <div className="overlay-title win">All 100 orchards harvested!</div>
              )}
              <button className="btn btn-secondary" onClick={handleBackToStart}>
                Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {gameState === 'lost' && (
        <div className="overlay">
          <div className="overlay-card">
            <div className="overlay-icon">&#10060;</div>
            <div className="overlay-title lose">Harvest Failed</div>
            <div className="overlay-score">
              {score} / {targetScore}
            </div>
            <div className="overlay-total">Total Harvest Energy: {totalScore}</div>
            <div className="overlay-buttons">
              <button className="btn btn-primary" onClick={handleRetry}>
                Try Again
              </button>
              <button className="btn btn-secondary" onClick={handleBackToStart}>
                Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
