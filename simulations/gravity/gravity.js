    const canvas = document.getElementById('simCanvas');
        const ctx = canvas.getContext('2d');
        
        const envSelect = document.getElementById('env-select');
        const objSelect = document.getElementById('obj-select');
        const comparisonToggle = document.getElementById('comparison-toggle');
        const dropBtn = document.getElementById('drop-btn');
        const resetBtn = document.getElementById('reset-btn');
        
        const statTime = document.getElementById('stat-time');
        const statVel = document.getElementById('stat-vel');
        const statAcc = document.getElementById('stat-acc');
        const statHeight = document.getElementById('stat-height');
        
        const mStatTime = document.getElementById('m-stat-time');
        const mStatVel = document.getElementById('m-stat-vel');

        const PIXELS_PER_METER = 100; 
        let lastTime = 0;
        let isRunning = false;
        let particles = [];

        const themes = {
            earth: { sky: ['#87CEEB', '#E0F2FE'], ground: '#22c55e', groundLine: '#16a34a', particle: '#86efac' },
            moon: { sky: ['#000000', '#0f172a'], ground: '#94a3b8', groundLine: '#64748b', particle: '#cbd5e1' },
            jupiter: { sky: ['#A52A2A', '#F4A460'], ground: '#451a03', groundLine: '#270e01', particle: '#d97706' }
        };

        let params = { g: 9.81, rho: 1.225, mass: 1.0, area: 0.01, cd: 0.47, type: 'lead', theme: themes.earth };
        let objectA = { y: 0, v: 0, a: 0, t: 0, landed: false, useDrag: true };
        let objectB = { y: 0, v: 0, a: 0, t: 0, landed: false, useDrag: false };

        function updateEnvironment() {
            const env = envSelect.value;
            params.theme = themes[env];
            
            if (env === 'earth') { params.g = 9.81; params.rho = 1.225; }
            else if (env === 'moon') { params.g = 1.62; params.rho = 0; }
            else if (env === 'jupiter') { params.g = 24.79; params.rho = 0.5; }

            const obj = objSelect.value;
            params.type = obj;
            if (obj === 'lead') { params.mass = 5.0; params.area = 0.005; params.cd = 0.47; }
            else if (obj === 'feather') { params.mass = 0.005; params.area = 0.12; params.cd = 1.2; }
            else { params.mass = 0.058; params.area = 0.004; params.cd = 0.5; }

            document.getElementById('comparison-labels').classList.toggle('hidden', !comparisonToggle.checked);
        }

        function createImpact(x, velocity) {
            const count = Math.min(Math.abs(velocity) * 2, 30);
            for (let i = 0; i < count; i++) {
                particles.push({
                    x: x,
                    y: canvas.height - 40,
                    vx: (Math.random() - 0.5) * velocity * 0.4,
                    vy: -Math.random() * velocity * 0.25,
                    life: 1.0,
                    color: params.theme.particle
                });
            }
        }

        function initSim() {
            updateEnvironment();
            const startY = 60;
            objectA = { y: startY, v: 0, a: 0, t: 0, landed: false, useDrag: true };
            objectB = { y: startY, v: 0, a: 0, t: 0, landed: false, useDrag: false };
            particles = [];
            isRunning = false;
            render();
        }

        function drawBackground() {
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, params.theme.sky[0]);
            gradient.addColorStop(0.8, params.theme.sky[1]);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Ground
            ctx.fillStyle = params.theme.ground;
            ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
            ctx.strokeStyle = params.theme.groundLine;
            ctx.lineWidth = 3;
            ctx.strokeRect(-5, canvas.height - 40, canvas.width + 10, 4);
        }

        function drawLeadBall(x, y) {
            const radius = window.innerWidth < 768 ? 10 : 15;
            const grad = ctx.createRadialGradient(x - 3, y - 3, 2, x, y, radius);
            grad.addColorStop(0, '#e2e8f0');
            grad.addColorStop(1, '#1e293b');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        function drawFeather(x, y, velocity) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(Math.sin(Date.now() / 200) * 0.15); 
            const scale = window.innerWidth < 768 ? 0.7 : 1;
            ctx.scale(scale, scale);
            
            ctx.beginPath();
            ctx.ellipse(0, 0, 8, 25, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(0, -25);
            ctx.lineTo(0, 30);
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
        }

        function drawTennisBall(x, y) {
            const radius = window.innerWidth < 768 ? 8 : 12;
            ctx.fillStyle = '#bef264';
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x - (radius*1.2), y, radius*1.2, -0.5, 0.5);
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        function drawSprite(obj, x) {
            if (params.type === 'lead') drawLeadBall(x, obj.y);
            else if (params.type === 'feather') drawFeather(x, obj.y, obj.v);
            else drawTennisBall(x, obj.y);
        }

        function calculatePhysics(obj, dt) {
            if (obj.landed) return;

            const Fg = params.mass * params.g;
            let Fd = 0;
            if (obj.useDrag) {
                Fd = 0.5 * params.rho * Math.pow(obj.v, 2) * params.cd * params.area;
            }

            const Fnet = Fg - Fd;
            obj.a = Fnet / params.mass;
            obj.v += obj.a * dt;
            obj.y += (obj.v * PIXELS_PER_METER) * dt;
            obj.t += dt;

            const offset = window.innerWidth < 768 ? 10 : 15;
            const groundY = canvas.height - 40 - offset;
            if (obj.y >= groundY) {
                createImpact(canvas.width * (obj.useDrag ? (comparisonToggle.checked ? 0.25 : 0.5) : 0.75), obj.v);
                obj.y = groundY;
                obj.landed = true;
            }
        }

        function updateParticles() {
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.5;
                p.life -= 0.025;
                if (p.life <= 0) particles.splice(i, 1);
                else {
                    ctx.globalAlpha = p.life;
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.globalAlpha = 1;
        }

        function render(time = 0) {
            const dt = Math.min((time - lastTime) / 1000, 0.032);
            lastTime = time;

            if (isRunning) {
                calculatePhysics(objectA, dt);
                if (comparisonToggle.checked) calculatePhysics(objectB, dt);
            }

            drawBackground();
            updateParticles();

            if (comparisonToggle.checked) {
                drawSprite(objectA, canvas.width * 0.25);
                drawSprite(objectB, canvas.width * 0.75);
            } else {
                drawSprite(objectA, canvas.width * 0.5);
            }

            // Update stats (Desktop and Mobile)
            const timeStr = objectA.t.toFixed(2);
            const velStr = Math.abs(objectA.v).toFixed(2);
            
            statTime.textContent = timeStr;
            statVel.textContent = velStr;
            statAcc.textContent = objectA.a.toFixed(2);
            statHeight.textContent = Math.max(0, (canvas.height - 55 - objectA.y) / PIXELS_PER_METER).toFixed(2);
            
            mStatTime.textContent = timeStr;
            mStatVel.textContent = velStr;

            if (isRunning || particles.length > 0) requestAnimationFrame(render);
        }

        dropBtn.addEventListener('click', () => {
            if (objectA.landed) initSim();
            isRunning = true;
            lastTime = performance.now();
            requestAnimationFrame(render);
        });

        resetBtn.addEventListener('click', initSim);
        envSelect.addEventListener('change', initSim);
        objSelect.addEventListener('change', initSim);
        comparisonToggle.addEventListener('change', initSim);

        const resize = () => {
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = canvas.parentElement.clientHeight;
            initSim();
        };

        window.addEventListener('resize', resize);
        window.onload = resize;
