import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export function Home({
  authUser,
  onStart,
  onLogin,
  onRegister,
  onProfile,
  activeSection,
  setActiveSection
}) {
  const [isVisible, setIsVisible] = useState({});
  const statRefs = useRef([]);
  const [counterValues, setCounterValues] = useState({ faster: 0, goli: 0, reroute: 0, modes: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const challengeCanvasRef = useRef(null);
  const challengeSceneRef = useRef(null);

  const animateCounter = useRef();
  const heroPrimaryLabel = authUser ? `Continue as ${authUser.name}` : 'Login to Open Planner';

  const formatCounter = (index, value) => {
    const targets = [30, 100, 1, 6];
    const finals = ['30%', '100%', '<1s', '6+'];
    const target = targets[index];
    if (value >= target) return finals[index];
    if (index === 0 || index === 1) return Math.floor(value) + '%';
    if (index === 2) return Math.floor(value) + 's';
    return Math.floor(value) + '';
  };

  // Three.js 3D Traffic Scene for Hero
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    
    // Ensure canvas has valid dimensions
    if (canvas.clientWidth === 0 || canvas.clientHeight === 0) {
      console.warn('Canvas has invalid dimensions, skipping Three.js initialization');
      return;
    }

    // Check for existing WebGL context and clean up
    if (sceneRef.current?.renderer) {
      try {
        sceneRef.current.renderer.dispose();
      } catch (e) {
        // Ignore disposal errors
      }
    }
    
    let animationId = null;
    let isRenderLoopActive = true;
    
    try {
        const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    
    const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ 
      canvas, 
      alpha: true, 
      antialias: true,
      failIfMajorPerformanceCaveat: false
    });
    
    // Check if WebGL context is available
    if (!renderer.getContext()) {
      console.warn('WebGL not supported, skipping 3D scene');
      return;
    }
    
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Neon glowing material
    const nodeMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00d4aa, 
      transparent: true, 
      opacity: 0.8,
      vertexColors: false
    });
    const edgeMaterial = new THREE.LineBasicMaterial({ 
      color: 0x00d4aa, 
      transparent: true, 
      opacity: 0.6,
      vertexColors: false
    });

    // Dhaka Graph Nodes (intersections)
    const nodes = [];
    const positions = [
      [-5, 0, -5], [5, 0, -5], [0, 0, 5], [10, 1, 0], [-10, 0.5, 2]
    ];
    positions.forEach(pos => {
      const geometry = new THREE.SphereGeometry(0.15, 16, 16);
      const node = new THREE.Mesh(geometry, nodeMaterial);
      node.position.set(...pos);
      scene.add(node);
      nodes.push(node);
    });

    // Glowing Edges (roads)
    const edges = [
      [[0,1], [0,2], [1,3], [2,4], [3,4]]
    ];
    edges[0].forEach(([i,j]) => {
      const points = [nodes[i].position, nodes[j].position];
      const geometry = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(...p)));
      const line = new THREE.Line(geometry, edgeMaterial);
      scene.add(line);
    });

    // Animated Vehicles (Rickshaws)
    const vehicleGeometry = new THREE.BoxGeometry(0.3, 0.1, 0.6);
    const vehicleMaterial = new THREE.MeshBasicMaterial({ color: 0xff6b6b });
    const vehicles = [];
    for (let i = 0; i < 3; i++) {
      const vehicle = new THREE.Mesh(vehicleGeometry, vehicleMaterial);
      vehicle.position.set(Math.random()*10-5, 0.2, Math.random()*10-5);
      scene.add(vehicle);
      vehicles.push({ mesh: vehicle, speed: 0.02 + Math.random()*0.01 });
    }

    // Anomaly Particles (traffic jams)
    const particleCount = 50;
    const particles = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleVelocities = [];
    for (let i = 0; i < particleCount; i++) {
      particlePositions[i*3] = (Math.random() - 0.5) * 20;
      particlePositions[i*3 + 1] = Math.random() * 5;
      particlePositions[i*3 + 2] = (Math.random() - 0.5) * 20;
      particleVelocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        0.01,
        (Math.random() - 0.5) * 0.02
      ));
    }
    particles.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xff4757,
      size: 0.1,
      transparent: true,
      opacity: 0.8
    });
    const particleSystem = new THREE.Points(particles, particleMaterial);
    scene.add(particleSystem);

    camera.position.z = 8;

    // Animation loop
    isRenderLoopActive = true;
    
    const animate = () => {
      if (!isRenderLoopActive) return;
      
      // Check if canvas is still in DOM
      if (!canvas.isConnected) {
        isRenderLoopActive = false;
        return;
      }
      
      animationId = requestAnimationFrame(animate);

      // Orbit camera
      camera.position.x = Math.cos(Date.now() * 0.0003) * 8;
      camera.position.z = Math.sin(Date.now() * 0.0003) * 8;
      camera.lookAt(0, 0.5, 0);

      // Pulse nodes (avoid changing material properties that cause shader recompilation)
      nodes.forEach((node, i) => {
        const pulse = 1 + Math.sin(Date.now() * 0.01 + i) * 0.2;
        node.scale.setScalar(pulse);
        // Instead of changing opacity, modulate color intensity
        const intensity = 0.6 + Math.sin(Date.now() * 0.015 + i) * 0.2;
        node.material.color.setHSL(0.45, 0.8, intensity); // Keep hue/saturation, modulate lightness
      });

      // Animate vehicles
      vehicles.forEach(v => {
        v.mesh.position.x += v.speed * Math.sin(Date.now() * 0.001);
        v.mesh.position.z += v.speed;
        if (v.mesh.position.z > 10) v.mesh.position.z = -10;
        v.mesh.rotation.y = Date.now() * 0.002;
      });

      // Animate particles
      const positions = particleSystem.geometry.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        positions[i*3] += particleVelocities[i].x;
        positions[i*3 + 1] += particleVelocities[i].y;
        positions[i*3 + 2] += particleVelocities[i].z;
        if (positions[i*3 + 1] > 5) {
          positions[i*3 + 1] = 0;
          particleVelocities[i].set(
            (Math.random() - 0.5) * 0.02,
            0.01,
            (Math.random() - 0.5) * 0.02
          );
        }
      }
      particleSystem.geometry.attributes.position.needsUpdate = true;

      try {
        // Check if WebGL context is still valid
        const gl = renderer.getContext();
        if (!gl || gl.isContextLost()) {
          console.warn('WebGL context lost, stopping animation');
          return;
        }
        
        renderer.render(scene, camera);
      } catch (renderError) {
        console.error('WebGL render error:', renderError);
        // Stop animation on render failure
        return;
      }
    };
    animate();

    // Resize handler
    const resize = () => {
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    };
    window.addEventListener('resize', resize);

    sceneRef.current = { scene, camera, renderer, resize };
    
    } catch (error) {
      console.error('Three.js initialization failed:', error);
    }

    return () => {
      isRenderLoopActive = false;
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (sceneRef.current?.renderer) {
        window.removeEventListener('resize', sceneRef.current.resize);
        sceneRef.current.renderer.dispose();
      }
    };
  }, []);

