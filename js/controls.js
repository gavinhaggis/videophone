import GUI from 'lil-gui';

export function initGUI({ transform, params, actions }) {
  const gui = new GUI({ title: '3D iPhone Renderer', width: 290 });

  const screenFolder = gui.addFolder('Screen Content');
  screenFolder.add(actions, 'uploadImage').name('Upload Image');
  const yOffsetController = screenFolder.add(params, 'yOffset', -3000, 2532, 1)
    .name('Y Offset')
    .onChange(actions.onYOffsetChange);
  screenFolder.add(params, 'scrollSpeed', 0.1, 5, 0.1).name('Scroll Speed');

  const iphoneFolder = gui.addFolder('iPhone Transform');
  iphoneFolder.add(transform, 'px', -5, 5, 0.001).name('Position X').onChange(actions.onTransformChange);
  iphoneFolder.add(transform, 'py', -5, 5, 0.001).name('Position Y').onChange(actions.onTransformChange);
  iphoneFolder.add(transform, 'pz', -5, 5, 0.001).name('Position Z').onChange(actions.onTransformChange);
  iphoneFolder.add(transform, 'rx', -Math.PI, Math.PI, 0.001).name('Rotation X').onChange(actions.onTransformChange);
  iphoneFolder.add(transform, 'ry', -Math.PI, Math.PI, 0.001).name('Rotation Y').onChange(actions.onTransformChange);
  iphoneFolder.add(transform, 'rz', -Math.PI, Math.PI, 0.001).name('Rotation Z').onChange(actions.onTransformChange);

  const animFolder = gui.addFolder('Animation');
  animFolder.add(actions, 'setStart').name('Set Start State');
  animFolder.add(actions, 'setEnd').name('Set End State');
  animFolder.add(params, 'duration', 0.1, 10, 0.1).name('Duration (s)');
  animFolder.add(params, 'fps', 12, 60, 1).name('FPS');
  animFolder.add(params, 'easing', ['linear', 'easeIn', 'easeOut', 'cubic']).name('Easing');
  animFolder.add(actions, 'preview').name('Preview Animation');

  const exportFolder = gui.addFolder('Export');
  exportFolder.add(params, 'exportWidth', 360, 3840, 1).name('Width px');
  exportFolder.add(params, 'exportHeight', 360, 3840, 1).name('Height px');
  exportFolder.add(actions, 'doExportSinglePNG').name('Export Single PNG');
  exportFolder.add(actions, 'doExport').name('Export PNG Sequence');
  exportFolder.add(actions, 'doExportVideo').name('Export Video (WebM)');

  return { gui, yOffsetController };
}
