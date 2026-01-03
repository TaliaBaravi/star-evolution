    let scene, camera, renderer, earth, clouds, atmosphere, ship, mountain, stars, trail;
        let isLaunching = false, isOrbiting = false, isEscaping = false;
        let launchSite = 'pole'; 
        
        const EARTH_RADIUS = 5;
        const GRAVITY_STRENGTH = 0.0125; 
        const EQUATOR_BOOST = 45; 
        let shipPos = new THREE.Vector3(), shipVel = new THREE.Vector3();
        let trailPoints = [], accumulatedAngle = 0, lastAngle = 0;

        function createSciFiTextures() {
            const width = 2048, height = 1024;
            const canvas = document.createElement('canvas');
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#02050a';
            ctx.fillRect(0, 0, width, height);

            for (let i = 0; i < 50; i++) {
                const x = Math.random() * width;
                const y = Math.random() * height;
                const radius = Math.random() * 100 + 30;
                const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
                grad.addColorStop(0, 'rgba(0, 150, 255, 0.4)');
                grad.addColorStop(0.8, 'rgba(0, 50, 100, 0.2)');
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.ellipse(x, y, radius * 1.5, radius, Math.random(), 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'rgba(0, 10, 30, 0.9)';
                ctx.beginPath();
                ctx.ellipse(x, y, radius * 1.3, radius * 0.8, Math.random(), 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.strokeStyle = 'rgba(0, 242, 255, 0.15)';
            ctx.lineWidth = 1;
            for (let i = 0; i < height; i += 32) {
                ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(width, i); ctx.stroke();
            }
            for (let i = 0; i < width; i += 32) {
                ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
            }

            for (let i = 0; i < 200; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#00f2ff' : '#ff00ff';
                const x = Math.random() * width;
                const y = Math.random() * height;
                ctx.beginPath(); ctx.arc(x, y, Math.random() * 1.5, 0, Math.PI * 2); ctx.fill();
            }
            return new THREE.CanvasTexture(canvas);
        }

        function init() {
            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 20000);
            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
            document.body.appendChild(renderer.domElement);

            scene.add(new THREE.AmbientLight(0x002244, 0.5));
            const directional = new THREE.DirectionalLight(0x00f2ff, 1.0);
            directional.position.set(10, 10, 10);
            scene.add(directional);

            earth = new THREE.Mesh(
                new THREE.SphereGeometry(EARTH_RADIUS, 128, 128),
                new THREE.MeshPhongMaterial({ map: createSciFiTextures(), emissive: new THREE.Color(0x004466), emissiveIntensity: 0.5, shininess: 50 })
            );
            scene.add(earth);

            atmosphere = new THREE.Mesh(
                new THREE.SphereGeometry(EARTH_RADIUS + 0.4, 64, 64),
                new THREE.ShaderMaterial({
                    uniforms: { time: { value: 0 } },
                    vertexShader: `varying vec3 vNormal; varying vec2 vUv; void main() { vUv = uv; vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
                    fragmentShader: `uniform float time; varying vec3 vNormal; varying vec2 vUv; void main() { float intensity = pow(0.75 - dot(vNormal, vec3(0, 0, 1.0)), 3.0); float scanline = sin(vUv.y * 200.0 + time * 5.0) * 0.1 + 0.9; float grid = sin(vUv.x * 100.0) * sin(vUv.y * 100.0); vec3 color = vec3(0.0, 0.8, 1.0) * intensity * scanline; if(grid > 0.95) color += 0.2; gl_FragColor = vec4(color, intensity * 0.8); }`,
                    side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending
                })
            );
            scene.add(atmosphere);

            mountain = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.2, 0.3, 4), new THREE.MeshBasicMaterial({ color: 0x00f2ff, wireframe: true }));
            scene.add(mountain);

            ship = new THREE.Group();
            const body = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.8, 6), new THREE.MeshPhongMaterial({ color: 0x222222, emissive: 0x004444, flatShading: true }));
            const nose = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.4, 6), new THREE.MeshPhongMaterial({ color: 0x00f2ff, emissive: 0x008888 }));
            nose.position.y = 0.6; ship.add(body); ship.add(nose);
            scene.add(ship);

            trail = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x00f2ff, transparent: true, opacity: 0.8 }));
            scene.add(trail);

            const starGeo = new THREE.BufferGeometry();
            const starPos = new Float32Array(8000 * 3);
            for(let i=0; i<24000; i++) starPos[i] = (Math.random()-0.5)*8000;
            starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
            scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x00f2ff, size: 0.5, transparent: true, opacity: 0.3 })));

            resetShip();
            window.addEventListener('resize', onWindowResize, false);
        }

        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }

        function resetShip() {
            isLaunching = false; isOrbiting = false; isEscaping = false; accumulatedAngle = 0;
            if (launchSite === 'pole') {
                mountain.position.set(0, EARTH_RADIUS + 0.1, 0);
                shipPos.set(0, EARTH_RADIUS + 1.2, 0);
                camera.position.set(0, 0, 22);
            } else {
                mountain.position.set(EARTH_RADIUS + 0.1, 0, 0);
                shipPos.set(EARTH_RADIUS + 1.2, 0, 0);
                camera.position.set(0, 4, 18);
            }
            shipVel.set(0, 0, 0);
            ship.position.copy(shipPos);
            ship.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), shipPos.clone().normalize());
            ship.visible = true; trailPoints = []; updateTrail();
            document.getElementById('status-panel').innerHTML = "SYSTEM READY.";
            document.getElementById('launch-btn').disabled = false;
            camera.lookAt(0,0,0);
        }

        function updateTrail() {
            const positions = new Float32Array(trailPoints.length * 3);
            for(let i = 0; i < trailPoints.length; i++) {
                positions[i*3] = trailPoints[i].x; positions[i*3+1] = trailPoints[i].y; positions[i*3+2] = trailPoints[i].z;
            }
            trail.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            trail.geometry.attributes.position.needsUpdate = true;
        }

        function animate() {
            requestAnimationFrame(animate);
            const time = performance.now() * 0.001;
            earth.rotation.y += 0.0003;
            atmosphere.material.uniforms.time.value = time;

            if (isLaunching) {
                let gravityDir = new THREE.Vector3(0, 0, 0).sub(shipPos);
                let distance = gravityDir.length();
                gravityDir.normalize();

                let force = GRAVITY_STRENGTH * (20 / (distance * distance));
                shipVel.add(gravityDir.multiplyScalar(force));
                shipPos.add(shipVel);
                ship.position.copy(shipPos);
                ship.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), shipVel.clone().normalize());

                trailPoints.push(shipPos.clone());
                if (trailPoints.length > 2000) trailPoints.shift();
                updateTrail();

                if (isEscaping) {
                    let offset = shipVel.clone().normalize().multiplyScalar(-20).add(new THREE.Vector3(0, 8, 8));
                    camera.position.lerp(shipPos.clone().add(offset), 0.05);
                    camera.lookAt(shipPos);
                }

                let currentAngle = (launchSite === 'pole') ? Math.atan2(shipPos.y, shipPos.x) : Math.atan2(shipPos.z, shipPos.x);
                if (trailPoints.length > 2) {
                    let diff = currentAngle - lastAngle;
                    if (diff > Math.PI) diff -= Math.PI * 2;
                    if (diff < -Math.PI) diff += Math.PI * 2;
                    accumulatedAngle += Math.abs(diff);

                    if (accumulatedAngle > Math.PI * 2 && !isOrbiting && !isEscaping) {
                        isOrbiting = true;
                        trail.material.color.set(0xff00ff);
                        document.getElementById('status-panel').innerHTML = "STABLE ORBIT DETECTED.";
                    }
                }
                lastAngle = currentAngle;

                if (distance < EARTH_RADIUS) {
                    isLaunching = false;
                    document.getElementById('status-panel').innerHTML = "CRITICAL FAILURE: IMPACT.";
                }

                if (distance > 50 && !isEscaping) {
                    isEscaping = true;
                    document.getElementById('status-panel').innerHTML = "ESCAPE VELOCITY REACHED.";
                }
            }
            renderer.render(scene, camera);
        }

        document.getElementById('speed-slider').addEventListener('input', (e) => {
            document.getElementById('speed-val').innerText = e.target.value;
        });

        document.getElementById('site-pole').addEventListener('click', () => {
            launchSite = 'pole';
            document.getElementById('site-pole').classList.add('active');
            document.getElementById('site-equator').classList.remove('active');
            resetShip();
        });

        document.getElementById('site-equator').addEventListener('click', () => {
            launchSite = 'equator';
            document.getElementById('site-equator').classList.add('active');
            document.getElementById('site-pole').classList.remove('active');
            resetShip();
        });

        document.getElementById('launch-btn').addEventListener('click', () => {
            if (isLaunching) return;
            resetShip();
            const power = parseInt(document.getElementById('speed-slider').value);
            let finalSpeed = power + (launchSite === 'equator' ? EQUATOR_BOOST : 0);
            if (launchSite === 'pole') shipVel.set(finalSpeed * 0.001, 0, 0);
            else shipVel.set(0, 0, finalSpeed * 0.001);
            isLaunching = true;
            document.getElementById('launch-btn').disabled = true;
            document.getElementById('status-panel').innerHTML = "LAUNCH SEQUENCE ACTIVE.";
        });

        document.getElementById('reset-btn').addEventListener('click', resetShip);
        window.onload = () => { init(); animate(); };
