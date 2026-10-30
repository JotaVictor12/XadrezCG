/** O navegador consegue criar um contexto WebGL2? */
export function isWebGL2Supported() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(window.WebGL2RenderingContext && canvas.getContext('webgl2'));
  } catch {
    return false;
  }
}