// Challenge 3D Urban Mobility Scene - Denser traffic viz
  useEffect(() => {
    if (!challengeCanvasRef.current) return;

    const canvas = challengeCanvasRef.current;
    if (canvas.clientWidth === 0 || canvas.clientHeight === 0) return;

    // Check for existing WebGL context and clean up
    if (challengeSceneRef.current?.renderer) {
      try {
        challengeSceneRef.current.renderer.dispose();
      } catch (e) {
        // Ignore disposal errors
      }
    }
    
    let animationId = null;
    let isRenderLoopActive = true;

    try {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0f0f0f);

      const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      // Urban mobility materials - multi-modal colors
      const busMaterial = new THREE.MeshBasicMaterial({ color: 0x4ecdc4, transparent: true, opacity: 0.8 });
      const walkMaterial = new THREE.MeshBasicMaterial({ color: 0x45b7d1, transparent: true, opacity: 0.7 });
      const rickshawMaterial = new THREE.MeshBasicMaterial({ color: 0xff6b6b, transparent: true, opacity: 0.9 });

      // Denser Dhaka nodes (more intersections)
      const nodes = [];
      const positions = [];
      for (let i = 0; i < 12; i++) { // Denser
        positions.push([
          (Math.random() - 0.5) * 12,
          Math.random() * 0.5,
          (Math.random() - 0.5) * 12
        ]);
      }
      positions.forEach((pos, i) => {
        const mat = i % 3 === 0 ? busMaterial : i % 3 === 1 ? walkMaterial : rickshawMaterial;
        const geometry = new THREE.SphereGeometry(0.12, 12, 12);
        const node = new THREE.Mesh(geometry, mat);
        node.position.set(...pos);
        scene.add(node);
        nodes.push(node);
      });

      // More edges for complex routing
      for (let i = 0; i < 20; i++) {
        const start = Math.floor(Math.random() * nodes.length);
        const end = Math.floor(Math.random() * nodes.length);
        if (start !== end) {
          const points = [nodes[start].position, nodes[end].position];
          const geometry = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(...p)));
          const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ 
            color: 0x00d4aa, 
            transparent: true, 
            opacity: 0.5 
          }));
          scene.add(line);
        }
      }

      // Multi-modal vehicles
      const vehicles = [];
      for (let i = 0; i < 6; i++) { // More vehicles
        const geometry = new THREE.BoxGeometry(0.25, 0.08, 0.5);
        const vehicle = new THREE.Mesh(geometry, rickshawMaterial);
        vehicle.position.set((Math.random()-0.5)*10, 0.15, (Math.random()-0.5)*10);
        scene.add(vehicle);
        vehicles.push({ mesh: vehicle, speed: 0.015 + Math.random()*0.01, dir: Math.random()*Math.PI*2 });
      }

      // Dense anomaly particles (traffic jams)
      const particleCount = 100; // Denser
      const particles = new THREE.BufferGeometry();
      const particlePositions = new Float32Array(particleCount * 3);
      const particleVelocities = [];
      for (let i = 0; i < particleCount; i++) {
        particlePositions[i*3] = (Math.random() - 0.5) * 15;
        particlePositions[i*3 + 1] = Math.random() * 3;
        particlePositions[i*3 + 2] = (Math.random() - 0.5) * 15;
        particleVelocities.push(new THREE.Vector3(
          (Math.random() - 0.5) * 0.015,
          0.008,
          (Math.random() - 0.5) * 0.015
        ));
      }
      particles.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
      const particleSystem = new THREE.Points(particles, new THREE.PointsMaterial({
        color: 0xff4757, size: 0.08, transparent: true, opacity: 0.9
      }));
      scene.add(particleSystem);

      camera.position.z = 10;

      const animate = () => {
        if (!isRenderLoopActive) return;
        if (!canvas.isConnected) {
          isRenderLoopActive = false;
          return;
        }
        animationId = requestAnimationFrame(animate);

        // Slower orbit for readability
        camera.position.x = Math.cos(Date.now() * 0.0002) * 9;
        camera.position.z = Math.sin(Date.now() * 0.0002) * 9;
        camera.lookAt(0, 0.3, 0);

        // Pulse nodes
        nodes.forEach((node, i) => {
          const pulse = 1 + Math.sin(Date.now() * 0.008 + i) * 0.15;
          node.scale.setScalar(pulse);
        });

        // Animate vehicles
        vehicles.forEach(v => {
          v.mesh.position.x += Math.cos(v.dir) * v.speed;
          v.mesh.position.z += Math.sin(v.dir) * v.speed;
          if (Math.abs(v.mesh.position.x) > 6 || Math.abs(v.mesh.position.z) > 6) {
            v.dir += Math.PI;
          }
          v.mesh.rotation.y = Date.now() * 0.0015;
        });

        // Animate particles
        const positions = particleSystem.geometry.attributes.position.array;
        for (let i = 0; i < particleCount; i++) {
          positions[i*3] += particleVelocities[i].x;
          positions[i*3 + 1] += particleVelocities[i].y;
          positions[i*3 + 2] += particleVelocities[i].z;
          if (positions[i*3 + 1] > 4) {
            positions[i*3 + 1] = 0;
            particleVelocities[i].y = 0.008;
          }
        }
        particleSystem.geometry.attributes.position.needsUpdate = true;

        renderer.render(scene, camera);
      };
      animate();

      const resize = () => {
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
      };
      window.addEventListener('resize', resize);

      challengeSceneRef.current = { scene, camera, renderer, resize };

    } catch (error) {
      console.error('Challenge 3D init failed:', error);
    }

    return () => {
      isRenderLoopActive = false;
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (challengeSceneRef.current?.renderer) {
        challengeSceneRef.current.scene.traverse((object) => {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(m => m.dispose());
            } else {
              object.material.dispose();
            }
          }
        });
        window.removeEventListener('resize', challengeSceneRef.current.resize);
        challengeSceneRef.current.renderer.dispose();
      }
    };
  }, []);


  useEffect(() => {
    if (isAnimating && isVisible.stats && statRefs.current.every(ref => ref)) {
      const targets = [30, 100, 1, 6];
      const keys = ['faster', 'goli', 'reroute', 'modes'];

      const animate = () => {
        let done = true;
        const newValues = {};
        keys.forEach((key, index) => {
          const current = counterValues[key];
          const target = targets[index];
          if (current < target) {
            done = false;
            newValues[key] = current + target * 0.05;
          } else {
            newValues[key] = target;
            statRefs.current[index].textContent = formatCounter(index, target);
          }
        });

        if (!done) {
          setCounterValues(newValues);
          animateCounter.current = requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
        }
      };
      animate();
    }
  }, [isAnimating, isVisible.stats, counterValues]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setIsVisible(prev => ({ ...prev, [entry.target.id]: true }));
          if (setActiveSection && entry.target.id !== activeSection) {
            setActiveSection(entry.target.id);
          }
        }
      });
    });

    document.querySelectorAll('.section').forEach(el => observer.observe(el));

    const statsObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(prev => ({ ...prev, stats: true }));
        setIsAnimating(true);
      }
    });

    const statsEl = document.getElementById('stats');
    if (statsEl) statsObserver.observe(statsEl);

    return () => {
      observer.disconnect();
      statsObserver.disconnect();
      if (animateCounter.current) {
        cancelAnimationFrame(animateCounter.current);
      }
    };
  }, []);

  return (
 <section className="home-page fade-in">
  {/* 3D Hero Section */}
  <section id="hero" className={`section hero-section ${isVisible.hero ? 'slide-in' : ''}`}>
    <div className="hero-3d-container">
      <canvas ref={canvasRef} className="hero-canvas" />

      <div className="hero-overlay">
        <h1 className="hero-title-3d">3D Dhaka Navigation</h1>

        <p>
          Dhaka’s transport system is highly unpredictable due to congestion, roadblocks,
          and constantly changing traffic conditions, making daily travel difficult to plan reliably.
          GoliTransit solves this by intelligently optimizing routes in real time,
          helping users navigate the city faster and more efficiently despite urban chaos.
        </p>

        <div className="cta-buttons">
          <button type="button" className="primary-btn" onClick={onStart}>
            {heroPrimaryLabel}
          </button>

          <button
            type="button"
            className="primary-btn secondary"
            onClick={() =>
              document.getElementById('challenge')?.scrollIntoView({ behavior: 'smooth' })
            }
          >
            Explore Chaos
          </button>
        </div>
      </div>
    </div>
    </section>
   {/* Challenge Section */}
      <section id="challenge" className={`section challenge-section ${isVisible.challenge ? 'slide-in' : ''}`}>
        <div className="challenge-3d-container">
          <canvas ref={challengeCanvasRef} className="challenge-canvas" />
          <div className="challenge-overlay text-glow">
            <h2 className="challenge-title">Urban Mobility in Dhaka</h2>
            <div className="challenge-description">
             
              <p>GoliTransit uses a smart graph-based system to adapt routes in real time. It analyzes traffic, disruptions, and transport options to suggest efficient multi-modal journeys—combining walking, buses, and rickshaws—for faster and more reliable travel across Dhaka.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Enhanced 3D Cards */}
      <section id="features" className={`section ${isVisible.features ? 'slide-in' : ''}`}>
  <h2 className="challenge-title" style={{ textAlign: 'center', marginBottom: '3rem' }}>
     Features
  </h2>

  <div className="features-grid">

  <article className="feature-card card-3d">
    <h3 className="feature-title">Multi-Modal 3D Paths</h3>
    <ul className="feature-bullets">
      <li>Bus → Walk → Rickshaw in optimized routes</li>
      <li>Dynamic mode-switch visualization</li>
      <li>Real-time path recalculation</li>
    </ul>
  </article>

  <article className="feature-card card-3d">
    <h3 className="feature-title">Live Anomaly System</h3>
    <ul className="feature-bullets">
      <li>Traffic jams visualized as live changes</li>
      <li>Instant edge cost updates</li>
      <li>Automatic rerouting engine</li>
    </ul>
  </article>

  <article className="feature-card card-3d">
    <h3 className="feature-title">Hyper-Local Goli Network</h3>
    <ul className="feature-bullets">
      <li>Narrow alley route mapping</li>
      <li>Vehicle-based access control</li>
      <li>Complete urban micro-routing</li>
    </ul>
  </article>

  <article className="feature-card card-3d">
    <h3 className="feature-title">Graph Intelligence Engine</h3>
    <ul className="feature-bullets">
      <li>A* optimized routing system</li>
      <li>Weighted dynamic edges</li>
      <li>Real-time computation updates</li>
    </ul>
  </article>

  <article className="feature-card card-3d">
    <h3 className="feature-title">Cost Optimization Model</h3>
    <ul className="feature-bullets">
      <li>Time + money + effort balancing</li>
      <li>Multi-route comparison engine</li>
      <li>Smart commuter decision system</li>
    </ul>
  </article>

  <article className="feature-card card-3d">
    <h3 className="feature-title">Live Simulation Engine</h3>
    <ul className="feature-bullets">
      <li>Real-time traffic simulation</li>
      <li>High-performance graph updates</li>
      <li>Scalable routing system</li>
    </ul>
  </article>

  {/* NEW FEATURE 1 */}
  <article className="feature-card card-3d">
    <h3 className="feature-title">AI Smart Route Advisor</h3>
    <ul className="feature-bullets">
      <li>Predicts best route using historical traffic patterns</li>
      <li>Suggests fastest vs cheapest travel options</li>
      <li>Learns user commuting behavior over time</li>
    </ul>
  </article>

  {/* NEW FEATURE 2 */}
  <article className="feature-card card-3d">
    <h3 className="feature-title">Emergency Priority Routing</h3>
    <ul className="feature-bullets">
      <li>Fastest path for ambulances & emergency cases</li>
      <li>Bypasses congested and blocked roads instantly</li>
      <li>Priority-based dynamic rerouting system</li>
    </ul>
  </article>

