import { memo } from 'react';
import { GRAVITY_ARROWS } from '../hooks/useGameLogic';

const GRAVITY_LABELS = { DOWN: 'DOWN', UP: 'UP', LEFT: 'LEFT', RIGHT: 'RIGHT' };

function LevelHeader({ level, score, targetScore, movesLeft, gravityDir, movesUntilShift, gravityShifting }) {
  const progress = Math.min((score / targetScore) * 100, 100);
  const movesLow = movesLeft <= 5;
  const shifting = movesUntilShift === 0 || gravityShifting;

  return (
    <div className="level-header">
      <div className="header-row">
        <div className="header-item">
          <span className="header-label">Orchard</span>
          <span className="header-value">{level}</span>
        </div>
        <div className="header-item score-section">
          <span className="header-label">Harvest Energy</span>
          <span className="header-value">
            {score} / {targetScore}
          </span>
        </div>
        <div className="header-item">
          <span className="header-label">Moves</span>
          <span className={`header-value ${movesLow ? 'moves-low' : ''}`}>
            {movesLeft}
          </span>
        </div>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className={`gravity-row${gravityShifting ? ' gravity-shifting' : ''}`}>
        <div className="gravity-indicator">
          <span className={`gravity-arrow${gravityShifting ? ' gravity-arrow-spin' : ''}`}>
            {GRAVITY_ARROWS[gravityDir]}
          </span>
          <span className="gravity-label">
            {gravityShifting ? 'GRAVITY SHIFT!' : `GRAVITY: ${GRAVITY_LABELS[gravityDir]}`}
          </span>
        </div>
        <div className="gravity-shift-pips">
          {[1, 2].map((i) => (
            <span
              key={i}
              className={`gravity-pip${i <= movesUntilShift && !shifting ? ' pip-active' : ' pip-inactive'}${shifting && i === 1 ? ' pip-pulse' : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default memo(LevelHeader);
