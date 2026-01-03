    // --- EVOLUTION DATA ---
        const EVOLUTION_STAGES = [
            { id: 'cloud', name: 'ערפילית', desc: 'כוכבים מתחילים בעננים עצומים וקרים של גז ואבק. כוח המשיכה מתחיל למשוך את הליבה יחד.' },
            { id: 'protostar', name: 'קדם-כוכב', desc: 'הליבה מתחממת ומתגבשת. חומר מהערפילית קורס פנימה ויוצר דיסקת ספיחה לוהטת.' },
            { id: 'main_sequence', name: 'סדרה מרכזית', desc: 'היתוך גרעיני הופך את הכוכב ליציב. פני השטח מבעבעים באנרגיה ולולאות מגנטיות פורצות החוצה.' },
            { id: 'red_giant', name: 'ענק', desc: 'הדלק אוזל. השכבות החיצוניות מתרחבות בצורה מאסיבית, ופני השטח "רותחים" בזרמי אנרגיה סוערים.' },
            { id: 'death', name: 'מוות', desc: 'כוכבים בעלי מסה גבוהה מסיימים בסופרנובה; כוכבים בעלי מסה נמוכה משילים ערפילית פלנטרית.' },
            { id: 'remnant', name: 'גורל', desc: 'הכוכב הופך לננס לבן, כוכב נייטרונים או חור שחור.' }
        ];

        // --- AUDIO ENGINE ---
        let audioCtx, droneOsc, masterGain;
        let soundEnabled = false;

        function initAudio() {
            if (audioCtx) return;
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            masterGain = audioCtx.createGain();
            masterGain.connect(audioCtx.destination);
            masterGain.gain.value = 0.2;
            droneOsc = audioCtx.createOscillator();
            droneOsc.type = 'sine';
            droneOsc.frequency.setValueAtTime(55, audioCtx.currentTime); 
            const droneGain = audioCtx.createGain();
            droneGain.gain.value = 0.1;
            droneOsc.connect(droneGain);
            droneGain.connect(masterGain);
            droneOsc.start();
        }

        function playWhoosh() {
            if (!soundEnabled || !masterGain) return;
            const osc = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            osc.frequency.setValueAtTime(100, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.5);
            g.gain.setValueAtTime(0.2, audioCtx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
            osc.connect(g); g.connect(masterGain);
            osc.start(); osc.stop(audioCtx.currentTime + 0.5);
        }

        function playWarp() {
            if (!soundEnabled || !masterGain) return;
            const osc = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(40, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 2.0);
            g.gain.setValueAtTime(0.3, audioCtx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 2.0);
            osc.connect(g); g.connect(masterGain);
            osc.start(); osc.stop(audioCtx.currentTime + 2.0);
        }

        function playBoom() {
            if (!soundEnabled || !masterGain) return;
            const now = audioCtx.currentTime;
            const bufferSize = audioCtx.sampleRate * 2.5;
            const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
            const noise = audioCtx.createBufferSource();
            noise.buffer = buffer;
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(600, now);
            filter.frequency.exponentialRampToValueAtTime(40, now + 2.5);
            const noiseGain = audioCtx.createGain();
            noiseGain.gain.setValueAtTime(0.01, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.8, now + 0.05);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 2.5);
            const sub = audioCtx.createOscillator();
            const subGain = audioCtx.createGain();
            sub.type = 'sine';
            sub.frequency.setValueAtTime(100, now);
            sub.frequency.exponentialRampToValueAtTime(30, now + 0.5);
            subGain.gain.setValueAtTime(0.6, now);
            subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(masterGain);
            sub.connect(subGain); subGain.connect(masterGain);
            noise.start(now); sub.start(now); sub.stop(now + 0.5);
        }

        // --- ONBOARDING LOGIC ---
        let onboardingStep = 0; // 0: Start, 1: Timeline clicked, 2: Main Sequence reached, 3: Slider moved
        
        function positionTips() {
            // Tip 1: Timeline
            const step2 = document.querySelectorAll('.timeline-step')[1];
            if (step2 && onboardingStep === 0) {
                const rect = step2.getBoundingClientRect();
                const tip = document.getElementById('tip-timeline');
                tip.style.left = (rect.left + rect.width/2 - 100) + 'px';
                tip.style.top = (rect.top - 110) + 'px';
                tip.classList.add('show');
            }

            // Tip 2: Mass Slider (Updated to point UP from below)
            const slider = document.getElementById('massInput');
            if (slider && onboardingStep === 2) {
                const rect = slider.getBoundingClientRect();
                const tip = document.getElementById('tip-mass');
                // Place it below the slider
                tip.style.left = (rect.left + rect.width/2 - 100) + 'px';
                tip.style.top = (rect.bottom + 15) + 'px';
                // Reverse order so Arrow is above Bubble
                tip.style.flexDirection = 'column-reverse';
                // Point arrow UP
                tip.querySelector('.bouncing-arrow').style.transform = 'rotate(180deg)';
                tip.classList.add('show');
            }
        }

        function updateFateLabel() {
            const label = document.getElementById('fatePrediction');
            if (stellarMass < 8) label.innerText = "כוכב קטן -> ננס לבן";
            else if (stellarMass < 20) label.innerText = "כוכב מאסיבי -> כוכב נייטרונים";
            else label.innerText = "כוכב ענק -> חור שחור!";
        }

        // --- THREE.JS SIMULATION ---
        let scene, camera, renderer, clock, rotationGroup, starBackground;
        let starObject, particleSystem, nebulaSystem, accretionDisk, jets = [], wormhole, coronalLoops = [], stageGlow;
        let currentStageIndex = 0;
        let stellarMass = 1.0;
        let isDragging = false;
        let wormholeActive = false;
        let previousMousePosition = { x: 0, y: 0 };
        let targetRotationX = 0, targetRotationY = 0;

        function generateStarTexture(colorBase, type = 'granulated') {
            const canvas = document.createElement('canvas');
            canvas.width = 256; canvas.height = 256;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = colorBase; ctx.fillRect(0, 0, 256, 256);
            if (type === 'granulated') {
                for(let i=0; i<1000; i++) {
                    ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.2})`;
                    ctx.beginPath(); ctx.arc(Math.random()*256, Math.random()*256, Math.random()*5, 0, Math.PI*2); ctx.fill();
                }
            } else if (type === 'plasma') {
                for(let i=0; i<500; i++) {
                    const opacity = Math.random() * 0.4;
                    ctx.fillStyle = Math.random() > 0.5 ? `rgba(255, 100, 0, ${opacity})` : `rgba(50, 0, 0, ${opacity})`;
                    ctx.beginPath(); ctx.arc(Math.random()*256, Math.random()*256, Math.random()*15 + 5, 0, Math.PI*2); ctx.fill();
                }
            }
            return new THREE.CanvasTexture(canvas);
        }

        function init() {
            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
            camera.position.z = 15;
            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            document.getElementById('canvas-container').appendChild(renderer.domElement);
            clock = new THREE.Clock();
            rotationGroup = new THREE.Group();
            scene.add(rotationGroup);
            scene.add(new THREE.AmbientLight(0x222244, 1.5));
            const pLight = new THREE.PointLight(0xffffff, 2.5);
            pLight.position.set(5, 5, 5);
            scene.add(pLight);

            createBackgroundStars();
            updateStage(0);
            createTimeline();
            
            setTimeout(positionTips, 1000);

            const handleFirstInteraction = () => {
                if(!audioCtx) {
                    initAudio(); soundEnabled = true;
                    document.getElementById('hint').style.opacity = '0';
                    if (masterGain) masterGain.gain.value = 0.2;
                    document.getElementById('speaker-icon').style.opacity = '1';
                }
            };
            document.addEventListener('click', handleFirstInteraction, { once: true });
            document.addEventListener('touchstart', handleFirstInteraction, { once: true });

            document.getElementById('soundToggle').addEventListener('click', (e) => {
                e.stopPropagation();
                if (!audioCtx) { initAudio(); soundEnabled = true; document.getElementById('hint').style.opacity = '0'; }
                else { soundEnabled = !soundEnabled; }
                if (masterGain) masterGain.gain.value = soundEnabled ? 0.2 : 0;
                document.getElementById('speaker-icon').style.opacity = soundEnabled ? '1' : '0.3';
            });

            document.getElementById('massInput').addEventListener('input', (e) => {
                stellarMass = parseFloat(e.target.value);
                document.getElementById('massLabel').innerText = stellarMass.toFixed(1) + ' M☉';
                updateFateLabel();
                
                if (onboardingStep === 2) {
                    onboardingStep = 3;
                    document.getElementById('tip-mass').classList.remove('show');
                }

                if([5, 2, 1, 3].includes(currentStageIndex)) {
                    wormholeActive = false;
                    updateStage(currentStageIndex);
                    checkWormholeButton();
                }
            });

            document.getElementById('wormholeBtn').addEventListener('click', () => {
                wormholeActive = !wormholeActive;
                playWarp(); updateStage(5);
                const btn = document.getElementById('wormholeBtn');
                btn.innerText = wormholeActive ? "צא מעל-חלל" : "קפיצה לעל-חלל";
                btn.classList.toggle('active-state', wormholeActive);
                document.getElementById('stageTitle').innerText = wormholeActive ? "גשר איינשטיין-רוזן (חור תולעת)" : "חור שחור";
            });

            window.addEventListener('resize', onWindowResize);
            const container = document.getElementById('canvas-container');
            container.addEventListener('touchstart', (e) => {
                isDragging = true; previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }, { passive: true });
            window.addEventListener('touchend', () => isDragging = false);
            window.addEventListener('touchmove', (e) => {
                if (!isDragging) return;
                const deltaMove = { x: e.touches[0].clientX - previousMousePosition.x, y: e.touches[0].clientY - previousMousePosition.y };
                targetRotationY += deltaMove.x * 0.01; targetRotationX += deltaMove.y * 0.01;
                previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }, { passive: false });

            animate();
        }

        function createBackgroundStars() {
            const geometry = new THREE.BufferGeometry();
            const vertices = [];
            for (let i = 0; i < 2000; i++) vertices.push(THREE.MathUtils.randFloatSpread(1000), THREE.MathUtils.randFloatSpread(1000), THREE.MathUtils.randFloatSpread(1000));
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            starBackground = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xffffff, size: 0.8, transparent: true, opacity: 0.4 }));
            scene.add(starBackground);
        }

        function createTimeline() {
            const timeline = document.getElementById('timeline');
            timeline.innerHTML = '';
            EVOLUTION_STAGES.forEach((stage, index) => {
                const step = document.createElement('div');
                step.className = 'timeline-step' + (index === 0 ? ' active' : '');
                step.innerHTML = `<span class="timeline-label">${stage.name}</span>`;
                step.onclick = (e) => { e.stopPropagation(); goToStage(index); };
                timeline.appendChild(step);
            });
        }

        function checkWormholeButton() {
            const btn = document.getElementById('wormholeBtn');
            const shouldShow = (currentStageIndex === 5 && stellarMass >= 20);
            btn.style.display = shouldShow ? 'block' : 'none';
            if (shouldShow && !wormholeActive) btn.classList.add('pulse-active');
            else btn.classList.remove('pulse-active');
        }

        function goToStage(index) {
            if (onboardingStep === 0) {
                onboardingStep = 1;
                document.getElementById('tip-timeline').classList.remove('show');
            }
            if (onboardingStep === 1 && index === 2) {
                onboardingStep = 2;
                setTimeout(positionTips, 500);
            }

            currentStageIndex = index;
            const stage = EVOLUTION_STAGES[index];
            document.querySelectorAll('.timeline-step').forEach((step, idx) => step.classList.toggle('active', idx === index));
            document.getElementById('stageTitle').innerText = stage.name;
            let finalDesc = stage.desc;
            if (stage.id === 'remnant') {
                if (stellarMass < 8) { document.getElementById('stageTitle').innerText = 'ננס לבן'; finalDesc = 'ליבתו החשופה של כוכב, מוקפת בקליפת גז של ערפילית פלנטרית.'; }
                else if (stellarMass < 20) { document.getElementById('stageTitle').innerText = 'כוכב נייטרונים'; finalDesc = 'כדור נייטרונים קטן המסתובב במהירות אדירה.'; }
                else { document.getElementById('stageTitle').innerText = 'חור שחור'; finalDesc = 'כוח משיכה כה חזק ששום דבר לא נמלט ממנו.'; }
            }
            document.getElementById('stageDesc').innerText = finalDesc;
            if(stage.id === 'death') playBoom(); else playWhoosh();
            wormholeActive = false; checkWormholeButton(); updateStage(index);
        }

        function updateStage(index) {
            while(rotationGroup.children.length > 0) rotationGroup.remove(rotationGroup.children[0]);
            const stage = EVOLUTION_STAGES[index];
            starObject = null; particleSystem = null; nebulaSystem = null; accretionDisk = null; jets = []; wormhole = null; coronalLoops = []; stageGlow = null;
            starBackground.visible = !wormholeActive;
            if (wormholeActive && index === 5) { createForwardTunnel(); return; }
            switch(stage.id) {
                case 'cloud': createNebula(0x6366f1, 8, 2000); break;
                case 'protostar': createNebula(0xfb923c, 6, 1500); createStar(1.8, 0xff7722, true, true); createAccretionDisk(3.5, 0xffaa44, 0.4, true); createInfallingMatter(0xffaa44, 4); break;
                case 'main_sequence':
                    const color = stellarMass < 2 ? 0xfde047 : (stellarMass < 10 ? 0xffffff : 0x60a5fa);
                    const size = 1 + (stellarMass * 0.1);
                    createStar(size, color, false, false, true); createGlow(size * 1.5, color, 0.4); createGlow(size * 2.2, color, 0.15); createCoronalLoops(size, color);
                    break;
                case 'red_giant': const rColor = stellarMass < 8 ? 0xef4444 : 0x991b1b; const rSize = stellarMass < 8 ? 4 : 6; createStar(rSize, rColor, false, false, false, true); stageGlow = createGlow(rSize * 1.3, rColor, 0.5); break;
                case 'death': if (stellarMass < 8) { createNebula(0x2dd4bf, 8, 3000, true); createStar(0.6, 0xffffff, false); } else createExplosion(); break;
                case 'remnant': if (stellarMass < 8) { createStar(0.4, 0xbfdbfe, false); createNebula(0x60a5fa, 6, 1000, false); createGlow(1.2, 0x60a5fa, 0.2); } else if (stellarMass < 20) { createStar(0.3, 0xffffff, false); createJets(0x60a5fa, 20); starObject.userData = { isPulsar: true }; } else createBlackHole(); break;
            }
        }

        function createStar(radius, color, isLowPoly, isProto = false, isMain = false, isGiant = false) {
            let mat;
            if (isMain) mat = new THREE.MeshStandardMaterial({ map: generateStarTexture(new THREE.Color(color).getStyle(), 'granulated'), emissive: color, emissiveIntensity: 1.2 });
            else if (isGiant) mat = new THREE.MeshStandardMaterial({ map: generateStarTexture(new THREE.Color(color).getStyle(), 'plasma'), emissive: color, emissiveIntensity: 1.0 });
            else mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: isProto ? 2.5 : 0.6 });
            starObject = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, isMain || isGiant ? 4 : (isLowPoly ? 1 : 2)), mat);
            if (isGiant) { starObject.userData.origPos = starObject.geometry.attributes.position.array.slice(); starObject.userData.isGiant = true; starObject.userData.radius = radius; }
            rotationGroup.add(starObject);
        }

        function createGlow(radius, color, opacity = 0.3) {
            const glow = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.BackSide }));
            rotationGroup.add(glow); return glow;
        }

        function createAccretionDisk(radius, color, opacity, layered = false) {
            accretionDisk = new THREE.Group();
            for(let i=0; i<(layered ? 3 : 1); i++) {
                const d = new THREE.Mesh(new THREE.TorusGeometry(radius + (i*0.3), 0.05 + (i*0.05), 2, 60), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: opacity / (i+1) }));
                d.rotation.x = Math.PI / 2 + (Math.random() * 0.1); d.userData = { speed: 0.02 + (i * 0.01) }; accretionDisk.add(d);
            }
            rotationGroup.add(accretionDisk);
        }

        function createInfallingMatter(color, radius) {
            const geo = new THREE.BufferGeometry(); const count = 500; const pos = new Float32Array(count * 3);
            for(let i=0; i<count; i++) { const r = radius + Math.random() * 5; const t = Math.random()*Math.PI*2, p = Math.random()*Math.PI; pos[i*3] = r*Math.sin(p)*Math.cos(t); pos[i*3+1] = r*Math.sin(p)*Math.sin(t); pos[i*3+2] = r*Math.cos(p); }
            geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); particleSystem = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.05, transparent: true, opacity: 0.8 }));
            particleSystem.userData = { type: 'infall', radius }; rotationGroup.add(particleSystem);
        }

        function createNebula(color, radius, count, exp = false) {
            const geo = new THREE.BufferGeometry(); const pos = [];
            for (let i = 0; i < count; i++) { const r = radius * Math.pow(Math.random(), exp ? 2 : 0.6); const t = Math.random() * Math.PI * 2, p = Math.acos((Math.random() * 2) - 1); pos.push(r * Math.sin(p) * Math.cos(t), r * Math.sin(p) * Math.sin(t), r * Math.cos(p)); }
            geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); nebulaSystem = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.1, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending }));
            nebulaSystem.userData = { exp }; rotationGroup.add(nebulaSystem);
        }

        function createExplosion() {
            const count = 3000; const geo = new THREE.BufferGeometry(); const pos = new Float32Array(count * 3); const dirs = [];
            for(let i=0; i<count; i++) dirs.push(new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize().multiplyScalar(Math.random()*12));
            geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); particleSystem = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffaa00, size: 0.15, transparent: true, blending: THREE.AdditiveBlending }));
            particleSystem.userData = { time: 0, dirs, type: 'explosion' }; rotationGroup.add(particleSystem);
        }

        function createBlackHole() {
            starObject = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), new THREE.MeshBasicMaterial({ color: 0x000000 })); rotationGroup.add(starObject);
            accretionDisk = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.2, 2, 50), new THREE.MeshBasicMaterial({ color: 0xff7700, wireframe: true })); accretionDisk.rotation.x = Math.PI / 2.5; rotationGroup.add(accretionDisk);
        }

        function createJets(color, length) {
            const jetMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
            const j1 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.8, length, 12, 1, true), jetMat); const j2 = j1.clone();
            j1.position.y = length/2; j2.position.y = -length/2; j2.rotation.z = Math.PI; jets.push(j1, j2); rotationGroup.add(j1, j2);
        }

        function createCoronalLoops(size, color) {
            for(let i=0; i<8; i++) {
                const curve = new THREE.EllipseCurve(0, 0, size*0.4, size*0.6, 0, Math.PI, false, 0); const points = curve.getPoints(20); const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const loop = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 })); loop.rotation.x = Math.random() * Math.PI; loop.rotation.y = Math.random() * Math.PI; loop.position.set(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize().multiplyScalar(size*0.8);
                loop.userData = { phase: Math.random() * Math.PI * 2 }; coronalLoops.push(loop); rotationGroup.add(loop);
            }
        }

        function createForwardTunnel() {
            const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512; const ctx = canvas.getContext('2d'); ctx.fillStyle = '#050508'; ctx.fillRect(0, 0, 512, 512); ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 4;
            for(let i=0; i<8; i++) { ctx.beginPath(); ctx.moveTo(0, i * 64); ctx.lineTo(512, i * 64); ctx.stroke(); }
            const texture = new THREE.CanvasTexture(canvas); texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(2, 4);
            wormhole = new THREE.Mesh(new THREE.CylinderGeometry(2, 10, 100, 32, 20, true), new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending }));
            wormhole.rotation.x = Math.PI / 2; rotationGroup.add(wormhole); rotationGroup.add(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })));
        }

        function onWindowResize() { camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); positionTips(); }

        function animate() {
            requestAnimationFrame(animate);
            const delta = clock.getDelta(); const time = clock.elapsedTime;
            rotationGroup.rotation.y += (targetRotationY - rotationGroup.rotation.y) * 0.1;
            rotationGroup.rotation.x += (targetRotationX - rotationGroup.rotation.x) * 0.1;
            if (nebulaSystem) { nebulaSystem.rotation.y += 0.001; if (nebulaSystem.userData.exp) { const pos = nebulaSystem.geometry.attributes.position.array; for(let i=0; i<pos.length; i++) pos[i] *= 1.008; nebulaSystem.geometry.attributes.position.needsUpdate = true; nebulaSystem.material.opacity *= 0.995; } }
            if (starObject) { starObject.rotation.y += starObject.userData.isPulsar ? 0.3 : 0.005; if (starObject.userData.isPulsar) starObject.rotation.z += 0.05; if (currentStageIndex === 2) starObject.scale.setScalar(1 + Math.sin(time * 2) * 0.01); if (starObject.userData.isGiant) { const position = starObject.geometry.attributes.position; const array = position.array; const orig = starObject.userData.origPos; for (let i = 0; i < array.length; i += 3) { const vx = orig[i], vy = orig[i+1], vz = orig[i+2]; const noise = Math.sin(vx * 1.5 + time) * Math.cos(vy * 1.5 + time * 1.2) * Math.sin(vz * 1.5 + time * 0.8); const factor = 1.0 + noise * 0.12; array[i] = vx * factor; array[i+1] = vy * factor; array[i+2] = vz * factor; } position.needsUpdate = true; } }
            if (stageGlow && currentStageIndex === 3) { stageGlow.scale.setScalar(1 + Math.sin(time * 0.5) * 0.05); stageGlow.material.opacity = 0.4 + Math.sin(time * 0.8) * 0.1; }
            if (particleSystem) { const pos = particleSystem.geometry.attributes.position.array; if (particleSystem.userData.type === 'infall') { for(let i=0; i<pos.length/3; i++) { const v = new THREE.Vector3(pos[i*3], pos[i*3+1], pos[i*3+2]); v.multiplyScalar(0.98); if (v.length() < 1.5) v.setLength(5 + Math.random()*2); pos[i*3] = v.x; pos[i*3+1] = v.y; pos[i*3+2] = v.z; } } else { const dirs = particleSystem.userData.dirs; particleSystem.userData.time += delta; for(let i=0; i<dirs.length; i++) { pos[i*3] += dirs[i].x * delta; pos[i*3+1] += dirs[i].y * delta; pos[i*3+2] += dirs[i].z * delta; } particleSystem.material.opacity = Math.max(0, 1 - particleSystem.userData.time / 4); } particleSystem.geometry.attributes.position.needsUpdate = true; }
            if (accretionDisk && accretionDisk.children) accretionDisk.children.forEach(d => { d.rotation.z += d.userData.speed || 0.02; }); else if (accretionDisk) accretionDisk.rotation.z += 0.02;
            coronalLoops.forEach(loop => { const s = 1 + Math.sin(time * 3 + loop.userData.phase) * 0.1; loop.scale.set(s, s, s); });
            if (wormhole && wormhole.material.map) { wormhole.material.map.offset.y -= delta * 2.0; camera.position.x = Math.sin(time * 20) * 0.02; camera.position.y = Math.cos(time * 20) * 0.02; } else { camera.position.x = 0; camera.position.y = 0; }
            jets.forEach(jet => { jet.scale.x = 0.8 + Math.sin(time * 10) * 0.2; jet.material.opacity = 0.3 + Math.sin(time * 15) * 0.2; });
            renderer.render(scene, camera);
        }
        window.onload = init;
