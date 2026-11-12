import * as T from './assets/vendor/three-0.180.0.js';

// An original, procedural game model. No official product model or images are used.
export function createPetStage(host, {onPet, onWalk, onUnavailable}) {
  const renderer = new T.WebGLRenderer({alpha: true, antialias: true, powerPreference: 'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
  host.append(renderer.domElement);
  const scene = new T.Scene(), root = new T.Group(), torso = new T.Group(), head = new T.Group();
  scene.add(root); root.add(torso); torso.add(head); head.position.y = 1.94;
  const camera = new T.PerspectiveCamera(35, 1, .1, 30);
  camera.position.set(0, 2.65, 6.5); camera.lookAt(0, 1.6, 0);
  scene.add(new T.HemisphereLight(0xfffaf0, 0x8f826c, 2.6));
  const light = new T.DirectionalLight(0xfff1da, 3.8); light.position.set(-3, 6, 5); light.castShadow = true;
  light.shadow.mapSize.set(512, 512); light.shadow.camera.left = -3; light.shadow.camera.right = 3;
  light.shadow.camera.top = 4; light.shadow.camera.bottom = -2; light.shadow.bias = -.001; scene.add(light);
  const fill = new T.DirectionalLight(0xe0edff, 1.3); fill.position.set(4, 3, -2); scene.add(fill);
  const sphere = new T.SphereGeometry(1, 40, 28);
  const fabric = new T.MeshStandardMaterial({color: '#f7f2e9', roughness: .95});
  const faceMaterial = new T.MeshStandardMaterial({color: '#9d704c', roughness: .92});
  const dark = new T.MeshStandardMaterial({color: '#252922', roughness: .5});
  const eyeMaterial = new T.MeshPhysicalMaterial({color: '#111a1e', roughness: .1, clearcoat: 1});
  const iris = new T.MeshStandardMaterial({color: '#708697', roughness: .4});
  const white = new T.MeshStandardMaterial({color: '#fff9ed', emissive: '#fff5df', emissiveIntensity: .25});
  function ellipsoid(parent, material, x, y, z, sx, sy, sz) {
    const mesh = new T.Mesh(sphere, material); mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  ellipsoid(torso, fabric, 0, .94, 0, .61, .81, .47);
  ellipsoid(head, fabric, 0, 0, 0, .72, .69, .59);
  ellipsoid(head, faceMaterial, 0, -.015, .47, .59, .55, .24);
  const eyes = [], pupils = [];
  for (const side of [-1, 1]) {
    const eye = new T.Group(); eye.position.set(side * .255, .045, .674); head.add(eye); eyes.push(eye);
    ellipsoid(eye, dark, 0, 0, 0, .132, .169, .07);
    ellipsoid(eye, iris, 0, -.008, .032, .117, .152, .064);
    const pupil = new T.Group(); eye.add(pupil); pupils.push(pupil);
    ellipsoid(pupil, eyeMaterial, side * .014, .008, .072, .102, .14, .043);
    ellipsoid(pupil, white, -.023, .058, .112, .021, .028, .012);
    ellipsoid(pupil, white, .026, -.068, .112, .007, .009, .006);
  }
  ellipsoid(head, new T.MeshStandardMaterial({color: '#493b2a', roughness: .6}), 0, -.077, .724, .085, .077, .07);
  const sensor = new T.Mesh(new T.CylinderGeometry(.13, .17, .51, 28), dark);
  sensor.position.set(0, .86, -.045); sensor.castShadow = true; head.add(sensor);
  for (const [angle, y] of [[0, .91], [-.7, .82], [.7, .82]]) {
    const lens = ellipsoid(head, eyeMaterial, Math.sin(angle) * .14, y, Math.cos(angle) * .14 - .045, .054, .055, .026);
    lens.rotation.y = angle;
  }
  const arms = [];
  for (const side of [-1, 1]) {
    const arm = new T.Group(); arm.position.set(side * .48, 1.19, 0); torso.add(arm);
    ellipsoid(arm, fabric, side * .15, -.18, .01, .22, .43, .23); arm.rotation.z = side * .45; arms.push(arm);
    const wheel = new T.Mesh(new T.CylinderGeometry(.17, .17, .16, 24), dark);
    wheel.rotation.z = Math.PI / 2; wheel.position.set(side * .39, .18, .02); wheel.castShadow = true; torso.add(wheel);
  }
  const ears = new T.Group(); head.add(ears);
  const tail = new T.Group(); torso.add(tail);
  const plane = new T.Mesh(new T.PlaneGeometry(12, 12), new T.ShadowMaterial({opacity: .16}));
  plane.rotation.x = -Math.PI / 2; plane.position.y = .01; plane.receiveShadow = true; scene.add(plane);
  let texture = null, outfitId = '', reduced = matchMedia('(prefers-reduced-motion: reduce)'), active = true;
  let energy = 80, targetX = 0, targetZ = 0, gazeX = 0, gazeY = 0, spin = false, spinAngle = 0;
  let action = '', actionStart = 0, lastTime = 0, nextWander = 0, disposed = false;
  const raycaster = new T.Raycaster(), pointer = new T.Vector2();
  function clearExtras(group) {
    [...group.children].forEach(child => { group.remove(child); child.traverse(object => {
      if (object.geometry && object.geometry !== sphere) object.geometry.dispose();
      if (object.material && object.material !== fabric) object.material.dispose();
    }); });
  }
  function setOutfit(item) {
    if (outfitId === item.id) return; outfitId = item.id;
    fabric.color.set(item.color); fabric.map = null;
    if (texture) { texture.dispose(); texture = null; }
    if (item.pattern !== 'plain') {
      const c = document.createElement('canvas'); c.width = c.height = 256; const ctx = c.getContext('2d');
      ctx.fillStyle = item.color; ctx.fillRect(0, 0, 256, 256); ctx.fillStyle = item.pattern === 'stars' ? '#ffe9ac' : '#fff8';
      for (let y = 20; y < 256; y += 40) for (let x = 20; x < 256; x += 40) {
        if (item.pattern === 'stripes') { ctx.fillRect(0, y, 256, 12); break; }
        ctx.beginPath();
        if (item.pattern === 'stars') {
          for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? 3 : 7; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
        } else ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      texture = new T.CanvasTexture(c); texture.colorSpace = T.SRGBColorSpace; fabric.map = texture;
    }
    fabric.needsUpdate = true; clearExtras(ears); clearExtras(tail);
    if (item.shape) for (const side of [-1, 1]) {
      if (item.shape === 'cat') {
        const ear = new T.Mesh(new T.ConeGeometry(.22, .42, 3), fabric);
        ear.position.set(side * .48, .64, .04); ear.rotation.z = -side * .22; ear.castShadow = true; ears.add(ear);
        const inner = ellipsoid(ears, new T.MeshStandardMaterial({color: '#cba5a3', roughness: 1}), side * .48, .64, .16, .075, .10, .025);
        inner.rotation.z = -side * .22;
      } else {
        const rabbit = item.shape === 'bunny';
        const ear = ellipsoid(ears, fabric, side * .48, rabbit ? .86 : .59, 0, rabbit ? .14 : .23, rabbit ? .43 : .23, .14);
        ear.rotation.z = -side * .2;
        ellipsoid(ears, new T.MeshStandardMaterial({color: rabbit ? '#dab3ad' : '#a17a52', roughness: 1}), side * .49, rabbit ? .89 : .62, .122, rabbit ? .065 : .12, rabbit ? .28 : .12, .027);
      }
    }
    if (item.shape) ellipsoid(tail, fabric, 0, .67, -.47, item.shape === 'cat' ? .10 : .19, item.shape === 'cat' ? .42 : .19, .18);
  }
  function react(kind) { action = kind; actionStart = performance.now() / 1000; spin = false; }
  function call() { targetX = 0; targetZ = .8; react('call'); }
  function resize() {
    if (!host.clientWidth || !host.clientHeight) return;
    renderer.setSize(host.clientWidth, host.clientHeight); camera.aspect = host.clientWidth / host.clientHeight;
    camera.position.z = camera.aspect < 1 ? 7.3 : 6.5; camera.updateProjectionMatrix();
  }
  function move(event) {
    const rect = host.getBoundingClientRect(); gazeX = (event.clientX - rect.left) / rect.width * 2 - 1; gazeY = (event.clientY - rect.top) / rect.height * 2 - 1;
  }
  function click(event) {
    move(event); pointer.set(gazeX, -gazeY); raycaster.setFromCamera(pointer, camera);
    if (raycaster.intersectObject(root, true).length) onPet();
    else { targetX = T.MathUtils.clamp(gazeX * 1.5, -1, 1); targetZ = T.MathUtils.clamp(gazeY * 1.4, -.25, .8); spin = false; onWalk(); }
  }
  function resetGaze() { gazeX = gazeY = 0; }
  function loseContext(event) { event.preventDefault(); stop(); onUnavailable(); }
  host.addEventListener('pointermove', move); host.addEventListener('pointerleave', resetGaze); host.addEventListener('click', click);
  renderer.domElement.addEventListener('webglcontextlost', loseContext);
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  const visibility = new IntersectionObserver(entries => { active = entries[0].isIntersecting; }); visibility.observe(host);
  function frame(ms) {
    if (!active || document.hidden || disposed) { lastTime = 0; return; }
    const t = ms / 1000, dt = Math.min(lastTime ? t - lastTime : 0, .05); lastTime = t;
    const age = t - actionStart, reaction = action && age < 2.5 ? action : '';
    if (!reaction && !spin && t > nextWander && !reduced.matches && energy > 25) {
      targetX = (Math.random() - .5) * 1.2; targetZ = (Math.random() - .5) * .4; nextWander = t + 7;
    }
    const dx = targetX - root.position.x, dz = targetZ - root.position.z;
    const moving = Math.abs(dx) + Math.abs(dz) > .05;
    if (!reduced.matches) { root.position.x = T.MathUtils.damp(root.position.x, targetX, 1.7, dt); root.position.z = T.MathUtils.damp(root.position.z, targetZ, 1.7, dt); }
    else { root.position.x = targetX; root.position.z = targetZ; }
    if (spin && !reduced.matches) spinAngle += dt * .9;
    const yaw = spin ? spinAngle : moving ? dx * .65 : 0;
    root.rotation.y = reduced.matches ? yaw : T.MathUtils.damp(root.rotation.y, yaw, 3, dt);
    const idle = reduced.matches ? 0 : Math.sin(t * 1.8) * .015;
    torso.position.y = idle + (reaction === 'play' && !reduced.matches ? Math.abs(Math.sin(age * 7)) * .12 : 0);
    head.rotation.y = T.MathUtils.damp(head.rotation.y, spin ? 0 : gazeX * .32, 3, dt);
    head.rotation.x = T.MathUtils.damp(head.rotation.x, reaction === 'charge' || energy < 25 ? .12 : -.06 + gazeY * .1, 3, dt);
    head.rotation.z = reduced.matches ? 0 : Math.sin(t * .9) * .025 + (reaction === 'pet' ? Math.sin(age * 5) * .06 : 0);
    const blink = reduced.matches ? 1 : t % 5.3 > 5.1 ? .12 : 1;
    eyes.forEach(eye => { eye.scale.y = reaction === 'pet' || reaction === 'charge' ? .15 : blink; });
    pupils.forEach(pupil => { pupil.position.x = gazeX * .022; pupil.position.y = -gazeY * .015; });
    arms.forEach((arm, i) => { const sign = i ? 1 : -1; arm.rotation.z = sign * (reaction === 'play' || reaction === 'call' ? 1.2 : -.45) + (reduced.matches ? 0 : Math.sin(t * 2 + i) * .04); });
    host.dataset.motion = reaction || (moving ? 'walking' : 'idle'); renderer.render(scene, camera);
  }
  function stop() { disposed = true; renderer.setAnimationLoop(null); observer.disconnect(); visibility.disconnect(); }
  renderer.setAnimationLoop(frame);
  return {setOutfit, setEnergy(value) { energy = value; }, react, call,
    turn(value) { spin = value; spinAngle = reduced.matches ? Math.PI : root.rotation.y; if (value) action = ''; if (reduced.matches) root.rotation.y = value ? Math.PI : 0; },
    dispose() { stop(); host.removeEventListener('pointermove', move); host.removeEventListener('pointerleave', resetGaze); host.removeEventListener('click', click); renderer.dispose(); scene.traverse(object => { if (object.geometry) object.geometry.dispose(); if (object.material) object.material.dispose(); }); if (texture) texture.dispose(); }
  };
}
