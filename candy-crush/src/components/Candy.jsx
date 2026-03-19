import { useRef, useCallback, useEffect, memo } from 'react';
import { FRUIT_TYPES } from '../utils/generateLevels';

const BOARD_SIZE = 8;
const DRAG_THRESHOLD = 22;

// Fruit emoji icons — easily distinguishable for all ages
const FRUIT_EMOJIS = [
  '\u{1F34E}', // 🍎 Apple (red)
  '\u{1F34A}', // 🍊 Orange (orange)
  '\u{1F34C}', // 🍌 Banana (yellow)
  '\u{1F347}', // 🍇 Grape (purple)
  '\u{1F349}', // 🍉 Watermelon (green)
  '\u{1F95D}', // 🥝 Kiwi (teal)
];

// Pre-built color style objects with richer gradients for a 3D fruit look
const COLOR_STYLES = FRUIT_TYPES.map((c) => ({
  background: `radial-gradient(circle at 35% 35%, ${c.color}ee, ${c.color}bb 50%, ${c.color}88 100%)`,
}));

function EmptyCell() {
  return <div className="fruit-cell empty" />;
}

function Candy({
  type,
  row,
  col,
  fallDistance,
  fallDirX = 0,
  fallDirY = -1,
  special,
  isSelected,
  isAnimating,
  isShaking,
  isSwapping,
  onClick,
  onDragSwap,
}) {
  const dragStart = useRef(null);
  // Always holds the latest props so stable callbacks don't close over stale values
  const propsRef = useRef({ row, col, onClick, onDragSwap });
  useEffect(() => { propsRef.current = { row, col, onClick, onDragSwap }; });

  const handlePointerEnd = useCallback((clientX, clientY) => {
    if (!dragStart.current) return;
    const dx = clientX - dragStart.current.x;
    const dy = clientY - dragStart.current.y;
    const { row: r, col: c, onClick: click, onDragSwap: drag } = propsRef.current;
    dragStart.current = null;

    if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) {
      click(r, c);
      return;
    }

    let toRow = r;
    let toCol = c;
    if (Math.abs(dx) > Math.abs(dy)) {
      toCol += dx > 0 ? 1 : -1;
    } else {
      toRow += dy > 0 ? 1 : -1;
    }
    if (toRow >= 0 && toRow < BOARD_SIZE && toCol >= 0 && toCol < BOARD_SIZE) {
      drag(r, c, toRow, toCol);
    }
  }, []);

  // Unified pointer events work for both touch and mouse, and setPointerCapture
  // keeps the element receiving events even when the finger slides off.
  const onPointerDown = useCallback((e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onPointerUp = useCallback((e) => {
    handlePointerEnd(e.clientX, e.clientY);
  }, [handlePointerEnd]);

  const onPointerCancel = useCallback(() => {
    dragStart.current = null;
  }, []);

  if (type === null || type === undefined) return <EmptyCell />;

  let cellClass = 'fruit-cell';
  if (isSelected) cellClass += ' selected';
  if (isAnimating) cellClass += ' match-pop';
  if (isShaking) cellClass += ' shake';
  if (isSwapping) cellClass += ' swapping';
  if (fallDistance > 0) cellClass += ' falling';
  if (special) cellClass += ' special-fruit';
  if (special === 'lightning') cellClass += ' special-lightning';
  if (special === 'bomb') cellClass += ' special-bomb';
  if (special === 'tornado') cellClass += ' special-tornado';
  if (special === 'gravity-orb') cellClass += ' special-gravity-orb';

  const cellStyle = fallDistance > 0
    ? { touchAction: 'none', '--fall': fallDistance, '--fall-x': fallDirX, '--fall-y': fallDirY }
    : TOUCH_NONE_STYLE;

  return (
    <div
      className={cellClass}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      style={cellStyle}
    >
      <div className="fruit-inner" style={COLOR_STYLES[type]}>
        <span className="fruit-emoji">{FRUIT_EMOJIS[type % FRUIT_EMOJIS.length]}</span>
        <div className="fruit-shine" />
        {special && (
          <div className={`special-icon special-icon-${special}`}>
            {special === 'lightning'      ? '\u26A1'
              : special === 'bomb'        ? '\uD83D\uDCA3'
              : special === 'tornado'     ? '\uD83C\uDF2A\uFE0F'
              : special === 'gravity-orb' ? '\uD83D\uDD2E'
              : '\u26A1'}
          </div>
        )}
      </div>
    </div>
  );
}

const TOUCH_NONE_STYLE = { touchAction: 'none' };

export default memo(Candy);
