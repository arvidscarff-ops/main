(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const body = document.body;
  const hub = document.getElementById('hub');
  const seraphim = document.getElementById('seraphim');
  const constellation = document.getElementById('constellation');
  const boot = document.getElementById('boot');
  const toast = document.getElementById('toast');
  const portals = [...document.querySelectorAll('.portal')];
  const tracker = document.getElementById('tracker');
  const trackerLabel = document.getElementById('trackerLabel');
  const readout = document.getElementById('readout');
  const readoutStatus = document.getElementById('readoutStatus');
  const entityName = document.getElementById('entityName');
  const entityId = document.getElementById('entityId');
  const entityState = document.getElementById('entityState');
  const entityMemory = document.getElementById('entityMemory');
  const entityLight = document.getElementById('entityLight');
  const entityDistance = document.getElementById('entityDistance');
  const confidenceValue = document.getElementById('confidenceValue');
  const confidenceFill = document.getElementById('confidenceFill');
  const recognitionMessage = document.getElementById('recognitionMessage');
  const bloomFlash = document.getElementById('bloomFlash');
  const fieldWash = document.getElementById('fieldWash');
  const passiveMarkers = document.getElementById('passiveMarkers');
  const observerEffect = document.getElementById('observerEffect');
  const detectedCount = document.getElementById('detectedCount');
  const ambient = document.getElementById('ambient');
  const ambientCtx = ambient.getContext('2d');
  const tether = document.getElementById('tetherCanvas');
  const tetherCtx = tether.getContext('2d');

  let isSeraphim = false;
  let activeIndex = 0;
  let visibleSlotCount = 7;
  let recognitionTimer = 0;
  let toastTimer = 0;
  let scanTimer = 0;
  let rotationCursor = 0;
  let nextWitnessCursor = 7;
  let pointer = { x: innerWidth / 2, y: innerHeight / 2, active: false };
  let ambientParticles = [];
  let markerElements = [];
  let witnessCards = [];
  let pixelRatio = Math.min(devicePixelRatio || 1, 2);

  const witnessPool = [
    {
      src: 'witness-frost-meadow.jpg',
      id: 'FIELD_01',
      name: 'Frost Meadow',
      state: 'Expectant',
      memory: '86.42%',
      light: 'Subterranean',
      distance: 'Before dawn',
      confidence: 89.6,
      focus: [.38, .23, .34, .38],
      position: 'center'
    },
    {
      src: 'witness-red-tundra.jpg',
      id: 'WITNESS_03',
      name: 'Northern Witness',
      state: 'Remembering',
      memory: '73.18%',
      light: 'Diffuse',
      distance: '14 winters',
      confidence: 82.7,
      focus: [.51, .08, .24, .48],
      position: 'center'
    },
    {
      src: 'witness-bog-mirror.jpg',
      id: 'MIRROR_08',
      name: 'Bog Mirror',
      state: 'Reflecting',
      memory: '91.04%',
      light: 'Below',
      distance: 'Internal',
      confidence: 93.1,
      focus: [.26, .57, .45, .31],
      position: 'center 66%'
    },
    {
      src: 'witness-tower-choir.jpg',
      id: 'CHOIR_11',
      name: 'Tower Choir',
      state: 'Transmitting',
      memory: '40.77%',
      light: 'Signal red',
      distance: 'Unresolved',
      confidence: 96.4,
      focus: [.11, .18, .68, .47],
      position: 'center'
    },
    {
      src: 'witness-teal-meadow.jpg',
      id: 'FIELD_14',
      name: 'Teal Meadow',
      state: 'Bending',
      memory: '64.20%',
      light: 'Weather-born',
      distance: 'Near',
      confidence: 77.8,
      focus: [.51, .13, .34, .52],
      position: 'center'
    },
    {
      src: 'witness-mountain-lake.jpg',
      id: 'BASIN_05',
      name: 'Silent Basin',
      state: 'Receiving',
      memory: '88.65%',
      light: 'Surface-held',
      distance: '3.2 echoes',
      confidence: 87.3,
      focus: [.22, .35, .48, .39],
      position: 'center 46%'
    },
    {
      src: 'witness-aurora-scrub.jpg',
      id: 'AURORA_02',
      name: 'Cold Garden',
      state: 'Illuminated',
      memory: '55.83%',
      light: 'Extraterrestrial',
      distance: 'Above',
      confidence: 80.9,
      focus: [.35, .02, .28, .44],
      position: 'center'
    },
    {
      src: 'witness-housing.jpg',
      id: 'HABITAT_19',
      name: 'Housing Constellation',
      state: 'Occupied',
      memory: '98.10%',
      light: 'Domestic',
      distance: 'Across the field',
      confidence: 94.7,
      focus: [.25, .29, .53, .35],
      position: 'center'
    },
    {
      src: 'witness-blue-current.jpg',
      id: 'CURRENT_22',
      name: 'Blue Current',
      state: 'Passing',
      memory: '33.52%',
      light: 'Electric',
      distance: 'Downstream',
      confidence: 72.6,
      focus: [.43, .08, .30, .48],
      position: 'center'
    },
    {
      src: 'witness-garden.jpg',
      id: 'SANCTUARY_00',
      name: 'Garden Memory',
      state: 'Flowering',
      memory: '100.00%',
      light: 'Merciful',
      distance: 'Recovered',
      confidence: 99.8,
      focus: [.29, .52, .48, .30],
      position: 'center 61%'
    }
  ];

  const desktopSlots = [
    { x: .35, y: .28, w: .30, h: .31, depth: 1.0, opacity: .96, rotate: -.35 },
    { x: .055, y: .13, w: .235, h: .235, depth: .64, opacity: .66, rotate: -.7 },
    { x: .095, y: .57, w: .175, h: .285, depth: .84, opacity: .78, rotate: .55 },
    { x: .735, y: .11, w: .205, h: .18, depth: .7, opacity: .74, rotate: .42 },
    { x: .73, y: .39, w: .225, h: .245, depth: .9, opacity: .86, rotate: -.35 },
    { x: .36, y: .70, w: .265, h: .185, depth: .62, opacity: .64, rotate: .25 },
    { x: .015, y: .40, w: .205, h: .16, depth: .52, opacity: .58, rotate: -.25 }
  ];

  const mobileSlots = [
    { x: .04, y: .17, w: .43, h: .17, depth: .75, opacity: .82, rotate: -.35 },
    { x: .53, y: .08, w: .42, h: .20, depth: .58, opacity: .68, rotate: .5 },
    { x: .08, y: .39, w: .37, h: .18, depth: .9, opacity: .88, rotate: .3 },
    { x: .56, y: .34, w: .39, h: .17, depth: .7, opacity: .76, rotate: -.4 },
    { x: .24, y: .60, w: .52, h: .16, depth: 1, opacity: .94, rotate: .15 }
  ];

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function showToast(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('visible');
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 2600);
  }

  function sizeCanvas(canvas, context) {
    const w = innerWidth;
    const h = innerHeight;
    canvas.width = Math.floor(w * pixelRatio);
    canvas.height = Math.floor(h * pixelRatio);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  function buildAmbientParticles() {
    const count = Math.min(95, Math.max(42, Math.floor(innerWidth / 18)));
    ambientParticles = Array.from({ length: count }, () => ({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      radius: Math.random() * 1.25 + .25,
      alpha: Math.random() * .22 + .04,
      speed: Math.random() * .14 + .025,
      phase: Math.random() * Math.PI * 2,
      drift: Math.random() * .55 + .1
    }));
  }

  function drawAmbient(time) {
    ambientCtx.clearRect(0, 0, innerWidth, innerHeight);
    const t = time * .00025;
    for (const p of ambientParticles) {
      p.y -= p.speed;
      p.x += Math.sin(t + p.phase) * .035 * p.drift;
      if (p.y < -4) {
        p.y = innerHeight + 4;
        p.x = Math.random() * innerWidth;
      }
      const proximity = Math.max(0, 1 - Math.hypot(pointer.x - p.x, pointer.y - p.y) / 260);
      ambientCtx.beginPath();
      ambientCtx.arc(
        p.x + (pointer.x / innerWidth - .5) * p.drift * 7,
        p.y + (pointer.y / innerHeight - .5) * p.drift * 7,
        p.radius + proximity * 1.4,
        0,
        Math.PI * 2
      );
      ambientCtx.fillStyle = `rgba(205,255,240,${p.alpha + proximity * .25})`;
      ambientCtx.shadowBlur = 8 + proximity * 14;
      ambientCtx.shadowColor = 'rgba(174,255,226,.55)';
      ambientCtx.fill();
    }
    ambientCtx.shadowBlur = 0;
    requestAnimationFrame(drawAmbient);
  }

  function assignWitness(card, witnessIndex) {
    const data = witnessPool[witnessIndex];
    card.witnessIndex = witnessIndex;
    card.data = data;
    card.image.src = data.src;
    card.image.alt = `${data.name} landscape signal`;
    card.spectrumImage.src = data.src;
    card.spectrumImage.alt = '';
    card.element.style.setProperty('--image-position', data.position);
    card.name.textContent = `${data.id} / ${data.name}`;
    card.signal.textContent = `${data.confidence.toFixed(1)}% viable`;
  }

  function createWitnessCard(slotIndex, witnessIndex) {
    const element = document.createElement('article');
    element.className = 'witness-card';
    element.dataset.slot = String(slotIndex);
    element.innerHTML = `
      <div class="witness-media">
        <img class="witness-image" alt="">
        <span class="witness-shade"></span>
        <span class="witness-spectrum" aria-hidden="true"><img alt=""></span>
      </div>
      <div class="witness-code"><span></span><span></span></div>
    `;
    constellation.appendChild(element);

    const card = {
      element,
      media: element.querySelector('.witness-media'),
      image: element.querySelector('.witness-image'),
      spectrum: element.querySelector('.witness-spectrum'),
      spectrumImage: element.querySelector('.witness-spectrum img'),
      name: element.querySelector('.witness-code span:first-child'),
      signal: element.querySelector('.witness-code span:last-child'),
      witnessIndex,
      data: witnessPool[witnessIndex]
    };

    element.style.setProperty('--float-duration', `${7.2 + slotIndex * .57}s`);
    element.style.setProperty('--float-delay', `${slotIndex * -1.1}s`);
    assignWitness(card, witnessIndex);

    element.addEventListener('pointerenter', () => {
      if (!isSeraphim || slotIndex >= visibleSlotCount) return;
      clearTimeout(scanTimer);
      moveTracker(slotIndex, false);
      scheduleSearch();
    });

    element.addEventListener('pointerdown', (event) => {
      if (!isSeraphim || slotIndex >= visibleSlotCount) return;
      event.stopPropagation();
      moveTracker(slotIndex, false);
      recognizeAt(event.clientX, event.clientY);
    });

    return card;
  }

  function buildConstellation() {
    witnessCards = desktopSlots.map((_, index) => createWitnessCard(index, index));
    applyLayout();
    requestAnimationFrame(() => {
      placePassiveMarkers();
      moveTracker(0, false);
    });
  }

  function applyLayout() {
    const slots = innerWidth <= 620 ? mobileSlots : desktopSlots;
    visibleSlotCount = slots.length;
    detectedCount.textContent = String(visibleSlotCount).padStart(4, '0');

    witnessCards.forEach((card, index) => {
      const slot = slots[index];
      const hidden = !slot;
      card.element.classList.toggle('mobile-hidden', hidden);
      if (hidden) return;
      card.element.style.left = `${slot.x * 100}%`;
      card.element.style.top = `${slot.y * 100}%`;
      card.element.style.width = `${slot.w * 100}%`;
      card.element.style.height = `${slot.h * 100}%`;
      card.element.style.setProperty('--depth', slot.depth);
      card.element.style.setProperty('--card-opacity', slot.opacity);
      card.element.style.setProperty('--card-rotate', `${slot.rotate}deg`);
      card.element.style.zIndex = String(Math.round(slot.depth * 5) + 4);
    });

    if (activeIndex >= visibleSlotCount) activeIndex = 0;
  }

  function targetRect(index) {
    const card = witnessCards[index];
    if (!card) return { x: innerWidth * .4, y: innerHeight * .3, w: 120, h: 100 };
    const bounds = card.element.getBoundingClientRect();
    const [fx, fy, fw, fh] = card.data.focus;
    return {
      x: bounds.left + bounds.width * fx,
      y: bounds.top + bounds.height * fy,
      w: Math.max(54, bounds.width * fw),
      h: Math.max(46, bounds.height * fh),
      cardBounds: bounds
    };
  }

  function setSpectralLens(index) {
    witnessCards.forEach((card, cardIndex) => {
      const active = cardIndex === index && cardIndex < visibleSlotCount;
      card.element.classList.toggle('is-active', active);
      if (!active) {
        card.spectrum.style.clipPath = 'inset(50% 50% 50% 50%)';
        return;
      }
      const [x, y, w, h] = card.data.focus;
      const top = y * 100;
      const right = (1 - x - w) * 100;
      const bottom = (1 - y - h) * 100;
      const left = x * 100;
      card.spectrum.style.clipPath = `inset(${top}% ${right}% ${bottom}% ${left}%)`;
    });
  }

  function setReadout(card, index) {
    const target = card.data;
    const rect = targetRect(index);
    entityName.textContent = target.name;
    entityId.textContent = target.id;
    entityState.textContent = target.state;
    entityMemory.textContent = target.memory;
    entityLight.textContent = target.light;
    entityDistance.textContent = target.distance;
    confidenceValue.textContent = `${target.confidence.toFixed(1)}%`;
    confidenceFill.style.width = `${target.confidence}%`;

    const top = clamp(rect.y - 16, 100, innerHeight - 330);
    readout.style.top = `${top}px`;
    if (rect.x + rect.w / 2 < innerWidth / 2) {
      readout.style.left = 'auto';
      readout.style.right = '6vw';
    } else {
      readout.style.right = 'auto';
      readout.style.left = '6vw';
    }
    readout.classList.remove('pulse');
    void readout.offsetWidth;
    readout.classList.add('pulse');
  }

  function moveTracker(index, locked = false) {
    if (!witnessCards.length) return;
    activeIndex = ((index % visibleSlotCount) + visibleSlotCount) % visibleSlotCount;
    const card = witnessCards[activeIndex];
    const rect = targetRect(activeIndex);
    tracker.style.left = `${rect.x}px`;
    tracker.style.top = `${rect.y}px`;
    tracker.style.width = `${rect.w}px`;
    tracker.style.height = `${rect.h}px`;
    tracker.classList.add('spectral');
    tracker.classList.toggle('locked', locked);
    readoutStatus.textContent = locked ? 'Presence felt' : 'Acquiring';
    trackerLabel.textContent = locked ? `Recognized / ${card.data.id}` : `Acquiring / witness 0${activeIndex + 1}`;
    setSpectralLens(activeIndex);
    setReadout(card, activeIndex);
  }

  function placePassiveMarkers() {
    passiveMarkers.innerHTML = '';
    markerElements = witnessCards.slice(0, visibleSlotCount).map((_, index) => {
      const marker = document.createElement('i');
      marker.className = 'passive-marker';
      marker.style.animationDelay = `${index * -.72}s`;
      passiveMarkers.appendChild(marker);
      return marker;
    });
  }

  function updatePassiveMarkers() {
    markerElements.forEach((marker, index) => {
      const bounds = witnessCards[index].element.getBoundingClientRect();
      marker.style.left = `${bounds.left + bounds.width / 2}px`;
      marker.style.top = `${bounds.top + bounds.height / 2}px`;
    });
  }

  function updatePointer(x, y) {
    pointer.x = x;
    pointer.y = y;
    pointer.active = true;
    root.style.setProperty('--mx', `${x}px`);
    root.style.setProperty('--my', `${y}px`);

    if (!isSeraphim) return;
    const nx = x / innerWidth - .5;
    const ny = y / innerHeight - .5;
    fieldWash.style.setProperty('--light-x', `${x / innerWidth * 100}%`);
    fieldWash.style.setProperty('--light-y', `${y / innerHeight * 100}%`);
    observerEffect.textContent = `${(8 + Math.hypot(nx, ny) * 17).toFixed(1)}%`;

    witnessCards.slice(0, visibleSlotCount).forEach((card, index) => {
      const slots = innerWidth <= 620 ? mobileSlots : desktopSlots;
      const depth = slots[index].depth;
      card.element.style.setProperty('--parallax-x', `${nx * -13 * depth}px`);
      card.element.style.setProperty('--parallax-y', `${ny * -10 * depth}px`);
    });
    attractNearestTarget(x, y);
  }

  function attractNearestTarget(x, y) {
    let nearest = -1;
    let nearestDistance = Infinity;
    witnessCards.slice(0, visibleSlotCount).forEach((card, index) => {
      const bounds = card.element.getBoundingClientRect();
      const distance = Math.hypot(x - (bounds.left + bounds.width / 2), y - (bounds.top + bounds.height / 2));
      card.element.classList.toggle('pointer-near', distance < 180);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = index;
      }
    });
    if (nearestDistance < Math.min(205, innerWidth * .18) && nearest !== activeIndex) {
      clearTimeout(scanTimer);
      moveTracker(nearest, false);
      scheduleSearch();
    }
  }

  function recognizeAt(x, y) {
    const card = witnessCards[activeIndex];
    const rect = targetRect(activeIndex);
    moveTracker(activeIndex, true);
    card.element.classList.remove('is-recognized');
    void card.element.offsetWidth;
    card.element.classList.add('is-recognized');
    entityState.textContent = 'Presence felt';
    bloomFlash.style.setProperty('--flash-x', `${(rect.x + rect.w / 2) / innerWidth * 100}%`);
    bloomFlash.style.setProperty('--flash-y', `${(rect.y + rect.h / 2) / innerHeight * 100}%`);
    bloomFlash.classList.remove('fire');
    void bloomFlash.offsetWidth;
    bloomFlash.classList.add('fire');
    recognitionMessage.textContent = `Presence felt / ${card.data.name}`;
    recognitionMessage.classList.add('visible');
    createRipple(x, y);
    clearTimeout(recognitionTimer);
    recognitionTimer = setTimeout(() => {
      recognitionMessage.classList.remove('visible');
      tracker.classList.remove('locked');
      card.element.classList.remove('is-recognized');
      readoutStatus.textContent = 'Observing';
      entityState.textContent = card.data.state;
      scheduleSearch();
    }, 1900);
  }

  function createRipple(x, y) {
    const ripple = document.createElement('i');
    ripple.className = 'click-ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    seraphim.appendChild(ripple);
    setTimeout(() => ripple.remove(), 950);
  }

  function scheduleSearch() {
    clearTimeout(scanTimer);
    if (!isSeraphim) return;
    scanTimer = setTimeout(() => {
      moveTracker((activeIndex + 1) % visibleSlotCount, false);
      scheduleSearch();
    }, 4300);
  }

  function rotateWitness() {
    if (!isSeraphim || reducedMotion) return;
    let slotIndex = rotationCursor % visibleSlotCount;
    rotationCursor += 1;
    if (slotIndex === activeIndex) slotIndex = (slotIndex + 1) % visibleSlotCount;

    const assigned = new Set(witnessCards.map((card) => card.witnessIndex));
    let nextIndex = nextWitnessCursor % witnessPool.length;
    for (let attempt = 0; attempt < witnessPool.length; attempt += 1) {
      if (!assigned.has(nextIndex)) break;
      nextIndex = (nextIndex + 1) % witnessPool.length;
    }
    nextWitnessCursor = (nextIndex + 1) % witnessPool.length;

    const card = witnessCards[slotIndex];
    card.element.classList.add('changing');
    setTimeout(() => {
      assignWitness(card, nextIndex);
      card.element.classList.remove('changing');
      placePassiveMarkers();
    }, 650);
  }

  function drawTether(time) {
    tetherCtx.clearRect(0, 0, innerWidth, innerHeight);
    if (isSeraphim && tracker.offsetWidth && readout.offsetWidth) {
      updatePassiveMarkers();
      const a = tracker.getBoundingClientRect();
      const b = readout.getBoundingClientRect();
      const readoutOnRight = b.left > a.left;
      const startX = readoutOnRight ? a.right : a.left;
      const startY = a.top + a.height * .52;
      const endX = readoutOnRight ? b.left : b.right;
      const endY = b.top + 32;
      const elbowX = startX + (endX - startX) * .48;
      const gradient = tetherCtx.createLinearGradient(startX, startY, endX, endY);
      gradient.addColorStop(0, 'rgba(255,126,202,.72)');
      gradient.addColorStop(.52, 'rgba(164,81,255,.52)');
      gradient.addColorStop(1, 'rgba(224,255,248,.38)');

      tetherCtx.save();
      tetherCtx.lineWidth = 1;
      tetherCtx.strokeStyle = gradient;
      tetherCtx.shadowBlur = 9;
      tetherCtx.shadowColor = 'rgba(255,62,156,.34)';
      tetherCtx.beginPath();
      tetherCtx.moveTo(startX, startY);
      tetherCtx.lineTo(elbowX, startY);
      tetherCtx.lineTo(endX, endY);
      tetherCtx.stroke();

      tetherCtx.shadowBlur = 14;
      tetherCtx.fillStyle = 'rgba(255,195,230,.95)';
      const phase = (time * .0002) % 1;
      let pulseX;
      let pulseY;
      if (phase < .5) {
        const progress = phase * 2;
        pulseX = startX + (elbowX - startX) * progress;
        pulseY = startY;
      } else {
        const progress = (phase - .5) * 2;
        pulseX = elbowX + (endX - elbowX) * progress;
        pulseY = startY + (endY - startY) * progress;
      }
      tetherCtx.beginPath();
      tetherCtx.arc(pulseX, pulseY, 2.2, 0, Math.PI * 2);
      tetherCtx.fill();
      tetherCtx.restore();
    }
    requestAnimationFrame(drawTether);
  }

  function enterSeraphim() {
    isSeraphim = true;
    body.classList.add('seraphim-open');
    hub.classList.remove('active');
    seraphim.classList.add('active');
    setTimeout(() => {
      moveTracker(0, false);
      placePassiveMarkers();
      scheduleSearch();
    }, 80);
    setTimeout(() => document.getElementById('returnButton').focus({ preventScroll: true }), 850);
  }

  function returnToHub() {
    isSeraphim = false;
    body.classList.remove('seraphim-open');
    seraphim.classList.remove('active');
    hub.classList.add('active');
    clearTimeout(scanTimer);
    clearTimeout(recognitionTimer);
    recognitionMessage.classList.remove('visible');
    witnessCards.forEach((card) => {
      card.element.classList.remove('is-active', 'is-recognized', 'pointer-near');
      card.spectrum.style.clipPath = 'inset(50% 50% 50% 50%)';
    });
    setTimeout(() => portals[0].focus({ preventScroll: true }), 850);
  }

  portals.forEach((portal) => {
    portal.addEventListener('pointermove', (event) => {
      const rect = portal.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      portal.style.setProperty('--tilt-x', `${(py - .5) * -5}deg`);
      portal.style.setProperty('--tilt-y', `${(px - .5) * 6}deg`);
      portal.style.setProperty('--glow-x', `${px * 100}%`);
      portal.style.setProperty('--glow-y', `${py * 100}%`);
    });
    portal.addEventListener('pointerleave', () => {
      portal.style.setProperty('--tilt-x', '0deg');
      portal.style.setProperty('--tilt-y', '0deg');
      portal.style.setProperty('--glow-x', '50%');
      portal.style.setProperty('--glow-y', '50%');
    });
    portal.addEventListener('click', () => {
      const scene = portal.dataset.scene;
      if (scene === 'seraphim') {
        enterSeraphim();
      } else {
        const names = { mnemosyne: 'MNEMOSYNE', eden: 'EDEN', wetware: 'WETWARE' };
        showToast(`${names[scene]} / signal dormant · environment recovery pending`);
      }
    });
  });

  document.getElementById('returnButton').addEventListener('click', returnToHub);

  seraphim.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button') || event.target.closest('.witness-card')) return;
    recognizeAt(event.clientX, event.clientY);
  });

  window.addEventListener('pointermove', (event) => updatePointer(event.clientX, event.clientY), { passive: true });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isSeraphim) returnToHub();
  });

  window.addEventListener('resize', () => {
    pixelRatio = Math.min(devicePixelRatio || 1, 2);
    sizeCanvas(ambient, ambientCtx);
    sizeCanvas(tether, tetherCtx);
    buildAmbientParticles();
    applyLayout();
    placePassiveMarkers();
    setTimeout(() => {
      if (isSeraphim) moveTracker(activeIndex, tracker.classList.contains('locked'));
    }, 120);
  });

  setInterval(() => {
    if (!isSeraphim || !witnessCards.length) return;
    const target = witnessCards[activeIndex].data;
    const jitter = (Math.random() - .5) * .42;
    const value = clamp(target.confidence + jitter, 0, 100);
    confidenceValue.textContent = `${value.toFixed(1)}%`;
    confidenceFill.style.width = `${value}%`;
  }, 850);

  setInterval(rotateWitness, 11200);

  sizeCanvas(ambient, ambientCtx);
  sizeCanvas(tether, tetherCtx);
  buildAmbientParticles();
  buildConstellation();
  requestAnimationFrame(drawAmbient);
  requestAnimationFrame(drawTether);
  updatePointer(innerWidth / 2, innerHeight / 2);
  setTimeout(() => boot.classList.add('hidden'), reducedMotion ? 100 : 1550);
})();
