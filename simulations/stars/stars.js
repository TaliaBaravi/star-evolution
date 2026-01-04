    // --- CONFIG & STAGES ---
        const STAGES = [
            { id: 'cloud', name: 'ערפילית', desc: 'כוכבים מתחילים בעננים עצומים וקרים של גז ואבק. כוח המשיכה מתחיל למשוך את הליבה יחד.' },
            { id: 'protostar', name: 'קדם-כוכב', desc: 'הליבה מתחממת ומתגבשת. חומר מהערפילית קורס פנימה ויוצר דיסקת ספיחה לוהטת.' },
            { id: 'main_sequence', name: 'סדרה מרכזית', desc: 'היתוך גרעיני הופך את הכוכב ליציב. פני השטח מבעבעים באנרגיה ולולאות מגנטיות פורצות החוצה.' },
            { id: 'red_giant', name: 'ענק אדום', desc: 'הדלק אוזל. השכבות החיצוניות מתרחבות בצורה מאסיבית, ופני השטח "רותחים" בזרמי אנרגיה סוערים.' },
            { id: 'death', name: 'שלב המוות', desc: 'כוכבים בעלי מסה גבוהה מסיימים בסופרנובה אדירה; כוכבים בעלי מסה נמוכה משילים ערפילית פלנטרית.' },
            { id: 'remnant', name: 'שארית / גורל', desc: '' }
        ];

        const RADIUS = 25; 
        const ANGLE_STEP = Math.PI / (STAGES.length - 1);

        // --- AUDIO ENGINE ---
        let audioCtx, droneOsc, masterGain, soundEnabled = false;
        function initAudio() {
            if (audioCtx) return;
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            masterGain = audioCtx.createGain(); masterGain.connect(audioCtx.destination);
            masterGain.gain.value = 0.2;
            droneOsc = audioCtx.createOscillator(); droneOsc.type = 'sine'; droneOsc.frequency.setValueAtTime(55, audioCtx.currentTime); 
            const droneGain = audioCtx.createGain(); droneGain.gain.value = 0.1;
            droneOsc.connect(droneGain); droneGain.connect(masterGain); droneOsc.start();
        }
        function playWhoosh() { if (!soundEnabled || !masterGain) return; const osc = audioCtx.createOscillator(); const g = audioCtx.createGain(); osc.frequency.setValueAtTime(100, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.4); g.gain.setValueAtTime(0.1, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4); osc.connect(g); g.connect(masterGain); osc.start(); osc.stop(audioCtx.currentTime + 0.4); }
        function playBoom() { if (!soundEnabled || !masterGain) return; const now = audioCtx.currentTime; const bufferSize = audioCtx.sampleRate * 1.5; const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate); const data = buffer.getChannelData(0); for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1; const noise = audioCtx.createBufferSource(); noise.buffer = buffer; const filter = audioCtx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.setValueAtTime(400, now); filter.frequency.exponentialRampToValueAtTime(40, now + 1.5); const noiseGain = audioCtx.createGain(); noiseGain.gain.setValueAtTime(0.4, now); noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 1.5); noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(masterGain); noise.start(now); }

        // --- THREE.JS ENGINE ---
        let scene, camera, renderer, clock, timelineGroup, starBackground;
        let stagesData = [], arrowsData = []; 
        let currentMode = 'overview'; 
        let selectedStageIndex = -1;
        let stellarMass = 1.0, wormholeActive = false;
        let raycaster = new THREE.Raycaster(), mouse = new THREE.Vector2();

        const targetPos = new THREE.Vector3(0, 0, 45);
        const lookAtTarget = new THREE.Vector3(0, 0, 0);

        function generateStarTexture(colorBase, type = 'granulated') {
            const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128; const ctx = canvas.getContext('2d');
            ctx.fillStyle = colorBase; ctx.fillRect(0, 0, 128, 128);
            if (type === 'granulated') { for(let i=0; i<400; i++) { ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.2})`; ctx.beginPath(); ctx.arc(Math.random()*128, Math.random()*128, Math.random()*3, 0, Math.PI*2); ctx.fill(); } }
            else if (type === 'plasma') { for(let i=0; i<200; i++) { const opacity = Math.random() * 0.3; ctx.fillStyle = Math.random() > 0.5 ? `rgba(255, 80, 0, ${opacity})` : `rgba(30, 0, 0, ${opacity})`; ctx.beginPath(); ctx.arc(Math.random()*128, Math.random()*128, Math.random()*10 + 2, 0, Math.PI*2); ctx.fill(); } }
            return new THREE.CanvasTexture(canvas);
        }

        function init() {
            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
            camera.position.copy(targetPos);

            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            document.getElementById('canvas-container').appendChild(renderer.domElement);

            clock = new THREE.Clock();
            timelineGroup = new THREE.Group();
            scene.add(timelineGroup);

            scene.add(new THREE.AmbientLight(0x222244, 1.5));
            const pLight = new THREE.PointLight(0xffffff, 2.5); pLight.position.set(5, 5, 20); scene.add(pLight);

            createBackgroundStars();
            buildTimeline();
            
            document.addEventListener('click', () => { if(!audioCtx) initAudio(); }, { once: true });
            document.addEventListener('mousedown', onPointerDown);
            document.addEventListener('touchstart', onPointerDown, { passive: false });

            document.getElementById('soundToggle').addEventListener('click', (e) => {
                e.stopPropagation(); if (!audioCtx) { initAudio(); soundEnabled = true; } else { soundEnabled = !soundEnabled; }
                if (masterGain) masterGain.gain.value = soundEnabled ? 0.2 : 0;
                document.getElementById('speaker-icon').style.opacity = soundEnabled ? '1' : '0.3';
            });

            document.getElementById('massInput').addEventListener('input', (e) => {
                stellarMass = parseFloat(e.target.value);
                document.getElementById('massLabel').innerText = stellarMass.toFixed(1) + ' M☉';
                updateFateLabel();
                buildTimeline();
            });

            document.getElementById('backBtn').addEventListener('click', setOverviewMode);
            document.getElementById('wormholeBtn').addEventListener('click', () => {
                wormholeActive = !wormholeActive; playWhoosh(); buildTimeline();
                document.getElementById('wormholeBtn').innerText = wormholeActive ? "צא מעל-חלל" : "קפיצה לעל-חלל";
                document.getElementById('stageTitle').innerText = wormholeActive ? "גשר איינשטיין-רוזן (חור תולעת)" : "חור שחור";
            });

            window.addEventListener('resize', onWindowResize);
            animate();
        }

        function buildTimeline() {
            while(timelineGroup.children.length > 0) timelineGroup.remove(timelineGroup.children[0]);
            stagesData = [];
            arrowsData = [];

            const positions = STAGES.map((_, index) => {
                const angle = Math.PI - (index * ANGLE_STEP);
                return new THREE.Vector3(Math.cos(angle) * RADIUS, Math.sin(angle) * RADIUS * 0.4, 0);
            });

            STAGES.forEach((stage, index) => {
                const group = new THREE.Group();
                group.position.copy(positions[index]);
                timelineGroup.add(group);
                
                const obj = { group, id: stage.id, index, star: null, nebula: null, disk: null, loops: [], particles: null, wormhole: null };
                createStageVisuals(obj);
                stagesData.push(obj);

                if (index < STAGES.length - 1) {
                    const arrow = createConnectingArrow(positions[index], positions[index+1]);
                    timelineGroup.add(arrow);
                    arrowsData.push(arrow);
                }
            });
        }

        function createConnectingArrow(posA, posB) {
            const arrowGroup = new THREE.Group();
            const dir = new THREE.Vector3().subVectors(posB, posA);
            const length = dir.length();
            const shaftLen = length * 0.45;
            const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, shaftLen, 8), new THREE.MeshBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.4 }));
            const head = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.2, 8), new THREE.MeshBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.6 }));
            head.position.y = shaftLen / 2 + 0.6;
            arrowGroup.add(body); arrowGroup.add(head);
            const mid = new THREE.Vector3().addVectors(posA, posB).multiplyScalar(0.5);
            arrowGroup.position.copy(mid);
            arrowGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
            return arrowGroup;
        }

        function createStageVisuals(obj) {
            const g = obj.group;
            switch(obj.id) {
                case 'cloud': 
                    // Special emphasis for initial nebula
                    createNebula(g, 0x6366f1, 8, 1500, obj); 
                    // Add a subtle central glow to the initial cloud
                    createGlow(g, 2.5, 0x6366f1, 0.2, obj);
                    break;
                case 'protostar': 
                    createNebula(g, 0xfb923c, 3.5, 300, obj);
                    obj.star = createStar(g, 1.4, 0xff7722, true, false, false);
                    createAccretionDisk(g, 2.8, 0xffaa44, 0.4, true, obj);
                    break;
                case 'main_sequence':
                    const color = stellarMass < 2 ? 0xfde047 : (stellarMass < 10 ? 0xffffff : 0x60a5fa);
                    const size = 1 + (stellarMass * 0.08);
                    obj.star = createStar(g, size, color, false, true, false);
                    createCoronalLoops(g, size, color, obj);
                    break;
                case 'red_giant':
                    const rColor = stellarMass < 8 ? 0xef4444 : 0x991b1b;
                    const rSize = stellarMass < 8 ? 3.5 : 5;
                    obj.star = createStar(g, rSize, rColor, false, false, true); 
                    break;
                case 'death':
                    if (stellarMass < 8) { createNebula(g, 0x2dd4bf, 5, 400, obj, true); obj.star = createStar(g, 0.6, 0xffffff, false, false, false); }
                    else createExplosion(g, obj);
                    break;
                case 'remnant':
                    if (wormholeActive && stellarMass >= 20) { createTunnel(g, obj); }
                    else if (stellarMass < 8) { obj.star = createStar(g, 0.4, 0xbfdbfe, false, false, false); createNebula(g, 0x60a5fa, 4, 300, obj); }
                    else if (stellarMass < 20) { obj.star = createStar(g, 0.3, 0xffffff, false, false, false); createJets(g, 0x60a5fa, 15, obj); obj.star.userData.isPulsar = true; }
                    else createBlackHole(g, obj);
                    break;
            }
        }

        function createStar(group, r, c, proto, main, giant) {
            let mat;
            if (main) mat = new THREE.MeshStandardMaterial({ map: generateStarTexture(new THREE.Color(c).getStyle(), 'granulated'), emissive: c, emissiveIntensity: 1.2 });
            else if (giant) mat = new THREE.MeshStandardMaterial({ map: generateStarTexture(new THREE.Color(c).getStyle(), 'plasma'), emissive: c, emissiveIntensity: 1.0 });
            else mat = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: proto ? 2.0 : 0.6 });
            const s = new THREE.Mesh(new THREE.IcosahedronGeometry(r, main || giant ? 3 : 2), mat);
            if (giant) { s.userData.origPos = s.geometry.attributes.position.array.slice(); s.userData.isGiant = true; s.userData.radius = r; }
            group.add(s); return s;
        }

        function createNebula(group, color, radius, count, obj, exp = false) {
            const geo = new THREE.BufferGeometry(); const pos = [];
            for (let i = 0; i < count; i++) { const r = radius * Math.pow(Math.random(), exp ? 2 : 0.6); const t = Math.random() * Math.PI * 2, p = Math.acos((Math.random() * 2) - 1); pos.push(r * Math.sin(p) * Math.cos(t), r * Math.sin(p) * Math.sin(t), r * Math.cos(p)); }
            geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
            // Bigger points for better initial visibility
            const system = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: obj.id === 'cloud' ? 0.2 : 0.12, transparent: true, opacity: obj.id === 'cloud' ? 0.6 : 0.4, blending: THREE.AdditiveBlending }));
            system.userData = { exp }; group.add(system); obj.nebula = system;
        }

        function createAccretionDisk(group, r, c, op, layered, obj) {
            const diskGroup = new THREE.Group();
            for(let i=0; i<(layered ? 2 : 1); i++) {
                const d = new THREE.Mesh(new THREE.TorusGeometry(r + (i*0.4), 0.05, 2, 40), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op / (i+1) }));
                d.rotation.x = Math.PI / 2; d.userData = { speed: 0.02 + (i * 0.01) }; diskGroup.add(d);
            }
            group.add(diskGroup); obj.disk = diskGroup;
        }

        function createExplosion(group, obj) {
            const count = 600; const geo = new THREE.BufferGeometry(); const pos = new Float32Array(count * 3); const dirs = [];
            for(let i=0; i<count; i++) dirs.push(new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize().multiplyScalar(Math.random()*12));
            geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); 
            const system = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffaa00, size: 0.18, transparent: true, blending: THREE.AdditiveBlending }));
            system.userData = { time: 0, dirs, type: 'explosion' }; group.add(system); obj.particles = system;
        }

        function createBlackHole(group, obj) {
            group.add(new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), new THREE.MeshBasicMaterial({ color: 0x000000 })));
            const disk = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.2, 2, 40), new THREE.MeshBasicMaterial({ color: 0xff7700, wireframe: true })); disk.rotation.x = Math.PI / 2.5; group.add(disk); obj.disk = disk;
        }

        function createJets(group, color, length, obj) {
            const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
            const j1 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.6, length, 8, 1, true), mat); const j2 = j1.clone();
            j1.position.y = length/2; j2.position.y = -length/2; j2.rotation.z = Math.PI; group.add(j1, j2); obj.jets = [j1, j2];
        }

        function createCoronalLoops(group, size, color, obj) {
            for(let i=0; i<4; i++) {
                const curve = new THREE.EllipseCurve(0, 0, size*0.4, size*0.6, 0, Math.PI, false, 0); const points = curve.getPoints(10); const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const loop = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.4 })); 
                loop.rotation.x = Math.random() * Math.PI; loop.rotation.y = Math.random() * Math.PI; loop.position.set(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize().multiplyScalar(size*0.8);
                loop.userData = { phase: Math.random() * Math.PI * 2 }; group.add(loop); obj.loops.push(loop);
            }
        }

        function createTunnel(group, obj) {
            const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256; const ctx = canvas.getContext('2d'); ctx.fillStyle = '#050508'; ctx.fillRect(0, 0, 256, 256); ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 4;
            for(let i=0; i<4; i++) { ctx.beginPath(); ctx.moveTo(0, i * 64); ctx.lineTo(256, i * 64); ctx.stroke(); }
            const texture = new THREE.CanvasTexture(canvas); texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(2, 4);
            const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(2, 8, 80, 24, 10, true), new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending }));
            tunnel.rotation.x = Math.PI / 2; group.add(tunnel); obj.wormhole = tunnel;
            group.add(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })));
        }

        function createGlow(group, radius, color, opacity, obj) {
            const glow = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.BackSide }));
            group.add(glow); 
            if (obj.id === 'red_giant') obj.glow = glow;
            return glow;
        }

        // --- MODE CONTROLS ---
        function setOverviewMode() {
            currentMode = 'overview'; selectedStageIndex = -1;
            targetPos.set(0, 0, 45); lookAtTarget.set(0, 0, 0);
            document.getElementById('infoPanel').classList.remove('show');
            document.getElementById('view-label').style.transform = 'translateX(-50%) translateY(0)';
            document.getElementById('view-label').style.opacity = '1';
            playWhoosh();
        }

        function setDetailMode(index) {
            currentMode = 'detail'; selectedStageIndex = index;
            const stageObj = stagesData[index];
            const stageInfo = STAGES[index];
            targetPos.set(stageObj.group.position.x, stageObj.group.position.y, 12);
            lookAtTarget.copy(stageObj.group.position);
            document.getElementById('stageTitle').innerText = stageInfo.name;
            let d = stageInfo.desc;
            if (stageInfo.id === 'remnant') {
                if (stellarMass < 8) { document.getElementById('stageTitle').innerText = 'ננס לבן'; d = 'ליבתו החשופה של כוכב, מוקפת בערפילית פלנטרית.'; }
                else if (stellarMass < 20) { document.getElementById('stageTitle').innerText = 'כוכב נייטרונים'; d = 'כדור נייטרונים קטן המסתובב במהירות אדירה.'; }
                else { document.getElementById('stageTitle').innerText = 'חור שחור'; d = 'כוח משיכה כה חזק ששום דבר לא נמלט ממנו.'; }
            }
            document.getElementById('stageDesc').innerText = d;
            document.getElementById('infoPanel').classList.add('show');
            document.getElementById('view-label').style.transform = 'translateX(-50%) translateY(50px)';
            document.getElementById('view-label').style.opacity = '0';
            if(selectedStageIndex === 5 && stellarMass >= 20) document.getElementById('wormholeBtn').style.display = 'block';
            else document.getElementById('wormholeBtn').style.display = 'none';
            if(stageInfo.id === 'death') playBoom(); else playWhoosh();
        }

        function updateFateLabel() {
            const label = document.getElementById('fatePrediction');
            if (stellarMass < 8) label.innerText = "כוכב קטן -> ננס לבן";
            else if (stellarMass < 20) label.innerText = "כוכב מאסיבי -> כוכב נייטרונים";
            else label.innerText = "כוכב ענק -> חור שחור!";
        }

        function onPointerDown(e) {
            const x = e.clientX || (e.touches && e.touches[0].clientX);
            const y = e.clientY || (e.touches && e.touches[0].clientY);
            mouse.x = (x / window.innerWidth) * 2 - 1;
            mouse.y = -(y / window.innerHeight) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(timelineGroup.children, true);
            if (intersects.length > 0) {
                let clicked = intersects[0].object;
                while(clicked.parent !== timelineGroup) clicked = clicked.parent;
                const idx = stagesData.findIndex(s => s.group === clicked);
                if (idx !== -1 && idx !== selectedStageIndex) setDetailMode(idx);
            }
        }

        function createBackgroundStars() {
            const geometry = new THREE.BufferGeometry(); const vertices = [];
            for (let i = 0; i < 2000; i++) vertices.push(THREE.MathUtils.randFloatSpread(1000), THREE.MathUtils.randFloatSpread(1000), THREE.MathUtils.randFloatSpread(-500, 500));
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            starBackground = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xffffff, size: 0.8, transparent: true, opacity: 0.3 }));
            scene.add(starBackground);
        }

        function onWindowResize() { camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); }

        function animate() {
            requestAnimationFrame(animate);
            const delta = clock.getDelta(); const time = clock.elapsedTime;
            camera.position.lerp(targetPos, 0.1);
            camera.lookAt(lookAtTarget);

            arrowsData.forEach((arrow, i) => {
                const targetOpacity = currentMode === 'overview' ? 0.4 : 0;
                arrow.children.forEach(mesh => { mesh.material.opacity = THREE.MathUtils.lerp(mesh.material.opacity, targetOpacity, 0.1); });
                const s = 1 + Math.sin(time * 4 + i) * 0.1; arrow.scale.set(s, s, s);
            });

            stagesData.forEach(obj => {
                const isFocused = obj.index === selectedStageIndex;
                const s = isFocused ? 1.5 : (currentMode === 'overview' ? 1.0 : 0.4);
                obj.group.scale.set(THREE.MathUtils.lerp(obj.group.scale.x, s, 0.1), THREE.MathUtils.lerp(obj.group.scale.y, s, 0.1), THREE.MathUtils.lerp(obj.group.scale.z, s, 0.1));

                if (obj.nebula) obj.nebula.rotation.y += 0.002;
                if (obj.star) {
                    obj.star.rotation.y += obj.star.userData.isPulsar ? 0.3 : 0.01;
                    if (obj.star.userData.isPulsar) obj.star.rotation.z += 0.05;
                    if (obj.star.userData.isGiant) {
                        const pos = obj.star.geometry.attributes.position; const array = pos.array; const orig = obj.star.userData.origPos;
                        for (let i = 0; i < array.length; i += 3) {
                            const vx = orig[i], vy = orig[i+1], vz = orig[i+2];
                            const noise = Math.sin(vx * 1.5 + time) * Math.cos(vy * 1.5 + time * 1.2) * Math.sin(vz * 1.5 + time * 0.8);
                            const factor = 1.0 + noise * 0.15; array[i] = vx * factor; array[i+1] = vy * factor; array[i+2] = vz * factor;
                        }
                        pos.needsUpdate = true;
                    }
                }
                if (obj.particles) {
                    const pos = obj.particles.geometry.attributes.position.array; const dirs = obj.particles.userData.dirs; obj.particles.userData.time += delta;
                    if (obj.particles.userData.type === 'explosion' && obj.particles.userData.time > 3.0) {
                        obj.particles.userData.time = 0; for(let i=0; i<pos.length; i++) pos[i] = 0;
                    }
                    for(let i=0; i<dirs.length; i++) { pos[i*3] += dirs[i].x * delta; pos[i*3+1] += dirs[i].y * delta; pos[i*3+2] += dirs[i].z * delta; }
                    obj.particles.geometry.attributes.position.needsUpdate = true; obj.particles.material.opacity = Math.max(0, 1 - obj.particles.userData.time / 3);
                }
                if (obj.disk) { if(obj.disk.children) obj.disk.children.forEach(d => d.rotation.z += d.userData.speed || 0.02); else obj.disk.rotation.z += 0.02; }
                obj.loops.forEach(loop => { const scale = 1 + Math.sin(time * 3 + loop.userData.phase) * 0.15; loop.scale.set(scale, scale, scale); });
                if (obj.wormhole && obj.wormhole.material.map) { obj.wormhole.material.map.offset.y -= delta * 1.5; if(isFocused) camera.position.y += Math.sin(time * 15) * 0.015; }
                if (obj.jets) obj.jets.forEach(j => { j.scale.x = 0.8 + Math.sin(time * 10) * 0.2; j.material.opacity = 0.3 + Math.sin(time * 15) * 0.2; });
            });

            renderer.render(scene, camera);
        }
        window.onload = init;
