export function toggleFullscreen() {
  const element = document.getElementById(
    'public-stage-preview'
  );

  if (!element) return;

  if (!document.fullscreenElement) {
    element.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}