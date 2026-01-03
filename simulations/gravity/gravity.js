    const PLANETS = {
            earth: { 
                name: "כדור הארץ", g: 9.81, rho: 1.225, 
                bgColor: 0x1a4a8a, fogColor: 0x0a192f, 
                groundColor: 0x1a3a5a, gridColor: 0x3b82f6,
                starSpeed: 0.2, starColor: 0xffffff,
                surfaceType: 'earth'
            },
            moon: { 
                name: "הירח", g: 1.62, rho: 0.0, 
                bgColor: 0x000000, fogColor: 0x000000, 
                groundColor: 0x222222, gridColor: 0x444444,
                starSpeed: 0.05, starColor: 0xcccccc,
                surfaceType: 'moon'
            },
            jupiter: { 
                name: "צדק", g: 24.79, rho: 5.0, 
                bgColor: 0x2d1a0a, fogColor: 0x2d1a0a, 
                groundColor: 0x4d3215, gridColor: 0xf59e0b,
                starSpeed: 0.8, starColor: 0xffd8a8,
                surfaceType: 'jupiter'
            }
        };

        const OBJECTS = {
            metal: { 
                name: "כדור מתכת", type: "sphere", radius: 0.7, mass: 15.0, Cd: 0.47,
                color: 0xcccccc, metalness: 1.0, roughness: 0.05, emissive: 0x555555 
            },
            tennis: { 
                name: "כדור טניס", type: "sphere", radius: 0.4, mass: 0.057, Cd: 0.47,
                color: 0xbada55, roughness: 0.8 
            },
            feather: { 
                name: "נוצה", type: "custom", mass: 0.002, Cd: 1.2, area: 0.15, 
                color: 0xffffff 
            }
        };

        const START_HEIGHT = 10;
        let currentPlanet = 'earth';
        let currentObject = 'metal';
        let isFalling = false;
        let dragEnabled = true;
        let startTime = 0;
        let fallTime = 0;
        let lastFrameTime = 0;
        let uiVisible = true;

        let currentY = START_HEIGHT;
        let currentVel = 0;

        let scene, camera, renderer, objectMesh, ground, grid, starSystem, planetarySurface;
        let mouseX = 0, mouseY = 0;

        function updateNarrator() {
            const el = document.getElementById('narrator-text');
            const container = document.getElementById('narrator-container');
            let message = "";

            if (!dragEnabled) {
                if (currentPlanet === 'moon') {
                    message = "על הירח הכבידה חלשה מאוד – תראו איך כולם צונחים למטה לאט וביחד!";
                } else if (currentPlanet === 'earth') {
                    message = "בלי אוויר שיפריע, אפילו הנוצה והמשקולת מגיעות לרצפה בדיוק באותו זמן.";
                } else if (currentPlanet === 'jupiter') {
                    message = "צדק הוא ענק! הכבידה החזקה שלו מושכת את כל העצמים למטה במהירות אדירה.";
                }
            } else {
                if (currentPlanet === 'earth') {
                    if (currentObject === 'feather') {
                        message = "האוויר מחזיק את הנוצה הרחבה, והיא מתנדנדת לה לאט עד הרצפה.";
                    } else if (currentObject === 'tennis') {
                        message = "לכדור יש קצת התנגדות, אבל הוא עדיין נופל די מהר.";
                    } else {
                        message = "הכדור כבד וקטן, האוויר כמעט לא מצליח לעצור אותו והוא נופל מהר.";
                    }
                } else if (currentPlanet === 'moon') {
                    if (currentObject === 'feather') {
                        message = "הכבידה כל כך חלשה והאוויר מפריע, שהנוצה כמעט מרחפת במקום!";
                    } else {
                        message = "גם עם אוויר, הכדורים נופלים, אבל הרבה יותר לאט מאשר בכדור הארץ.";
                    }
                } else if (currentPlanet === 'jupiter') {
                    if (currentObject === 'feather') {
                        message = "אפילו שהאוויר מנסה להתנגד, הכבידה של צדק חזקה מדי והנוצה נופלת מהר!";
                    } else {
                        message = "שום דבר לא עוצר אותו – הכבידה של צדק מושכת אותו כמו טיל למטה.";
                    }
                }
            }

            el.innerText = message;
            container.style.animation = 'none';
            container.offsetHeight; 
            container.style.animation = null;
        }

        function init() {
            scene = new THREE.Scene();
            scene.background = new THREE.Color(PLANETS.earth.bgColor);
            scene.fog = new THREE.Fog(PLANETS.earth.fogColor, 10, 50);

            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.set(4, 8, 20); 

            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            document.body.appendChild(renderer.domElement);

            scene.add(new THREE.AmbientLight(0xffffff, 0.7)); 
            const mainLight = new THREE.DirectionalLight(0xffffff, 1.5); 
            mainLight.position.set(20, 30, 10);
            scene.add(mainLight);

            const rimLight = new THREE.PointLight(0xffffff, 1, 50);
            rimLight.position.set(-10, 10, -10);
            scene.add(rimLight);

            createStars();

            const platGroup = new THREE.Group();
            const platGeo = new THREE.CylinderGeometry(2.5, 2.7, 0.5, 32);
            const platMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8, roughness: 0.2 });
            const platform = new THREE.Mesh(platGeo, platMat);
            platGroup.add(platform);

            const glowGeo = new THREE.CylinderGeometry(2.2, 2.2, 0.1, 32);
            const glowMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.4 });
            const glow = new THREE.Mesh(glowGeo, glowMat);
            glow.position.y = -0.3;
            platGroup.add(glow);
            scene.add(platGroup);

            grid = new THREE.GridHelper(100, 40, 0x3b82f6, 0x111111);
            grid.material.transparent = true;
            grid.material.opacity = 0.2;
            grid.position.y = 0.05;
            scene.add(grid);

            const poleGeo = new THREE.BoxGeometry(0.15, START_HEIGHT, 0.15);
            const poleMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.5 });
            const pole = new THREE.Mesh(poleGeo, poleMat);
            pole.position.set(3.5, START_HEIGHT / 2, 0); 
            scene.add(pole);

            for(let i=0; i<=START_HEIGHT; i++) {
                const tick = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.1), poleMat);
                tick.position.set(3.5, i, 0.2);
                scene.add(tick);
            }

            createPlanetarySurface();
            createObject();
            updateVisuals(); 
            updateNarrator();
            animate();

            window.addEventListener('resize', onWindowResize);
            window.addEventListener('mousemove', (e) => {
                mouseX = (e.clientX - window.innerWidth / 2) / 400;
                mouseY = (e.clientY - window.innerHeight / 2) / 400;
            });
        }

        function createStars() {
            const starGeo = new THREE.BufferGeometry();
            const starCount = 3000;
            const posArray = new Float32Array(starCount * 3);
            for(let i=0; i < starCount * 3; i++) {
                posArray[i] = (Math.random() - 0.5) * 200;
            }
            starGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
            starSystem = new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 0.2, color: 0xffffff, transparent: true }));
            scene.add(starSystem);
        }

        function generatePlanetaryTexture(type) {
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;
            const ctx = canvas.getContext('2d');
            if (type === 'earth') {
                ctx.fillStyle = '#1a4a8a';
                ctx.fillRect(0, 0, 512, 512);
                for(let i=0; i<30; i++) {
                    ctx.fillStyle = '#2d5a27';
                    ctx.beginPath(); ctx.arc(Math.random()*512, Math.random()*512, Math.random()*80 + 20, 0, Math.PI*2); ctx.fill();
                }
                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                for(let i=0; i<40; i++) {
                    ctx.beginPath(); ctx.arc(Math.random()*512, Math.random()*512, Math.random()*100, 0, Math.PI*2); ctx.fill();
                }
            } else if (type === 'moon') {
                ctx.fillStyle = '#333';
                ctx.fillRect(0, 0, 512, 512);
                for(let i=0; i<100; i++) {
                    ctx.fillStyle = '#444';
                    ctx.beginPath(); ctx.arc(Math.random()*512, Math.random()*512, Math.random()*15, 0, Math.PI*2); ctx.fill();
                    ctx.strokeStyle = '#222'; ctx.stroke();
                }
            } else if (type === 'jupiter') {
                for(let i=0; i<10; i++) {
                    ctx.fillStyle = i % 2 === 0 ? '#4d3215' : '#a67c52';
                    ctx.fillRect(0, i * 51.2, 512, 51.2);
                }
                ctx.fillStyle = '#7d2b14';
                ctx.beginPath(); ctx.ellipse(256, 256, 100, 50, 0, 0, Math.PI*2); ctx.fill();
            }
            return new THREE.CanvasTexture(canvas);
        }

        function createPlanetarySurface() {
            if (planetarySurface) scene.remove(planetarySurface);
            const geo = new THREE.SphereGeometry(200, 64, 64);
            const mat = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, map: generatePlanetaryTexture(PLANETS[currentPlanet].surfaceType)});
            planetarySurface = new THREE.Mesh(geo, mat);
            planetarySurface.position.y = -200.5;
            scene.add(planetarySurface);
        }

        function toggleUI() {
            uiVisible = !uiVisible;
            document.getElementById('controls-panel').classList.toggle('collapsed', !uiVisible);
        }

        function updateVisuals() {
            if (!scene.fog) return;
            const p = PLANETS[currentPlanet];
            if (dragEnabled && p.rho > 0) {
                scene.fog.near = 5;
                scene.fog.far = Math.max(20, 60 - (p.rho * 5));
                grid.material.opacity = Math.min(0.5, 0.1 + p.rho * 0.1);
            } else {
                scene.fog.near = 50;
                scene.fog.far = 300;
                grid.material.opacity = 0.1;
            }
        }

        function toggleDrag() {
            dragEnabled = !dragEnabled;
            const btn = document.getElementById('btn-drag-toggle');
            if (dragEnabled) {
                btn.innerText = "התנגדות אוויר: פעילה";
                btn.classList.remove('btn-off');
                btn.classList.add('btn-active');
            } else {
                btn.innerText = "התנגדות אוויר: כבויה";
                btn.classList.remove('btn-active');
                btn.classList.add('btn-off');
            }
            updateVisuals();
            updateNarrator();
        }

        function createFeatherMesh() {
            const group = new THREE.Group();
            const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.005, 1.4, 8), new THREE.MeshStandardMaterial({ color: 0xe0e0e0 }));
            group.add(shaft);
            const shape = new THREE.Shape();
            shape.moveTo(0, -0.7);
            shape.bezierCurveTo(0.3, -0.5, 0.4, 0.2, 0, 0.7);
            shape.bezierCurveTo(-0.4, 0.2, -0.3, -0.5, 0, -0.7);
            const vane = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
            vane.rotation.y = 0.2;
            group.add(vane);
            return group;
        }

        function createObject() {
            if (objectMesh) scene.remove(objectMesh);
            const config = OBJECTS[currentObject];
            if (config.type === 'sphere') {
                objectMesh = new THREE.Mesh(
                    new THREE.SphereGeometry(config.radius, 32, 32), 
                    new THREE.MeshStandardMaterial({ 
                        color: config.color, 
                        metalness: config.metalness ?? 0, 
                        roughness: config.roughness ?? 0.5,
                        emissive: config.emissive ?? 0x000000
                    })
                );
            } else {
                objectMesh = createFeatherMesh();
            }
            resetObject();
            scene.add(objectMesh);
        }

        function resetObject() {
            isFalling = false;
            fallTime = 0;
            currentY = START_HEIGHT;
            currentVel = 0;
            objectMesh.position.set(0, START_HEIGHT, 0);
            objectMesh.rotation.set(0,0,0);
            updateUIStats();
            document.getElementById('drop-btn').innerText = "הפל!";
            document.getElementById('drop-btn').classList.replace('bg-red-600', 'bg-blue-600');
            updateNarrator();
        }

        function setObject(type) {
            currentObject = type;
            ['metal', 'tennis', 'feather'].forEach(t => document.getElementById(`btn-${t}`).classList.remove('btn-active'));
            document.getElementById(`btn-${type}`).classList.add('btn-active');
            createObject();
            updateNarrator();
        }

        function setPlanet(type) {
            currentPlanet = type;
            const p = PLANETS[type];
            ['moon', 'earth', 'jupiter'].forEach(t => document.getElementById(`btn-${t}`).classList.remove('btn-active'));
            document.getElementById(`btn-${type}`).classList.add('btn-active');
            
            document.getElementById('planet-name').innerText = "מערכת " + p.name;
            document.getElementById('gravity-val').innerText = p.g;
            
            scene.background.setHex(p.bgColor);
            scene.fog.color.setHex(p.fogColor);
            grid.material.color.setHex(p.gridColor);
            starSystem.material.color.setHex(p.starColor);
            
            planetarySurface.material.map = generatePlanetaryTexture(p.surfaceType);
            planetarySurface.material.needsUpdate = true;

            updateVisuals();
            resetObject();
            updateNarrator();
        }

        function startDrop() {
            if (isFalling) resetObject();
            else {
                isFalling = true;
                startTime = performance.now();
                lastFrameTime = performance.now();
                document.getElementById('drop-btn').innerText = "איפוס";
                document.getElementById('drop-btn').classList.replace('bg-blue-600', 'bg-red-600');
            }
        }

        function updateUIStats() {
            document.getElementById('height-val').innerText = Math.max(0, currentY).toFixed(1);
            document.getElementById('time-val').innerText = fallTime.toFixed(2);
        }

        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }

        function animate() {
            requestAnimationFrame(animate);
            const time = performance.now() * 0.001;

            camera.position.x += ((4 + mouseX * 2) - camera.position.x) * 0.05;
            camera.position.y += (8 - mouseY * 2 - camera.position.y) * 0.05;
            camera.lookAt(0, 4, 0);

            const p = PLANETS[currentPlanet];
            planetarySurface.rotation.y += 0.0002;
            starSystem.rotation.y += 0.0001 * p.starSpeed;

            if (isFalling) {
                const now = performance.now();
                const dt = (now - lastFrameTime) / 1000;
                lastFrameTime = now;
                fallTime += dt;

                const o = OBJECTS[currentObject];
                const area = o.type === 'sphere' ? Math.PI * Math.pow(o.radius, 2) : o.area;
                
                const fg = o.mass * p.g;
                const effectiveRho = dragEnabled ? p.rho : 0;
                const fd = 0.5 * effectiveRho * Math.pow(currentVel, 2) * o.Cd * area;
                
                const netForce = fd - fg;
                const accel = netForce / o.mass;
                
                currentVel += accel * dt;
                currentY += currentVel * dt;

                const stopY = currentObject === 'feather' ? 0.7 : o.radius;
                if (currentY <= stopY) { 
                    currentY = stopY; 
                    currentVel = 0;
                    isFalling = false; 
                }
                
                objectMesh.position.y = currentY;
                
                if (currentObject === 'feather') {
                    objectMesh.rotation.z = Math.sin(fallTime * 4) * 0.6;
                    objectMesh.rotation.x = Math.PI / 2 + Math.cos(fallTime * 2) * 0.4;
                    objectMesh.rotation.y += 0.03;
                } else {
                    objectMesh.rotation.x += 0.08;
                    objectMesh.rotation.z += 0.02;
                }
                updateUIStats();
            }
            renderer.render(scene, camera);
        }

        window.onload = init;
