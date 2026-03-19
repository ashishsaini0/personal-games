import { memo } from 'react';

function ObstacleTile({ obstacle }) {
  if (!obstacle) return null;
  const { kind, hp } = obstacle;

  if (kind === 'vine') {
    return (
      <div className={`obstacle-tile vine-tile${hp <= 1 ? ' vine-cracked' : ''}`}>
        <span className="obstacle-emoji">🌿</span>
        <div className="vine-hp">
          <span className={`vine-pip ${hp >= 1 ? 'pip-vine-full' : 'pip-vine-empty'}`} />
          <span className={`vine-pip ${hp >= 2 ? 'pip-vine-full' : 'pip-vine-empty'}`} />
        </div>
      </div>
    );
  }

  if (kind === 'stone') {
    return (
      <div className="obstacle-tile stone-tile">
        <span className="obstacle-emoji">🪨</span>
      </div>
    );
  }

  if (kind === 'portal') {
    return (
      <div className="obstacle-tile portal-tile" aria-hidden="true">
        <span className="obstacle-emoji">🌀</span>
      </div>
    );
  }

  return null;
}

export default memo(ObstacleTile);
