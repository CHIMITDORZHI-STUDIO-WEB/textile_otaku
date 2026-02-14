// ==========================================
// Cookie Banner
// ==========================================
(function () {
    var banner = document.getElementById('cookie-banner');
    var acceptBtn = document.getElementById('cookie-accept');

    if (banner && !localStorage.getItem('cookieAccepted')) {
        banner.style.display = 'flex';
    }

    if (acceptBtn) {
        acceptBtn.addEventListener('click', function () {
            localStorage.setItem('cookieAccepted', 'true');
            banner.style.display = 'none';
        });
    }
})();

// ==========================================
// Intro Animation
// ==========================================
(function () {
    const intro = document.getElementById('intro');

    // Measure real SVG text path length for accurate stitch animation
    const svgText = document.querySelector('.intro-svg text');
    if (svgText) {
        const len = svgText.getComputedTextLength();
        svgText.style.strokeDasharray = len;
        svgText.style.strokeDashoffset = len;
        // Restart animation with correct length
        svgText.style.animation = 'none';
        void svgText.offsetWidth; // force reflow
        svgText.style.animation = 'stitch 2s cubic-bezier(0.4, 0, 0.2, 1) forwards';
    }

    // Hide intro after animation completes
    setTimeout(function () {
        if (intro) intro.classList.add('hidden');
    }, 2500);
})();

// ==========================================
// Theme Switcher
// ==========================================
(function () {
    var themeToggle = document.getElementById('theme-toggle');
    var body = document.body;

    // Check saved preference
    if (localStorage.getItem('theme') === 'day') {
        body.setAttribute('data-theme', 'day');
        if (themeToggle) themeToggle.textContent = 'Day Couture';
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', function () {
            var isDay = body.getAttribute('data-theme') === 'day';
            if (isDay) {
                body.removeAttribute('data-theme');
                themeToggle.textContent = 'Night Couture';
                localStorage.setItem('theme', 'night');
            } else {
                body.setAttribute('data-theme', 'day');
                themeToggle.textContent = 'Day Couture';
                localStorage.setItem('theme', 'day');
            }
        });
    }
})();

// ==========================================
// WebGL Background (Three.js via global)
// ==========================================
(function () {
    // THREE is loaded globally via <script> tag
    if (typeof THREE === 'undefined') {
        console.warn('Three.js not loaded. WebGL background disabled.');
        return;
    }

    var canvasContainer = document.getElementById('canvas-container');
    if (!canvasContainer) return;

    // Scene setup
    var scene = new THREE.Scene();
    var camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    var renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    canvasContainer.appendChild(renderer.domElement);

    // Uniforms
    var uniforms = {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uColor: { value: new THREE.Vector3(0.07, 0.07, 0.07) }
    };

    // Pre-allocate target color vectors (no GC pressure)
    var targetColorNight = new THREE.Vector3(0.07, 0.07, 0.07);
    var targetColorDay = new THREE.Vector3(0.94, 0.92, 0.84);

    var vertexShader = [
        'varying vec2 vUv;',
        'void main() {',
        '    vUv = uv;',
        '    gl_Position = vec4(position, 1.0);',
        '}'
    ].join('\n');

    var fragmentShader = [
        'precision mediump float;',
        'uniform float uTime;',
        'uniform vec2 uResolution;',
        'uniform vec2 uMouse;',
        'uniform vec3 uColor;',
        'varying vec2 vUv;',
        '',
        'float random(in vec2 st) {',
        '    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);',
        '}',
        '',
        'float noise(in vec2 st) {',
        '    vec2 i = floor(st);',
        '    vec2 f = fract(st);',
        '    float a = random(i);',
        '    float b = random(i + vec2(1.0, 0.0));',
        '    float c = random(i + vec2(0.0, 1.0));',
        '    float d = random(i + vec2(1.0, 1.0));',
        '    vec2 u = f * f * (3.0 - 2.0 * f);',
        '    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;',
        '}',
        '',
        'void main() {',
        '    vec2 st = gl_FragCoord.xy / uResolution.xy;',
        '    float aspect = uResolution.x / uResolution.y;',
        '    vec2 center = st * vec2(aspect, 1.0);',
        '    vec2 mouse = uMouse * vec2(aspect, 1.0);',
        '    float dist = distance(center, mouse);',
        '    float wave = sin(dist * 20.0 - uTime * 2.0);',
        '    float ripple = smoothstep(0.0, 0.5, 1.0 - dist) * wave * 0.05;',
        '    float fabric = noise(st * 400.0) * 0.03;',
        '    vec3 color = uColor + ripple + fabric;',
        '    gl_FragColor = vec4(color, 1.0);',
        '}'
    ].join('\n');

    // Plane
    var geometry = new THREE.PlaneGeometry(2, 2);
    var material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        transparent: true
    });
    var plane = new THREE.Mesh(geometry, material);
    scene.add(plane);

    // Animation Loop
    function animate() {
        requestAnimationFrame(animate);
        uniforms.uTime.value += 0.01;

        var target = document.body.getAttribute('data-theme') === 'day'
            ? targetColorDay
            : targetColorNight;
        uniforms.uColor.value.lerp(target, 0.05);

        renderer.render(scene, camera);
    }
    animate();

    // Resize
    window.addEventListener('resize', function () {
        renderer.setSize(window.innerWidth, window.innerHeight);
        uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    });

    // Mouse
    window.addEventListener('mousemove', function (e) {
        uniforms.uMouse.value.set(
            e.clientX / window.innerWidth,
            1.0 - e.clientY / window.innerHeight
        );
    });

    // Touch
    window.addEventListener('touchmove', function (e) {
        uniforms.uMouse.value.set(
            e.touches[0].clientX / window.innerWidth,
            1.0 - e.touches[0].clientY / window.innerHeight
        );
    }, { passive: true });
})();
