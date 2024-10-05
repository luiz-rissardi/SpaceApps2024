import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PlanetComponent } from "../components/planet/planet.component";
import { KeplerianData } from '../types/KeplerianData';


@Component({
  standalone: true,
  selector: 'app-three-scene',
  templateUrl: './three-scene.component.html',
  styleUrls: ['./three-scene.component.scss'],
  imports: [PlanetComponent]
})
export class ThreeSceneComponent implements OnInit {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  protected scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer | null;
  private controls!: OrbitControls;
  private sun!: THREE.Mesh;

  public planetOrbitalData: KeplerianData[] = [
    //mercury: 
    {
      a: 0.38709927,      // Semieixo maior em UA
      e: 0.20563659,      // Excentricidade
      I: 7.00497902,      // Inclinação em graus
      longPeri: 77.45797628, // Longitude do periélio
      longNode: 48.33076953, // Longitude do nodo ascendente
      n: 4.09233445,      // Movimento médio em graus/dia
      T: 2451545.0,       // Época J2000 (periélio em Dias Julianos)
    },
    //venus:
    {
      a: 0.72333656,
      e: 0.00677672,
      I: 3.39476065,
      longPeri: 131.60261678,
      longNode: 74.89942228,
      n: 1.60213053,
      T: 2451545.0,
    },
    //emBary:
    {
      a: 1.00000261,
      e: 0.01671123,
      I: -0.00001531,
      longPeri: 100.46457166,
      longNode: 102.93768193,
      n: 0.0,
      T: 2451545.0,
    },
    //mars:
    {
      a: 1.52371034,
      e: 0.09393410,
      I: 1.84961412,
      longPeri: -23.94336295,
      longNode: 49.55953891,
      n: 0.52402051,
      T: 2451545.0,
    },
    //jupiter:
    {
      a: 5.20287800,
      e: 0.04836284,
      I: 1.30439695,
      longPeri: 244.44481082,
      longNode: 100.47390099,
      n: 0.08308536,
      T: 2451545.0,
    },
    // saturn: 
    {
      a: 9.53667954,
      e: 0.05386179,
      I: 2.48599187,
      longPeri: 303.40541659,
      longNode: 100.46041881,
      n: 0.03344451,
      T: 2451545.0,
    },
    //uranus:
    {
      a: 19.18916464,
      e: 0.04725744,
      I: 0.77319616,
      longPeri: 428.48208275,
      longNode: 74.00595469,
      n: 0.01163550,
      T: 2451545.0,
    },
    //neptune 
    {
      a: 30.06992276,
      e: 0.00859048,
      I: 1.77043447,
      longPeri: -55.12002969,
      longNode: 131.78422754,
      n: 0.00596515,
      T: 2451545.0,
    }
  ];


  ngOnInit() {
    this.initScene();
    this.initSun();
    // this.initMercury();
    // this.drawMercuryOrbit();  // Desenhar a órbita de Mercúrio
    this.checkWebGLSupportAndStart();
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000000);
    this.camera.position.z = 2000;

    const ambientLight = new THREE.AmbientLight(0xffffff, 2);
    this.scene.add(ambientLight);
  }

  initSun() {
    const sunGeometry = new THREE.SphereGeometry(30, 1000, 1000);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: "yellow" });
    this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
    this.scene.add(this.sun);
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
      this.controls.maxDistance = 22000; // Limite máximo de zoom
      this.controls.enableZoom = true;
      this.controls.enablePan = false;

      this.startRendering();
    } else {
      alert("Seu navegador não suporta WebGL. Tente atualizar ou usar outro navegador.");
    }
  }

  startRendering() {
    const animate = () => {
      requestAnimationFrame(animate);

      // Atualiza a posição de Mercúrio com base na data específica
      // this.mercury.position.copy(this.calculateOrbitalPosition(this.mercuryOrbitalData, new Date()));

      this.controls.update();
      this.renderer?.render(this.scene, this.camera);
    };
    animate();
  }

  // private calculateOrbitalPosition(data: any, currentDate: Date): THREE.Vector3 {
  //   const jd = this.getJulianDate(currentDate);
  //   const M = this.calculateMeanAnomaly(data.n, data.T, jd);
  //   const E = this.solveKeplerEquation(M, data.e);
  //   const v = this.calculateTrueAnomaly(E, data.e);

  //   // Cálculo do raio e posição orbital
  //   const r = this.calculateEllipticalRadius(data.a, data.e, v);
  //   const x = r * Math.cos(v);
  //   const y = r * Math.sin(v);

  //   return new THREE.Vector3(x * 1000, y * 1000, 0); // Ajuste de escala
  // }

  // private getJulianDate(date: Date): number {
  //   const time = date.getTime();
  //   return (time / 86400000) + 2440587.5;
  // }

  // private calculateMeanAnomaly(n: number, T: number, jd: number): number {
  //   return THREE.MathUtils.degToRad(n * (jd - T));
  // }

  // private solveKeplerEquation(M: number, e: number): number {
  //   let E = M;
  //   for (let i = 0; i < 10; i++) {
  //     E = M + e * Math.sin(E);
  //   }
  //   return E;
  // }

  // private calculateTrueAnomaly(E: number, e: number): number {
  //   return 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
  // }

  // private calculateEllipticalRadius(a: number, e: number, v: number): number {
  //   return a * (1 - e * e) / (1 + e * Math.cos(v));
  // }

  isWebGLAvailable() {
    try {
      const canvas = document.createElement('canvas');
      return !!window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) {
      return false;
    }
  }
}
