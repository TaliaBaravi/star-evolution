    // --- Constants & Data ---
        const PLANETS = {
            earth: { name: "Earth", g: 9.81, color: 0x2b6cb0, gridColor: 0x4299e1 },
            moon: { name: "The Moon", g: 1.62, color: 0x718096, gridColor: 0xa0aec0 },
            jupiter: { name: "Jupiter", g: 24.79, color: 0xed8936, gridColor: 0xfbd38d }
        };

        const OBJECTS = {
            metal: { name: "Metal Ball", type: "sphere", radius: 0.4, color: 0x888888, metalness: 0.9 },
            tennis: { name: "Tennis Ball", type: "sphere", radius: 0.4, color: 0xbada55, roughness: 0.8 },
            feather: { name: "Feather", type: "plane", size: 0.8, color: 0xffffff }
        };

        const START_HEIGHT = 10;
        let currentPlanet = 'earth';
        let currentObject = 'metal';
        let isFalling = false;
        let startTime = 0;
        let fallTime = 0;

        // --- Three.js Setup ---
        let scene, camera, renderer, objectMesh, ground, grid, light;
        let mouseX = 0, mouseY = 0;

        function init() {
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x050505);
            scene.fog = new THREE.Fog(0x050505, 5, 25);

            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.set(0, 5, 12);
            camera.lookAt(0, 5, 0);

            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
            document.body.appendChild(renderer.domElement);

            // Lighting
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
            scene.add(ambientLight);

            light = new THREE.PointLight(0xffffff, 1, 50);
            light.position.set(10, 15, 10);
            scene.add(light);

            const hemiLight = new THREE.HemisphereLight(0x443333, 0x111122);
            scene.add(hemiLight);

            // Ground & Environment
            const groundGeo = new THREE.PlaneGeometry(100, 100);
            const groundMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
            ground = new THREE.Mesh(groundGeo, groundMat);
            ground.rotation.x = -Math.PI / 2;
            scene.add(ground);

            grid = new THREE.GridHelper(40, 40, 0x333333, 0x222222);
            scene.add(grid);

            // Platform
            const platGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.2, 32);
            const platMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
            const platform = new THREE.Mesh(platGeo, platMat);
            platform.position.y = -0.1;
            scene.add(platform);

            // Measurement Pole
            const poleGeo = new THREE.BoxGeometry(0.1, START_HEIGHT, 0.1);
            const poleMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
            const pole = new THREE.Mesh(poleGeo, poleMat);
            pole.position.set(-1.5, START_HEIGHT / 2, 0);
            scene.add(pole);

            // Ticks on pole
            for(let i=0; i<=START_HEIGHT; i++) {
                const tickGeo = new THREE.BoxGeometry(0.3, 0.02, 0.05);
                const tick = new THREE.Mesh(tickGeo, poleMat);
                tick.position.set(-1.5, i, 0.1);
                scene.add(tick);
            }

            createObject();
            animate();

            // Interactivity
            window.addEventListener('resize', onWindowResize);
            window.addEventListener('mousemove', (e) => {
                mouseX = (e.clientX - window.innerWidth / 2) / 200;
                mouseY = (e.clientY - window.innerHeight / 2) / 200;
            });
            window.addEventListener('touchstart', (e) => {
                const touch = e.touches[0];
                mouseX = (touch.clientX - window.innerWidth / 2) / 200;
            }, {passive: true});
        }

        function createObject() {
            if (objectMesh) scene.remove(objectMesh);

            const config = OBJECTS[currentObject];
            let geometry;
            
            if (config.type === 'sphere') {
                geometry = new THREE.SphereGeometry(config.radius, 32, 32);
            } else {
                // Feather as a curved plane
                geometry = new THREE.PlaneGeometry(config.size, config.size);
            }

            const material = new THREE.MeshStandardMaterial({ 
                color: config.color, 
                metalness: config.metalness || 0,
                roughness: config.roughness || 0.5,
                side: THREE.DoubleSide
            });

            objectMesh = new THREE.Mesh(geometry, material);
            resetObject();
            scene.add(objectMesh);
        }

        function resetObject() {
            isFalling = false;
            fallTime = 0;
            objectMesh.position.set(0, START_HEIGHT, 0);
            objectMesh.rotation.set(0,0,0);
            updateUIStats();
            document.getElementById('drop-btn').innerText = "DROP OBJECT";
            document.getElementById('drop-btn').className = "w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition shadow-lg uppercase tracking-widest mt-2";
        }

        function setObject(type) {
            currentObject = type;
            ['metal', 'tennis', 'feather'].forEach(t => {
                document.getElementById(`btn-${t}`).classList.remove('btn-active');
            });
            document.getElementById(`btn-${type}`).classList.add('btn-active');
            createObject();
        }

        function setPlanet(type) {
            currentPlanet = type;
            const data = PLANETS[type];
            ['earth', 'moon', 'jupiter'].forEach(t => {
                document.getElementById(`btn-${t}`).classList.remove('btn-active');
            });
            document.getElementById(`btn-${type}`).classList.add('btn-active');
            
            // Visual Update
            document.getElementById('planet-name').innerText = data.name + " System";
            document.getElementById('gravity-val').innerText = data.g;
            ground.material.color.setHex(data.color);
            grid.material.color.setHex(data.gridColor);
            
            resetObject();
        }

        function startDrop() {
            if (isFalling) {
                resetObject();
            } else {
                isFalling = true;
                startTime = performance.now();
                document.getElementById('drop-btn').innerText = "RESET";
                document.getElementById('drop-btn').className = "w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition shadow-lg uppercase tracking-widest mt-2";
            }
        }

        function updateUIStats() {
            document.getElementById('height-val').innerText = Math.max(0, objectMesh.position.y).toFixed(1);
            document.getElementById('time-val').innerText = fallTime.toFixed(2);
        }

        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }

        function animate() {
            requestAnimationFrame(animate);

            // Subtle camera movement
            camera.position.x += (mouseX - camera.position.x) * 0.05;
            camera.position.y += (5 - mouseY - camera.position.y) * 0.05;
            camera.lookAt(0, 4, 0);

            if (isFalling) {
                const now = performance.now();
                fallTime = (now - startTime) / 1000;

                const g = PLANETS[currentPlanet].g;
                // Equation: y = y0 - 0.5 * g * t^2
                let newY = START_HEIGHT - (0.5 * g * Math.pow(fallTime, 2));

                if (newY <= 0.4) { // Hit ground radius approx
                    newY = 0.4;
                    isFalling = false;
                    // Spark effect or sound could go here
                }

                objectMesh.position.y = newY;
                
                // Rotation visual for feather
                if (currentObject === 'feather') {
                    objectMesh.rotation.z = Math.sin(fallTime * 5) * 0.2;
                    objectMesh.rotation.y += 0.02;
                } else if (currentObject === 'tennis') {
                    objectMesh.rotation.x += 0.05;
                }

                updateUIStats();
            }

            renderer.render(scene, camera);
        }

        // Initialize on load
        window.onload = init;
