import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

@Component({
  standalone: true,
  selector: 'app-three-scene',
  templateUrl: './three-scene.component.html',
  styleUrls: ['./three-scene.component.scss']
})
export class ThreeSceneComponent implements OnInit {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer | null;
  private controls!: OrbitControls;
  private mercury!: THREE.Mesh;
  private sun!: THREE.Mesh;
  private orbit!: THREE.Line;
  private textureLoader!: THREE.TextureLoader;

  ngOnInit() {
    this.initScene();
    this.initSun();
    this.initMercury(); // Agora estamos inicializando Mercúrio
    this.initOrbit(); // Inicializa a órbita de Mercúrio
    this.checkWebGLSupportAndStart();
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.textureLoader = new THREE.TextureLoader();
    this.camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000000);
    this.camera.position.z = 10000;

    const ambientLight = new THREE.AmbientLight(0xffffff, 2);
    this.scene.add(ambientLight);
  }

  initSun() {
    const sunGeometry = new THREE.SphereGeometry(100, 1000, 1000);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: "yellow" });
    this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
    this.scene.add(this.sun);
  }

  initMercury() {
    const mercuryData = {
      a: 0.38709843,      // Semieixo maior em AU
      e: 0.20563661,      // Excentricidade
      I: 7.00559432,      // Inclinação em graus
      L: 252.25166724,    // Longitude média
      longPeri: 77.45771895, // Longitude do periélio
      longNode: 48.33961819, // Longitude do nodo ascendente
      rho: 6              // Distância em AU ajustada para o sistema
    };

    const material = new THREE.MeshBasicMaterial({
      color: "gray"
    });
    const geometry = new THREE.SphereGeometry(100, 100, 100);
    this.mercury = new THREE.Mesh(geometry, material);
    this.mercury.position.copy(this.calculateOrbitalPosition(mercuryData));
    this.scene.add(this.mercury);
    this.initOrbit();
  }

  initOrbit() {
    const mercuryData = {
      a: 0.38709843, // Semieixo maior de Mercúrio ajustado para a escala
      e: 0.20563661, // Excentricidade
      I: 7.00559432  // Inclinação
    };

    const points = [];

    // Gera pontos da órbita com excentricidade
    for (let i = 0; i <= 64; i++) {
      const theta = (i / 64) * Math.PI * 2;
      const r = this.calculateEllipticalRadius(mercuryData.a, mercuryData.e, theta); // Raio elíptico
      points.push(new THREE.Vector3(Math.cos(theta) * r * 1000, Math.sin(theta) * r * 1000, 0)); // Mantendo Z fixo
    }

    const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);

    const orbitMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      linewidth: 2
    });

    const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
    this.scene.add(orbitLine);
  }

  checkWebGLSupportAndStart() {
    if (this.isWebGLAvailable()) {
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvasRef.nativeElement });
      this.renderer.setSize(window.innerWidth, window.innerHeight);

      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.screenSpacePanning = false;
      this.controls.maxPolarAngle = Math.PI;
      this.controls.enableZoom = true;
      this.controls.enablePan = false;

      this.startRendering();
    } else {
      alert("Seu navegador não suporta WebGL. Tente atualizar ou usar outro navegador.");
    }
  }

  isWebGLAvailable() {
    try {
      const canvas = document.createElement('canvas');
      return !!window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) {
      return false;
    }
  }

  startRendering() {
    let t = 0;
    const animate = () => {
      requestAnimationFrame(animate);

      // Atualiza a posição de Mercúrio com base no tempo
      const position = this.calculateOrbitalPosition({
        a: 0.38709843, // Semieixo maior de Mercúrio
        e: 0.20563661, // Excentricidade
        I: 7.00559432, // Inclinação
        L: 252.25166724 + t, // Simula o movimento ao longo do tempo
        longPeri: 77.45771895,
        longNode: 48.33961819,
        rho: 6
      });

      this.mercury.position.copy(position);
      this.controls.update();
      this.renderer?.render(this.scene, this.camera);

      t += 0.1; // Incremento de tempo
    };
    animate();
  }

  // Cálculo do raio da órbita elíptica
  private calculateEllipticalRadius(a: number, e: number, theta: number): number {
    return (a * (1 - e * e)) / (1 + e * Math.cos(theta));
  }

  // Cálculo da posição 3D de Mercúrio
  private calculateOrbitalPosition(data: { a: number; e: number; I: number; L: number; longPeri: number; longNode: number; rho: number }) {
    const theta = this.arcsecondsToRadians(data.L); // Ângulo atual ao longo da órbita
    const r = this.calculateEllipticalRadius(data.a, data.e, theta); // Distância ao longo da órbita

    // Inclinação e outros ajustes para o plano de Mercúrio
    const inclinationRad = this.arcsecondsToRadians(data.I);
    const nodeRad = this.arcsecondsToRadians(data.longNode);
    const periRad = this.arcsecondsToRadians(data.longPeri);

    const x = r * Math.cos(theta + periRad);
    const y = r * Math.sin(theta + periRad);

    const rotatedX = x * Math.cos(inclinationRad) - y * Math.sin(inclinationRad);
    const rotatedY = x * Math.sin(inclinationRad) + y * Math.cos(inclinationRad);

    return new THREE.Vector3(rotatedX * 1000, rotatedY * 1000, 0);
  }

  private arcsecondsToRadians(arcseconds: number) {
    return arcseconds * (Math.PI / 180 / 3600);
  }
}
