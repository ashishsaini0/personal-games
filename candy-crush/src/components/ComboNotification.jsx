import { memo } from 'react';

function ComboNotification({ notification }) {
  if (!notification) return null;
  return (
    <div
      key={notification.key}
      className={`combo-notification combo-level-${notification.level}`}
      aria-live="polite"
    >
      {notification.message}
    </div>
  );
}

export default memo(ComboNotification);