</div>
</section>

      {/* Stats Section */}
      <section id="stats" className={`section stats-grid ${isVisible.stats ? 'slide-in' : ''}`}>
        <div className="stat-item">
          <span className="stat-number" ref={(el) => (statRefs.current[0] = el)}>
            {formatCounter(0, counterValues.faster)}
          </span>
          <h3>Faster Routes</h3>
        </div>
        <div className="stat-item">
          <span className="stat-number" ref={(el) => (statRefs.current[1] = el)}>
            {formatCounter(1, counterValues.goli)}
          </span>
          <h3>Goli Coverage</h3>
        </div>
        <div className="stat-item">
          <span className="stat-number" ref={(el) => (statRefs.current[2] = el)}>
            {formatCounter(2, counterValues.reroute)}
          </span>
          <h3>Re-Route Time</h3>
        </div>
        <div className="stat-item">
          <span className="stat-number" ref={(el) => (statRefs.current[3] = el)}>
            {formatCounter(3, counterValues.modes)}
          </span>
          <h3>Transport Modes</h3>
        </div>
      </section>

{/* About Us Section */}
<section id="about" className={`section about-section ${isVisible.about ? 'slide-in' : ''}`}>
  <h2 className="section-title neon-glow">About GoliTransit</h2>

  <p className="about-intro">
    Smarter navigation for Dhaka’s chaotic streets—powered by real-time data, AI routing, and hyper-local intelligence.
  </p>

  <div className="about-grid stylish-grid">

    <div className="about-card feature-card card-3d hover-glow">
      <h3>Our Vision</h3>
      <p>
        Transform urban mobility by making every journey faster, smarter, and stress-free—
        even in the busiest streets of Dhaka.
      </p>
    </div>

    <div className="about-card feature-card card-3d hover-glow">
      <h3>Smart Intelligence</h3>
      <p>
        Our system continuously learns from traffic patterns, user behavior, and real-time events
        to deliver adaptive and optimized routes.
      </p>
    </div>

    <div className="about-card feature-card card-3d hover-glow">
      <h3>Powerful Technology</h3>
      <p>
        Built with advanced algorithms like A* and real-time graph updates, combined with 3D visualization
        for a next-gen navigation experience.
      </p>
    </div>

    <div className="about-card feature-card card-3d hover-glow">
      <h3>Built for Dhaka</h3>
      <p>
        Designed specifically for Dhaka’s unique transport system—rickshaws, narrow alleys,
        and unpredictable traffic conditions.
      </p>
    </div>

  </div>
