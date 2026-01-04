    const canvas = document.getElementById('simCanvas');
        const ctx = canvas.getContext('2d');
        const timeSlider = document.getElementById('timeSlider');
        const timeScaleDisplay = document.getElementById('timeScaleDisplay');
        const elapsedTimeDisplay = document.getElementById('elapsedTime');
        const welcomeModal = document.getElementById('welcomeModal');
        const closeModal = document.getElementById('closeModal');
        const headerUI = document.getElementById('headerUI');
        const footerUI = document.getElementById('footerUI');
        const detailUI = document.getElementById('detailUI');
        const closeDetail = document.getElementById('closeDetail');
        
        const tutorialUI = document.getElementById('tutorialUI');
        const tutorialText = document.getElementById('tutorialText');
        const tutorialNext = document.getElementById('tutorialNext');
        const sliderArrow = document.getElementById('sliderArrow');

        // State Management
        let viewState = 'START'; // 'START', 'TUTORIAL', 'SYSTEM', 'DETAIL'
        let tutorialStep = 0;
        let focusedPlanet = null;
        let width, height;
        let time = 0;
        let camera = { x: 0, y: 0, zoom: 0.8 };
        let targetCamera = { x: 0, y: 0, zoom: 0.8 };
        let isDragging = false;
        let lastMouse = { x: 0, y: 0 };

        const BASE_AU = 150; 
        const SUN_RADIUS = 25;

        const planets = [
            { 
                name: "מרקורי", color: "#94a3b8", radius: 4, semiMajorAxis: 0.39, eccentricity: 0.206, orbitalPeriod: 0.24, argPerihelion: 0.5,
                type: "סלעי", desc: "הכוכב הקטן ביותר. הוא מתכווץ ככל שהוא מתקרר.", moons: [] 
            },
            { 
                name: "נוגה", color: "#fbbf24", radius: 7, semiMajorAxis: 0.72, eccentricity: 0.007, orbitalPeriod: 0.61, argPerihelion: 1.2,
                type: "סלעי", desc: "עולם רעיל עם לחץ אטמוספרי עצום.", moons: [] 
            },
            { 
                name: "כדור הארץ", color: "#3b82f6", radius: 7.5, semiMajorAxis: 1.00, eccentricity: 0.017, orbitalPeriod: 1.00, argPerihelion: 0.0,
                type: "סלעי", desc: "העולם היחיד המוכר עם חיים. אתם כאן!", 
                moons: [{ name: "הירח", dist: 25, radius: 2, speed: 2.5, color: "#cbd5e1" }] 
            },
            { 
                name: "מאדים", color: "#f87171", radius: 5.5, semiMajorAxis: 1.52, eccentricity: 0.093, orbitalPeriod: 1.88, argPerihelion: 2.1,
                type: "סלעי", desc: "הכוכב האדום. ביתו של הר הגעש הגדול ביותר.", 
                moons: [
                    { name: "פובוס", dist: 18, radius: 1.5, speed: 3.0, color: "#78716c" },
                    { name: "דיימוס", dist: 24, radius: 1.0, speed: 1.5, color: "#a8a29e" }
                ] 
            },
            { 
                name: "צדק", color: "#fdba74", radius: 18, semiMajorAxis: 3.20, eccentricity: 0.048, orbitalPeriod: 11.86, argPerihelion: 0.8,
                type: "ענק גזים", desc: "מלך הכוכבים. מאסיבי וסוער במיוחד.", 
                moons: [
                    { name: "איו", dist: 35, radius: 2, speed: 2.0, color: "#fde047" },
                    { name: "אירופה", dist: 45, radius: 2, speed: 1.5, color: "#bfdbfe" },
                    { name: "גנימד", dist: 60, radius: 3, speed: 1.0, color: "#9ca3af" },
                    { name: "קליסטו", dist: 75, radius: 2.5, speed: 0.5, color: "#4b5563" }
                ] 
            },
            { 
                name: "שבתאי", color: "#e9d5ff", radius: 15, semiMajorAxis: 4.80, eccentricity: 0.056, orbitalPeriod: 29.45, argPerihelion: 1.7,
                type: "ענק גזים", desc: "מפורסם בזכות מערכת הטבעות שלו.", 
                moons: [{ name: "טיטאן", dist: 65, radius: 3.5, speed: 0.8, color: "#f59e0b" }] 
            },
            { 
                name: "השביט האלי", color: "#ffffff", radius: 5, 
                semiMajorAxis: 6.5, eccentricity: 0.967, orbitalPeriod: 75.3, argPerihelion: 1.9,
                type: "שביט", desc: "כדור שלג מלוכלך שמבקר אותנו פעם ב-75 שנה.", moons: []
            }
        ];

        function resize() {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
            if (width < 600) targetCamera.zoom = 0.5;
        }

        window.addEventListener('resize', resize);
        resize();

        // סיור מודרך - לוגיקה
        const tutorialSteps = [
            {
                text: "ברוכים הבאים למערכת השמש! גררו את המחוון למטה כדי להאיץ את הזמן.",
                cam: { x: 0, y: 0, zoom: 0.5 },
                showSliderArrow: true
            },
            {
                text: "אלו הם כוכבי הלכת הסלעיים (הפנימיים). הם עשויים מסלע ומתכת מוצקים.",
                cam: { x: 0, y: 0, zoom: 1.2 },
                showSliderArrow: false
            },
            {
                text: "רחוק יותר נמצאים ענקי הגזים. הם עצומים ועשויים בעיקר ממימן והליום.",
                cam: { x: 0, y: 0, zoom: 0.4 },
                showSliderArrow: false
            },
            {
                text: "שימו לב לשביטים! 'כדורי השלג המלוכלכים' הללו נעים במסלולים אליפטיים קיצוניים.",
                cam: { x: 0, y: 0, zoom: 0.25 },
                showSliderArrow: false
            }
        ];

        function updateTutorial() {
            const step = tutorialSteps[tutorialStep];
            if (!step) {
                endTutorial();
                return;
            }
            tutorialText.innerText = step.text;
            targetCamera = { ...step.cam };
            if (step.showSliderArrow) sliderArrow.classList.remove('hidden');
            else sliderArrow.classList.add('hidden');
        }

        function endTutorial() {
            viewState = 'SYSTEM';
            tutorialUI.classList.add('hidden');
            sliderArrow.classList.add('hidden');
            tutorialStep = 0;
            targetCamera = { x: 0, y: 0, zoom: 0.5 };
        }

        closeModal.addEventListener('click', () => {
            welcomeModal.classList.add('opacity-0');
            welcomeModal.style.pointerEvents = 'none';
            setTimeout(() => {
                welcomeModal.style.visibility = 'hidden';
                viewState = 'TUTORIAL';
                tutorialUI.classList.remove('hidden');
                updateTutorial();
            }, 500);
        });

        tutorialNext.addEventListener('click', () => {
            tutorialStep++;
            updateTutorial();
        });

        closeDetail.addEventListener('click', () => {
            viewState = 'SYSTEM';
            focusedPlanet = null;
            detailUI.classList.add('hidden');
            headerUI.classList.remove('opacity-0', 'pointer-events-none');
            footerUI.classList.remove('opacity-0', 'pointer-events-none');
        });

        // --- Interaction Listeners ---
        canvas.addEventListener('mousedown', e => {
            if (viewState === 'START' || viewState === 'TUTORIAL') return;
            
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

        function enterDetailView(planet) {
            viewState = 'DETAIL';
            focusedPlanet = planet;
            isDragging = false;
            
            document.getElementById('detailName').innerText = planet.name;
            document.getElementById('detailType').innerText = planet.type;
            document.getElementById('detailDesc').innerText = planet.desc;
            document.getElementById('detailMoons').innerText = planet.moons.length;
            document.getElementById('detailPeriod').innerText = planet.orbitalPeriod.toFixed(2) + " שנה";
            
            detailUI.classList.remove('hidden');
            headerUI.classList.add('opacity-0', 'pointer-events-none');
            footerUI.classList.add('opacity-0', 'pointer-events-none');
        }

        window.addEventListener('mouseup', () => isDragging = false);
        window.addEventListener('mousemove', e => {
            if (isDragging && viewState === 'SYSTEM') {
                camera.x += (e.clientX - lastMouse.x) / camera.zoom;
                camera.y += (e.clientY - lastMouse.y) / camera.zoom;
                targetCamera.x = camera.x;
                targetCamera.y = camera.y;
            }
            lastMouse = { x: e.clientX, y: e.clientY };
        });

        canvas.addEventListener('wheel', e => {
            if (viewState === 'SYSTEM' && welcomeModal.style.visibility !== 'visible') {
                const factor = Math.exp(-e.deltaY * 0.001);
                targetCamera.zoom = Math.min(Math.max(targetCamera.zoom * factor, 0.05), 10);
            }
        });

        // --- MOBILE TOUCH CONTROLS ---
        let initialPinchDist = null;
        let initialZoom = null;
        let lastTouchPos = { x: 0, y: 0 };

        canvas.addEventListener('touchstart', e => {
            if(viewState === 'START' || viewState === 'TUTORIAL') return;

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
                initialZoom = targetCamera.zoom;
            }
        }, { passive: false });

        canvas.addEventListener('touchmove', e => {
            if(viewState === 'START' || viewState === 'TUTORIAL') return;

            if (e.touches.length === 1 && isDragging) {
                const dx = e.touches[0].clientX - lastTouchPos.x;
                const dy = e.touches[0].clientY - lastTouchPos.y;
                camera.x += dx / camera.zoom;
                camera.y += dy / camera.zoom;
                targetCamera.x = camera.x;
                targetCamera.y = camera.y;
                lastTouchPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
            else if (e.touches.length === 2 && initialPinchDist) {
                e.preventDefault();
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const currentDist = Math.hypot(dx, dy);
                const zoomFactor = currentDist / initialPinchDist;
                targetCamera.zoom = initialZoom * zoomFactor;
                targetCamera.zoom = Math.min(Math.max(targetCamera.zoom, 0.1), 10);
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
            const steps = planet.type === 'שביט' ? 300 : 180;
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
            const pScale = 12; 
            drawBody(planet, t, pScale, true);

            planet.moons.forEach(moon => {
                const angle = (t * moon.speed) + planet.argPerihelion;
                const mx = Math.cos(angle) * (moon.dist * 3.5);
                const my = Math.sin(angle) * (moon.dist * 3.5);

                ctx.beginPath();
                ctx.strokeStyle = "rgba(255,255,255,0.05)";
                ctx.arc(0, 0, moon.dist * 3.5, 0, Math.PI * 2);
                ctx.stroke();

                ctx.fillStyle = moon.color;
                ctx.beginPath();
                ctx.arc(mx, my, moon.radius * 2.5, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = "rgba(255,255,255,0.4)";
                ctx.font = "9px Inter";
                ctx.textAlign = "center";
                ctx.fillText(moon.name, mx, my + moon.radius * 2.5 + 12);
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
            const timeScale = viewState === 'DETAIL' ? 1.0 : parseFloat(timeSlider.value);
            time += (timeScale * 0.005);
            
            // מצלמה - אנימציית Lerp
            camera.x += (targetCamera.x - camera.x) * 0.05;
            camera.y += (targetCamera.y - camera.y) * 0.05;
            camera.zoom += (targetCamera.zoom - camera.zoom) * 0.05;

            timeScaleDisplay.innerText = timeScale.toFixed(2) + "x";
            elapsedTimeDisplay.innerText = time.toFixed(2) + "y";

            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.fillStyle = '#05070a';
            ctx.fillRect(0, 0, width, height);

            ctx.translate(width / 2, height / 2);

            if (viewState === 'SYSTEM' || viewState === 'TUTORIAL' || viewState === 'START') {
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
