const ABSOLUTE_FRAMERATE_CHANGE = 2; // Alert if framerate change > 2 fps
const ABSOLUTE_BYTES_THRESHOLD_PERCENT = 50; // Alert if bytes change > 50%

export const alertOnFramerate = (oldFramerate, currentFramerate) => (
  (oldFramerate && Math.abs(oldFramerate - currentFramerate) > ABSOLUTE_FRAMERATE_CHANGE)
);

export const alertOnPeak = (oldBytesExchanged, currentBytesExchanged) => (
  (currentBytesExchanged && Math.abs(oldBytesExchanged - currentBytesExchanged) / (currentBytesExchanged * 100) > ABSOLUTE_BYTES_THRESHOLD_PERCENT)
);
