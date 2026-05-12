import GUI from 'lil-gui';

export function initGUI({ transform, params, actions }) {
  const gui = new GUI({ title: '3D Device Renderer', width: 290 });

  gui.add(params, 'device', ['iphone', 'macbook']).name('Device').onChange(actions.switchDevice);

  const screenFolder = gui.addFolder('Screen Content');
  screenFolder.add(actions, 'uploadImage').name('Upload Image');
  screenFolder.add(actions, 'uploadVideo').name('Upload Video');
  const yOffsetController = screenFolder.add(params, 'yOffset', -3000, 2532, 1)
    .name('Y Offset')
    .onChange(actions.onYOffsetChange);
  screenFolder.add(params, 'scrollSpeed', 0.1, 5, 0.1).name('Scroll Speed');

  const cameraFolder = gui.addFolder('Camera Presets');
  cameraFolder.add(actions, 'cameraFront').name('Front');
  cameraFolder.add(actions, 'cameraSide').name('Side');
  cameraFolder.add(actions, 'cameraTop').name('Top');
  cameraFolder.add(actions, 'cameraIsometric').name('Isometric');

  const deviceFolder = gui.addFolder('Device Transform');
  deviceFolder.add(transform, 'px', -5, 5, 0.001).name('Position X').onChange(actions.onTransformChange);
  deviceFolder.add(transform, 'py', -5, 5, 0.001).name('Position Y').onChange(actions.onTransformChange);
  deviceFolder.add(transform, 'pz', -5, 5, 0.001).name('Position Z').onChange(actions.onTransformChange);
  deviceFolder.add(transform, 'rx', -Math.PI, Math.PI, 0.001).name('Rotation X').onChange(actions.onTransformChange);
  deviceFolder.add(transform, 'ry', -Math.PI, Math.PI, 0.001).name('Rotation Y').onChange(actions.onTransformChange);
  deviceFolder.add(transform, 'rz', -Math.PI, Math.PI, 0.001).name('Rotation Z').onChange(actions.onTransformChange);

  const animFolder = gui.addFolder('Animation');
  animFolder.add(actions, 'setStart').name('Set Start State');
  animFolder.add(actions, 'setMiddle').name('Set Middle State');
  animFolder.add(actions, 'clearMiddle').name('Clear Middle State');
  animFolder.add(actions, 'setEnd').name('Set End State');
  animFolder.add(params, 'duration', 0.1, 10, 0.1).name('Duration (s)');
  animFolder.add(params, 'fps', 12, 60, 1).name('FPS');
  animFolder.add(params, 'easing', ['linear', 'easeIn', 'easeOut', 'cubic']).name('Easing');
  animFolder.add(params, 'loop').name('Boomerang Loop');
  animFolder.add(actions, 'preview').name('Preview');
  animFolder.add(actions, 'stopPreview').name('Stop');

  const exportFolder = gui.addFolder('Export');
  exportFolder.add(params, 'exportWidth', 360, 3840, 1).name('Width px');
  exportFolder.add(params, 'exportHeight', 360, 3840, 1).name('Height px');
  exportFolder.add(actions, 'doExportSinglePNG').name('Export Single PNG');
  exportFolder.add(actions, 'doExport').name('Export PNG Sequence');
  exportFolder.add(actions, 'doExportVideo').name('Export Video (WebM)');

  const presetsFolder = gui.addFolder('Presets');
  presetsFolder.add(actions, 'savePreset').name('Save Preset');
  presetsFolder.add(actions, 'loadPreset').name('Load Preset');

  return { gui, yOffsetController };
}
