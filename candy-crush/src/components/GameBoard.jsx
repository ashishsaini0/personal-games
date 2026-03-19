import { memo } from 'react';
import Candy from './Candy';
import ObstacleTile from './ObstacleTile';

function GameBoard({
  board,
  obstacles,
  selectedCandy,
  animatingCells,
  swappingCells,
  shakeCell,
  lightningEffect,
  gravityShifting,
  onCandyClick,
  onDragSwap,
}) {
  if (!board || board.length === 0) return null;

  const activationCells = new Map(); // idx → type string
  if (lightningEffect) {
    for (const le of lightningEffect) {
      if (le.special === 'lightning') {
        for (let c = 0; c < 8; c++) activationCells.set(le.row * 8 + c, 'lightning');
      } else if (le.special === 'bomb') {
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++) {
            const nr = le.row + dr, nc = le.col + dc;
            if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8)
              activationCells.set(nr * 8 + nc, 'bomb');
          }
      } else if (le.special === 'tornado') {
        for (let r = 0; r < 8; r++)
          for (let c = 0; c < 8; c++)
            activationCells.set(r * 8 + c, 'tornado');
      } else if (le.special === 'gravity-orb') {
        for (let c = 0; c < 8; c++) {
          activationCells.set(c, 'gravity-orb');
          activationCells.set(7 * 8 + c, 'gravity-orb');
        }
        for (let r = 1; r < 7; r++) {
          activationCells.set(r * 8, 'gravity-orb');
          activationCells.set(r * 8 + 7, 'gravity-orb');
        }
      }
    }
  }

  return (
    <div className={`game-board${gravityShifting ? ' gravity-shifting' : ''}`}>
      {board.map((row, rowIndex) =>
        row.map((candy, colIndex) => {
          const obstacle = obstacles?.[rowIndex]?.[colIndex];
          const isBlocker = obstacle?.kind === 'vine' || obstacle?.kind === 'stone';
          const isPortal = obstacle?.kind === 'portal';

          const isSelected =
            selectedCandy?.row === rowIndex && selectedCandy?.col === colIndex;
          const isAnimating = animatingCells.has(rowIndex * 8 + colIndex);
          const isSwapping  = swappingCells?.has(rowIndex * 8 + colIndex) ?? false;
          const isShaking =
            shakeCell?.row === rowIndex && shakeCell?.col === colIndex;
          const activationType = activationCells.get(rowIndex * 8 + colIndex);

          // Stable key: obstacle id for blocker/portal cells, candy id for regular cells
          const key = obstacle
            ? `obs-${obstacle.id}`
            : (candy ? candy.id : `e-${rowIndex}-${colIndex}`);

          return (
            <div
              key={key}
              className={activationType ? `activation-wrapper activation-${activationType}` : undefined}
              style={{ position: 'relative' }}
            >
              {isBlocker ? (
                <ObstacleTile obstacle={obstacle} />
              ) : (
                <>
                  {isPortal && <ObstacleTile obstacle={obstacle} />}
                  <Candy
                    type={candy ? candy.type : null}
                    row={rowIndex}
                    col={colIndex}
                    fallDistance={candy?.fallDistance || 0}
                    fallDirX={candy?.fallDirX ?? 0}
                    fallDirY={candy?.fallDirY ?? -1}
                    special={candy?.special || null}
                    isSelected={isSelected}
                    isAnimating={isAnimating}
                    isSwapping={isSwapping}
                    isShaking={isShaking}
                    onClick={onCandyClick}
                    onDragSwap={onDragSwap}
                  />
                </>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

export default memo(GameBoard);
