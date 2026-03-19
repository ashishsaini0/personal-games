import { memo } from 'react';

function FusionNotification({ notification }) {
  if (!notification) return null;
  return (
    <div
      key={notification.key}
      className={`fusion-notification fusion-${notification.type}`}
      aria-live="assertive"
    >
      <span className="fusion-icon">✨</span>
      {notification.name}
    </div>
  );
}

export default memo(FusionNotification);