</section>
{/* Contact Us Section */}
<section id="contact" className={`section contact-section ${isVisible.contact ? 'slide-in' : ''}`}>
  <h2 className="section-title neon-glow">Connect With Us</h2>

  <div className="contact-grid stylish-grid">

   <div className="contact-info glass-card">

  <div className="location-badge">Dhaka, Bangladesh</div>

  <div className="contact-item">
    <span className="label">Email</span>
    <div className="value">
      <strong>abcd@golitranist.com</strong>
    </div>
  </div>

  <div className="contact-item">
    <span className="label">Phone</span>
    <div className="value">
      <strong>+880 196 877 6048</strong>
    </div>
  </div>

  <div className="contact-item">
    <span className="label">Office</span>
    <div className="value">
      <strong>Eastern Galaxy, 109, Katasur, Sher-e-Bangla Road, Mohammadpur Dhaka-1207</strong>
    </div>
  </div>



</div>

    <form className="contact-form glass-card" onSubmit={(e) => e.preventDefault()}>
  
  <h2 className="section-title neon-glow" style={{marginBottom: '1.5rem'}}>
    Contact Us
  </h2>

  <div className="floating-group">
    <input type="text" placeholder=" " required />
    <label>Your Name</label>
  </div>

  <div className="floating-group">
    <input type="email" placeholder=" " required />
    <label>Your Email</label>
  </div>

  <div className="floating-group">
    <textarea placeholder=" " rows="4" required></textarea>
    <label>Your Message</label>
  </div>

  <button type="submit" className="submit-btn">
    <span className="btn-text">Send Message</span>
    <span className="btn-success">Sent ✓</span>
  </button>

</form>

  </div>
</section>
      {/* Final CTA */}
      <section id="cta" className={`section final-cta ${isVisible.cta ? 'slide-in' : ''}`}>
        <h2 style={{ color: 'var(--accent)', marginBottom: '1rem' }}>Navigate Dhaka in 3D</h2>
        <p style={{ maxWidth: '500px', margin: '0 auto 2rem', opacity: 0.9 }}>Experience live 3D traffic simulation and hyper-local routing.</p>
        <button className="primary-btn" style={{ fontSize: '1.2rem', padding: '1.2rem 3rem' }} onClick={onStart}>
          Launch 3D Route Planner
        </button>
        <p style={{ marginTop: '2rem', opacity: 0.7, fontSize: '0.9rem' }}>
          Powered by Three.js • Real-time Graph Engine • Dhaka Optimized
        </p>
      </section>
    </section>
  );
}
