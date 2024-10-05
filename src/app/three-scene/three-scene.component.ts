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
  private earth!: THREE.Mesh;
  private sun!: THREE.Mesh;
  private orbit!: THREE.Line; // Adicionado para representar a órbita
  private textureLoader!: THREE.TextureLoader;

  ngOnInit() {
    this.initScene();
    this.initSun();
    this.initEarth();
    this.initOrbit(); // Inicializa a órbita da Terra
    this.checkWebGLSupportAndStart();
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.textureLoader = new THREE.TextureLoader();
    this.camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000000);
    this.camera.position.z = 10000;
    // this.camera.position.x = 1000;

    const ambientLight = new THREE.AmbientLight(0xffffff, 2); // Cor branca, intensidade 2
    this.scene.add(ambientLight);
  }

  initSun() {
    const sunGeometry = new THREE.SphereGeometry(1000, 1000, 1000);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: "yellow" });
    this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
    this.scene.add(this.sun);
  }

  initEarth() {
    // so mudando os dados 
    const dataEarth = {
      lambda: 15,
      phi: 1,
      rho: 1 
    }
    const material = new THREE.MeshBasicMaterial({
      color: "blue"
    });
    const geometry = new THREE.SphereGeometry(100, 100, 100);
    this.earth = new THREE.Mesh(geometry, material);
    this.earth.position.copy(this.calculate3DPosition(dataEarth));
    this.scene.add(this.earth);
    this.initOrbit()
  }

  initOrbit() {
    const radius = 6 * 1000; // Raio da órbita da Terra
    const points = [];

    for (let i = 0; i <= 64; i++) {
      const theta = (i / 64) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(theta) * radius, Math.sin(theta) * radius, 0)); // Mantendo Z fixo
    }
    const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);

    // Define o material da linha (não tracejada)
    const orbitMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff, // Cor da linha
      linewidth: 2 // Largura da linha
    });

    const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
    this.scene.add(orbitLine);
  }

  checkWebGLSupportAndStart() {
    // Verifica suporte ao WebGL
    if (this.isWebGLAvailable()) {
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvasRef.nativeElement });
      this.renderer.setSize(window.innerWidth, window.innerHeight);

      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true; // Efeito de suavização para a rotação
      this.controls.dampingFactor = 0.05; // Fator de amortecimento
      this.controls.screenSpacePanning = false; // Não permite que a câmera se mova na tela
      this.controls.maxPolarAngle = Math.PI; // Permite rotação total até 180 graus no eixo vertical
      this.controls.enableZoom = true; // Permitir zoom
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

      // Atualiza a posição da Terra com base no tempo
      const position = this.calculate3DPosition({
        lambda: 15 + t * (360 / 365), // Simula a revolução da Terra ao longo do ano
        phi: 1,
        rho: 1 // 6 * 1000 km
      });

      this.earth.position.copy(position);
      this.controls.update();
      this.renderer?.render(this.scene, this.camera);

      t += 1000; // Incrementar o tempo
    };
    animate();
  }

  private calculate3DPosition(data: { lambda: number; phi: number; rho: number }) {

    const lambdaRad = this.arcsecondsToRadians(data.lambda);
    const phiRad = this.arcsecondsToRadians(data.phi);
    const rhoKm = data.rho * 1000; // Convertendo para km

    const x = rhoKm * Math.cos(phiRad) * Math.cos(lambdaRad);
    const y = rhoKm * Math.cos(phiRad) * Math.sin(lambdaRad);
    const z = rhoKm * Math.sin(phiRad);

    return new THREE.Vector3(x, y, z);
  }

  private arcsecondsToRadians(arcseconds: number) {
    return arcseconds * (Math.PI / 180 / 3600);
  }
}
