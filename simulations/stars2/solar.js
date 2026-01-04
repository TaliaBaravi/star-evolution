    const canvas = document.getElementById('simCanvas');
        const ctx = canvas.getContext('2d');
        const timeSlider = document.getElementById('timeSlider');
        const timeScaleDisplay = document.getElementById('timeScaleDisplay');
        const elapsedTimeDisplay = document.getElementById('elapsedTime');
        const welcomeModal = document.getElementById('welcomeModal');
        const closeModal = document.getElementById('closeModal');
        const tutorialHint = document.getElementById('tutorialHint');
        const headerUI = document.getElementById('headerUI');
        const footerUI = document.getElementById('footerUI');
        const detailUI = document.getElementById('detailUI');
        const closeDetail = document.getElementById('closeDetail');

        // State Management
        let viewState = 'SYSTEM';
        let focusedPlanet = null;
        let width, height;
        let time = 0;
        let camera = { x: 0, y: 0, zoom: 0.8 };
        let isDragging = false;
        let lastMouse = { x: 0, y: 0 };

        // Constants
        const BASE_AU = 150; 
        const SUN_RADIUS = 25;

        const planets = [
            { 
                name: "Mercury", color: "#94a3b8", radius: 4, semiMajorAxis: 0.39, eccentricity: 0.206, orbitalPeriod: 0.24, argPerihelion: 0.5,
                type: "Terrestrial", desc: "The smallest planet. It shrinks as it cools.", moons: [] 
            },
            { 
                name: "Venus", color: "#fbbf24", radius: 7, semiMajorAxis: 0.72, eccentricity: 0.007, orbitalPeriod: 0.61, argPerihelion: 1.2,
                type: "Terrestrial", desc: "A toxic world with crushing atmospheric pressure.", moons: [] 
            },
            { 
                name: "Earth", color: "#3b82f6", radius: 7.5, semiMajorAxis: 1.00, eccentricity: 0.017, orbitalPeriod: 1.00, argPerihelion: 0.0,
                type: "Terrestrial", desc: "The only known world with life. You are here!", 
                moons: [{ name: "The Moon", dist: 25, radius: 2, speed: 2.5, color: "#cbd5e1" }] 
            },
            { 
                name: "Mars", color: "#f87171", radius: 5.5, semiMajorAxis: 1.52, eccentricity: 0.093, orbitalPeriod: 1.88, argPerihelion: 2.1,
                type: "Terrestrial", desc: "The Red Planet. Home to the largest volcano.", 
                moons: [
                    { name: "Phobos", dist: 18, radius: 1.5, speed: 3.0, color: "#78716c" },
                    { name: "Deimos", dist: 24, radius: 1.0, speed: 1.5, color: "#a8a29e" }
                ] 
            },
            { 
                name: "Jupiter", color: "#fdba74", radius: 18, semiMajorAxis: 3.20, eccentricity: 0.048, orbitalPeriod: 11.86, argPerihelion: 0.8,
                type: "Gas Giant", desc: "The King of Planets. Massive and stormy.", 
                moons: [
                    { name: "Io", dist: 35, radius: 2, speed: 2.0, color: "#fde047" },
                    { name: "Europa", dist: 45, radius: 2, speed: 1.5, color: "#bfdbfe" },
                    { name: "Ganymede", dist: 60, radius: 3, speed: 1.0, color: "#9ca3af" },
                    { name: "Callisto", dist: 75, radius: 2.5, speed: 0.5, color: "#4b5563" }
                ] 
            },
            { 
                name: "Saturn", color: "#e9d5ff", radius: 15, semiMajorAxis: 4.80, eccentricity: 0.056, orbitalPeriod: 29.45, argPerihelion: 1.7,
                type: "Gas Giant", desc: "Famous for its complex icy ring system.", 
                moons: [{ name: "Titan", dist: 65, radius: 3.5, speed: 0.8, color: "#f59e0b" }] 
            },
            { 
                name: "Halley's Comet", color: "#ffffff", radius: 5, 
                semiMajorAxis: 6.5, eccentricity: 0.967, orbitalPeriod: 75.3, argPerihelion: 1.9,
                type: "Comet", desc: "A dirty snowball from the outer solar system.", moons: []
            }
        ];

        // --- View Transitions ---
        function enterDetailView(planet) {
            viewState = 'DETAIL';
            focusedPlanet = planet;
            isDragging = false;
            
            document.getElementById('detailName').innerText = planet.name;
            document.getElementById('detailType').innerText = planet.type;
            document.getElementById('detailDesc').innerText = planet.desc;
            document.getElementById('detailMoons').innerText = planet.moons.length;
            document.getElementById('detailPeriod').innerText = planet.orbitalPeriod.toFixed(2) + "y";
            
            detailUI.classList.remove('hidden');
            headerUI.classList.add('opacity-0', 'pointer-events-none');
            footerUI.classList.add('opacity-0', 'pointer-events-none');
        }

        function resize() {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
            if (width < 600) camera.zoom = 0.5;
        }

        window.addEventListener('resize', resize);
        resize();

        closeModal.addEventListener('click', () => {
            welcomeModal.classList.add('opacity-0');
            setTimeout(() => {
                welcomeModal.style.visibility = 'hidden';
                tutorialHint.classList.remove('hidden');
                tutorialHint.classList.add('flex');
            }, 500);
        });

        closeDetail.addEventListener('click', () => {
            viewState = 'SYSTEM';
            focusedPlanet = null;
            detailUI.classList.add('hidden');
            headerUI.classList.remove('opacity-0', 'pointer-events-none');
            footerUI.classList.remove('opacity-0', 'pointer-events-none');
        });

        timeSlider.addEventListener('input', () => {
            tutorialHint.classList.add('hidden');
            tutorialHint.classList.remove('flex');
        });

        // --- Interaction Listeners ---
        canvas.addEventListener('mousedown', e => {
            if(welcomeModal.style.visibility === 'visible') return;
            
            if (viewState === 'SYSTEM') {
                const rect = canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;

                const worldX = (mouseX - width / 2) / camera.zoom - camera.x;
                const worldY = (mouseY - height / 2) / camera.zoom - camera.y;

                for (let p of planets) {
                    const pos = getPlanetPosition(p, time);
                    const dist = Math.hypot(worldX - pos.x, worldY - pos.y);
                    if (dist < p.radius + 25 / camera.zoom) {
                        enterDetailView(p);
                        return;
                    }
                }
                isDragging = true;
            }
            lastMouse = { x: e.clientX, y: e.clientY };
        });

        window.addEventListener('mouseup', () => isDragging = false);
        window.addEventListener('mousemove', e => {
            if (isDragging && viewState === 'SYSTEM') {
                camera.x += (e.clientX - lastMouse.x) / camera.zoom;
                camera.y += (e.clientY - lastMouse.y) / camera.zoom;
            }
            lastMouse = { x: e.clientX, y: e.clientY };
        });

        canvas.addEventListener('wheel', e => {
            if (viewState === 'SYSTEM' && welcomeModal.style.visibility !== 'visible') {
                const factor = Math.exp(-e.deltaY * 0.001);
                camera.zoom = Math.min(Math.max(camera.zoom * factor, 0.05), 10);
            }
        });

        canvas.addEventListener('dblclick', () => {
            camera = { x: 0, y: 0, zoom: 1.0 };
        });

        // --- MOBILE TOUCH CONTROLS ---
        let initialPinchDist = null;
        let initialZoom = null;
        let lastTouchPos = { x: 0, y: 0 };

        canvas.addEventListener('touchstart', e => {
            if(welcomeModal.style.visibility === 'visible') return;

            if (e.touches.length === 1) {
                const touch = e.touches[0];
                const rect = canvas.getBoundingClientRect();
                const mouseX = touch.clientX - rect.left;
                const mouseY = touch.clientY - rect.top;

                const worldX = (mouseX - width / 2) / camera.zoom - camera.x;
                const worldY = (mouseY - height / 2) / camera.zoom - camera.y;

                if (viewState === 'SYSTEM') {
                    for (let p of planets) {
                        const pos = getPlanetPosition(p, time);
                        const dist = Math.hypot(worldX - pos.x, worldY - pos.y);
                        if (dist < p.radius + 35 / camera.zoom) {
                            enterDetailView(p);
                            return;
                        }
                    }
                }

                isDragging = true;
                lastTouchPos = { x: touch.clientX, y: touch.clientY };
            }
            else if (e.touches.length === 2) {
                e.preventDefault(); 
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                initialPinchDist = Math.hypot(dx, dy);
                initialZoom = camera.zoom;
            }
        }, { passive: false });

        canvas.addEventListener('touchmove', e => {
            if(welcomeModal.style.visibility === 'visible') return;

            if (e.touches.length === 1 && isDragging) {
                const dx = e.touches[0].clientX - lastTouchPos.x;
                const dy = e.touches[0].clientY - lastTouchPos.y;
                camera.x += dx / camera.zoom;
                camera.y += dy / camera.zoom;
                lastTouchPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
            else if (e.touches.length === 2 && initialPinchDist) {
                e.preventDefault();
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const currentDist = Math.hypot(dx, dy);
                const zoomFactor = currentDist / initialPinchDist;
                camera.zoom = initialZoom * zoomFactor;
                camera.zoom = Math.min(Math.max(camera.zoom, 0.1), 10);
            }
        }, { passive: false });

        canvas.addEventListener('touchend', () => {
            isDragging = false;
            initialPinchDist = null;
        });

        // --- Physics & Math ---
        function solveKepler(M, e) {
            let E = M;
            for (let i = 0; i < 6; i++) {
                E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
            }
            return E;
        }

        function getPlanetPosition(planet, t) {
            const M = (2 * Math.PI * t) / planet.orbitalPeriod;
            const E = solveKepler(M, planet.eccentricity);
            const r = (planet.semiMajorAxis * BASE_AU) * (1 - planet.eccentricity * Math.cos(E));
            const v = 2 * Math.atan2(
                Math.sqrt(1 + planet.eccentricity) * Math.sin(E / 2),
                Math.sqrt(1 - planet.eccentricity) * Math.cos(E / 2)
            );
            const angle = v + planet.argPerihelion;
            return { x: r * Math.cos(angle), y: r * Math.sin(angle) };
        }

        // --- Drawing Logic ---
        function drawOrbit(planet) {
            ctx.beginPath();
            ctx.strokeStyle = planet.color + "22";
            ctx.lineWidth = 1 / camera.zoom;
            const steps = planet.type === 'Comet' ? 300 : 180;
            for (let i = 0; i <= steps; i++) {
                const theta = (i / steps) * 2 * Math.PI;
                const r = (planet.semiMajorAxis * BASE_AU) * (1 - planet.eccentricity * planet.eccentricity) / 
                          (1 + planet.eccentricity * Math.cos(theta));
                const x = r * Math.cos(theta + planet.argPerihelion);
                const y = r * Math.sin(theta + planet.argPerihelion);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        function drawBody(planet, t, scale = 1, isCentered = false) {
            const pos = isCentered ? {x:0, y:0} : getPlanetPosition(planet, t);
            const r = planet.radius * scale;

            const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, r * 2.5);
            grad.addColorStop(0, planet.color + "55");
            grad.addColorStop(1, "transparent");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, r * 2.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = planet.color;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
            ctx.fill();

            if (!isCentered && camera.zoom > 0.4) {
                ctx.fillStyle = "#94a3b8";
                ctx.font = `${10 / camera.zoom}px Inter`;
                ctx.textAlign = "center";
                ctx.fillText(planet.name, pos.x, pos.y + r + 12 / camera.zoom);
            }
        }

        function drawPlanetDetail(planet, t) {
            const pScale = 6; 
            drawBody(planet, t, pScale, true);

            planet.moons.forEach(moon => {
                const angle = (t * moon.speed) + planet.argPerihelion;
                const mx = Math.cos(angle) * (moon.dist * 1.5);
                const my = Math.sin(angle) * (moon.dist * 1.5);

                ctx.beginPath();
                ctx.strokeStyle = "rgba(255,255,255,0.05)";
                ctx.arc(0, 0, moon.dist * 1.5, 0, Math.PI * 2);
                ctx.stroke();

                ctx.fillStyle = moon.color;
                ctx.beginPath();
                ctx.arc(mx, my, moon.radius * 2, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = "rgba(255,255,255,0.4)";
                ctx.font = "8px Inter";
                ctx.textAlign = "center";
                ctx.fillText(moon.name, mx, my + moon.radius * 2 + 10);
            });
        }

        function drawSun() {
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, SUN_RADIUS * 3.5);
            grad.addColorStop(0, "#fbbf24");
            grad.addColorStop(0.3, "rgba(245, 158, 11, 0.3)");
            grad.addColorStop(1, "transparent");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, SUN_RADIUS * 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#fffbeb";
            ctx.beginPath();
            ctx.arc(0, 0, SUN_RADIUS, 0, Math.PI * 2);
            ctx.fill();
        }

        function animate() {
            const timeScale = viewState === 'SYSTEM' ? parseFloat(timeSlider.value) : 1.0;
            time += (timeScale * 0.005);
            
            timeScaleDisplay.innerText = timeScale.toFixed(2) + "x";
            elapsedTimeDisplay.innerText = time.toFixed(2) + "y";

            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.fillStyle = '#05070a';
            ctx.fillRect(0, 0, width, height);

            ctx.translate(width / 2, height / 2);

            if (viewState === 'SYSTEM') {
                ctx.scale(camera.zoom, camera.zoom);
                ctx.translate(camera.x, camera.y);
                drawSun();
                planets.forEach(p => {
                    drawOrbit(p);
                    drawBody(p, time);
                });
            } else if (viewState === 'DETAIL' && focusedPlanet) {
                drawPlanetDetail(focusedPlanet, time);
            }

            requestAnimationFrame(animate);
        }

        window.onload = animate;
