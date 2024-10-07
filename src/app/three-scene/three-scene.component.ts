import { Component, ElementRef, OnInit, signal, ViewChild } from '@angular/core';
import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PlanetComponent } from "../components/planet/planet.component";
import { fromEvent } from 'rxjs';
import { map, throttleTime } from 'rxjs/operators';
import { BodySpacesComponent } from "../components/body-spaces/body-spaces.component";
import { KeplerianObjectData } from '../types/KeplerianData';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-three-scene',
  templateUrl: './three-scene.component.html',
  styleUrls: ['./three-scene.component.scss'],
  imports: [PlanetComponent, BodySpacesComponent, CommonModule]
})
export class ThreeSceneComponent implements OnInit {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  protected scene!: THREE.Scene;
  protected camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer | null;
  private controls!: OrbitControls;
  private sun!: THREE.Mesh;
  protected monthAmmout = signal(0);
  protected dateTarget = signal(new Date())

  protected showPlanets = signal(true);
  protected showSatelites = signal(true);
  protected showAsteroides = signal(true);
  protected showAsteroidesPHA = signal(false);
  protected showLabels = signal(true);

  private raycaster: THREE.Raycaster = new THREE.Raycaster();

  ChangePerTime(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    this.monthAmmout.set(Number(inputElement.value))
  }

  public planetOrbitalData: any[] = [
    // Mercury:
    {
      a: 0.38709927,       // Semieixo maior em UA
      e: 0.20563659,       // Excentricidade
      I: 7.00497902,       // Inclinação em graus
      longPeri: 77.45797628, // Longitude do periélio
      longNode: 48.33076953, // Longitude do nodo ascendente
      n: 4.09233445,       // Movimento médio em graus/dia
      T: 2451545.0,        // Época J2000 (periélio em Dias Julianos)
      L: 252.25032350,     // Longitude média em graus
      color: signal("darkGreen"),
      size: signal(50),
      label: "MERCURY",
      fixedSize: 50
    },
    // Venus:
    {
      a: 0.72333656,
      e: 0.00677672,
      I: 3.39476065,
      longPeri: 131.60261678,
      longNode: 74.89942228,
      n: 1.60213053,
      T: 2451545.0,
      L: 181.97909950,
      color: signal("crimson"),
      size: signal(60),
      label: "VENUS",
      fixedSize: 60
    },
    // Earth:
    {
      a: 1.00000261,
      e: 0.01671123,
      I: -0.00001531,
      longPeri: 100.46457166,
      longNode: 102.93768193,
      n: 0.9856076686,  // Corrigido para um valor mais preciso
      T: 2451545.0,
      L: 100.46691572,      // Longitude média em graus
      color: signal("blue"),
      size: signal(70),
      label: "EARTH",
      fixedSize: 70
    },
    // Mars:
    {
      a: 1.52371034,
      e: 0.09393410,
      I: 1.84961412,
      longPeri: -23.94336295,
      longNode: 49.55953891,
      n: 0.52402051,
      T: 2451545.0,
      L: -4.55343205,       // Longitude média em graus
      color: signal("orange"),
      size: signal(70),
      label: "MARS",
      fixedSize: 70
    },
    // Jupiter:
    {
      a: 5.20288700,       // Semieixo maior em UA
      e: 0.04877501,       // Excentricidade
      I: 1.30439695,       // Inclinação em graus
      longPeri: 243.00528700, // Longitude do periélio
      longNode: 100.47390909, // Longitude do nodo ascendente
      n: 0.08308536,       // Movimento médio em graus/dia
      T: 2451545.0,
      L: 34.35148402,       // Longitude média em graus
      color: signal("brown"),
      size: signal(300),
      label: "JUPITER",
      fixedSize: 300
    },
    // Saturn:
    {
      a: 9.53667594,
      e: 0.05415060,
      I: 2.48599187,
      longPeri: 111.84694350,
      longNode: 113.63998730,
      n: 0.03344446,       // Movimento médio em graus/dia
      T: 2451545.0,
      L: 50.07754432,        // Longitude média em graus
      color: signal("beige"),
      size: signal(350),
      label: "SATURN",
      fixedSize: 350
    },
    // Uranus:
    {
      a: 19.19126393,
      e: 0.04725744,
      I: 0.77263764,
      longPeri: 96.54148528,
      longNode: 74.00595469,
      n: 0.01163550,
      T: 2451545.0,
      L: 313.23218545,       // Longitude média em graus
      color: signal("lightslategrey"),
      size: signal(450),
      label: "URANUS",
      fixedSize: 450
    },
    // Neptune:
    {
      a: 30.06992276,
      e: 0.00859048,
      I: 1.77043447,
      longPeri: 44.96476227,
      longNode: 131.78422754,
      n: 0.00599536,       // Movimento médio em graus/dia
      T: 2451545.0,
      L: 304.88003315,       // Longitude média em graus
      color: signal("darkslategray"),
      size: signal(400),
      label: "NEPTUNE",
      fixedSize: 400
    }
  ];

  public asteroidsData: KeplerianObjectData[] = [
    {
      "id": 4,                       // ID do asteroide
      "label": "4 Vesta",             // Nome do asteroide
      "a": 2.36,                     // Eixo Semi-Maior em AU
      "e": 0.09,                     // Excentricidade
      "I": 7.14,                     // Inclinação em graus
      "longPeri": 152,               // Longitude do Periélio em graus
      "longNode": 104,               // Longitude do Nodo Ascendente em graus
      "n": 0.272,                    // Movimento Médio em graus por dia
      "t": 2460902.224,              // Tempo de passagem pelo periélio
      "pHAs": false,                 // Potencialmente Perigoso?
      "L": 278
    },
    {
      "id": 38,
      "label": " Orus",
      "a": 5.12,                // Eixo Semi-Maior
      "e": 0.0375,              // Excentricidade
      "I": 8.47,                // Inclinação
      "longPeri": 182,          // Longitude do Periélio
      "longNode": 259,          // Longitude do Nodo Ascendente
      "n": 0.085,               // Movimento Médio em graus por dia
      "t": 2460057.101,                // Tempo (se conhecido)
      // "description": "21900 Orus é um asteroide do tipo Jupiter Trojan, conhecido por sua órbita estável e características únicas.",
      "pHAs": false,            // Potencialmente Perigoso?
      "L": 46.2
    },
    {
      "id": 659,
      "label": " Eros",
      "a": 1.46,                // Eixo Semi-Maior em AU
      "e": 0.223,               // Excentricidade
      "I": 10.8,                // Inclinação em graus
      "longPeri": 179, // Longitude do Periélio ajustada
      "longNode": 304, // Longitude do Nodo Ascendente ajustada
      "n": 0.56,                // Movimento Médio em graus por dia
      "t": 2460445.665,         // Tempo de passagem pelo periélio
      // "description": "433 Eros é um asteroide do tipo Amor, conhecido por ser um dos asteroides mais estudados e por sua proximidade com a Terra.",
      "pHAs": false,            // Potencialmente Perigoso?
      "L": 86.7
    },
    {
      "id": 218,
      "label": " Apophis",
      "a": 0.922,                // Eixo Semi-Maior em AU
      "e": 0.191,                // Excentricidade
      "I": 3.34,                 // Inclinação em graus
      "longPeri": 127,           // Longitude do Periélio em graus
      "longNode": 204,           // Longitude do Nodo Ascendente em graus
      "n": 1.11,                 // Movimento Médio em graus por dia
      "t": 2460719.354,          // Tempo de passagem pelo periélio
      "pHAs": true,              // Potencialmente Perigoso?
      "L": 228                   // Longitude Média
    },
    {
      "id": 152,
      "label": " Gaspra",
      "a": 2.21,                // Eixo Semi-Maior em AU
      "e": 0.173,               // Excentricidade
      "I": 4.11,                // Inclinação em graus
      "longPeri": 130,          // Longitude do Periélio em graus
      "longNode": 253,          // Longitude do Nodo Ascendente em graus
      "n": 0.3,                 // Movimento Médio em graus por dia
      "t": 2460823.813,         // Tempo de passagem pelo periélio
      // "description": "951 Gaspra é um asteroide do cinturão principal, conhecido por ser um dos primeiros asteroides a ser visitado por uma sonda espacial.",
      "pHAs": false,            // Potencialmente Perigoso?
      "L": 293                  // Longitude Média
    },
    {
      "id": 101955,
      "label": " Bennu",
      "a": 1.13,                // Eixo Semi-Maior em AU
      "e": 0.204,               // Excentricidade
      "I": 6.03,                // Inclinação em graus
      "longPeri": 66.2,         // Longitude do Periélio em graus
      "longNode": 2.06,         // Longitude do Nodo Ascendente em graus
      "n": 0.824,               // Movimento Médio em graus por dia
      "t": 2455439.142,         // Tempo de passagem pelo periélio
      "pHAs": true,             // Potencialmente Perigoso?
      "L": 102                  // Longitude Média
    },
    {
      "id": 243,                     // ID do asteroide
      "label": " Ida",             // Nome do asteroide
      "a": 2.86,                     // Eixo Semi-Maior em AU
      "e": 0.0447,                   // Excentricidade
      "I": 1.13,                     // Inclinação em graus
      "longPeri": 114,               // Longitude do Periélio em graus
      "longNode": 324,               // Longitude do Nodo Ascendente em graus
      "n": 0.204,                    // Movimento Médio em graus por dia
      "t": 2460960.542,              // Tempo de passagem pelo periélio
      "pHAs": false,                 // Potencialmente Perigoso?
      "L": 287                       // Longitude Média
    },
    {
      "id": 5535,
      "label": " Annefrank",
      "a": 2.21,
      "e": 0.0629,
      "I": 4.25,
      "longPeri": 9.3,
      "longNode": 121,
      "n": 0.299,
      "t": 2460328.349,
      "pHAs": false,
      "L": 81.5
    },
    {
      "id": 9969,                   // ID do asteroide
      "label": " Braille",       // Nome do asteroide
      "a": 2.34,                    // Eixo Semi-Maior em AU
      "e": 0.434,                   // Excentricidade
      "I": 29,                      // Inclinação em graus
      "longPeri": 356,              // Longitude do Periélio em graus
      "longNode": 242,              // Longitude do Nodo Ascendente em graus
      "n": 0.275,                   // Movimento Médio em graus por dia
      "t": 2460555.541,             // Tempo de passagem pelo periélio
      "pHAs": false,                // Potencialmente Perigoso?
      "L": 12.4                     // Longitude Média
    },
    {
      "id": 11351,
      "label": " Leucus",
      "a": 5.31,
      "e": 0.0658,
      "I": 11.5,
      "longPeri": 162,
      "longNode": 251,
      "n": 0.0806,
      "t": 2459467.968,
      "pHAs": false,
      "L": 91.3
    },
    {
      "id": 15094,
      "label": " Polymele",
      "a": 5.19,
      "e": 0.0968,
      "I": 13,
      "longPeri": 5.46,
      "longNode": 50.3,
      "n": 0.0834,
      "t": 2459476.797,
      "pHAs": false,
      "L": 93.8
    },
    {
      "id": 25143,
      "label": "Itokawa",
      "a": 1.32,
      "e": 0.28,
      "I": 1.62,
      "longPeri": 163,
      "longNode": 69.1,
      "n": 0.647,
      "t": 2460380.088,
      "pHAs": true,
      "L": 143
    },
    {
      "id": 21,
      "label": "Lutetia",
      "a": 2.43,
      "e": 0.165,
      "I": 3.06,
      "longPeri": 250,
      "longNode": 80.8,
      "n": 0.26,
      "t": 2460050.015,
      "pHAs": false,
      "L": 143
    },
    {
      "id": 103,
      "label": "Hartley 2",
      "a": 3.48,
      "e": 0.694,
      "I": 13.6,
      "longPeri": 181,
      "longNode": 220,
      "n": 0.152,
      "t": 2460230.014,
      "pHAs": false,
      "L": 347
    },
    {
      "id": 52246,
      "label": "Donaldjohanson",
      "a": 2.38,
      "e": 0.187,
      "I": 4.43,
      "longPeri": 213,
      "longNode": 263,
      "n": 0.268,
      "t": 2460648.181,
      "pHAs": false,
      "L": 347
    },
    {
      "id": 162173,
      "label": "Ryugu",
      "a": 1.19,
      "e": 0.191,
      "I": 5.87,
      "longPeri": 212,
      "longNode": 251,
      "n": 0.758,
      "t": 2460643.587,
      "pHAs": true,
      "L": 327
    },
    {
      "id": 32605,
      "label": "Lucy",
      "a": 3.0,
      "e": 0.215,
      "I": 5.44,
      "longPeri": 212,
      "longNode": 48.4,
      "n": 0.19,
      "t": 2461197.486,
      "pHAs": false,
      "L": 247
    },
    {
      "id": 16,
      "label": "Psyche",
      "a": 2.92,
      "e": 0.134,
      "I": 3.1,
      "longPeri": 230,
      "longNode": 150,
      "n": 0.197,
      "t": 2460793.803,
      "pHAs": false,
      "L": 322
    },
    {
      "id": 3548,
      "label": "Eurybates",
      "a": 5.21,
      "e": 0.0912,
      "I": 8.05,
      "longPeri": 28.2,
      "longNode": 43.5,
      "n": 0.0828,
      "t": 2459675.649,
      "pHAs": false,
      "L": 76.6
    },
    {
      "id": 152830,
      "label": "Dinkinesh",
      "a": 2.19,
      "e": 0.112,
      "I": 2.09,
      "longPeri": 66.9,
      "longNode": 21.4,
      "n": 0.304,
      "t": 2461103.005,
      "pHAs": false,
      "L": 207
    },
    
  ]

  public sateliteData : KeplerianObjectData[] = [
    {
      "id": 233332,
      "label": "Psyche",
      "a": 2.922,
      "e": 0.140,
      "I": 3.09,
      "longPeri": 151.44,
      "longNode": 88.94,
      "n": 0.187,
      "t": null,
      "pHAs": false,
      L:0
    },
    {
      "id": 233232,
      "label": "OSIRIS-APEX",
      "a": 1.126,
      "e": 0.2,
      "I": 7.01,
      "longPeri": 102.0,
      "longNode": 76.0,
      "n": 0.252,
      "t": null,
      "pHAs": false,
      L:0
    }
  ]



  ngOnInit() {
    this.initScene();
    this.initSun();
    this.checkWebGLSupportAndStart();
    this.setupMouseMoveObservable()
  }


  private setupMouseMoveObservable(): void {
    const mouseMove$ = fromEvent<MouseEvent>(window, 'mousemove').pipe(
      throttleTime(16), // Limita a frequência dos eventos a 16ms (~60fps)
      map(event => ({
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: -(event.clientY / window.innerHeight) * 2 + 1
      }))
    );

    mouseMove$.subscribe(mouse => {
      this.raycaster.setFromCamera(new THREE.Vector2(mouse.x, mouse.y), this.camera); // Usa a câmera atual
      const intersects = this.raycaster.intersectObjects(this.scene.children);

      if (intersects.length > 0) {
        const hoveredObject = intersects[0].object;
        const objectLabel = hoveredObject.userData['planetName'];
        const isPlanet = hoveredObject.userData['isPlanet'];
        const objectData = [...this.asteroidsData, ...this.planetOrbitalData].find(el => el.label === objectLabel);
        if (objectData && isPlanet) {
          objectData?.size.set(objectData.fixedSize + (objectData.fixedSize / 100 * 50));
        }
      } else {
        this.planetOrbitalData.forEach(el => el.size.set(el.fixedSize));
      }
    });
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000000);
    this.camera.position.z = 2000;
    this.camera.position.y = -2000;

    const ambientLight = new THREE.AmbientLight(0xffffff, 2);
    this.scene.add(ambientLight);
  }

  initSun() {
    const sunGeometry = new THREE.SphereGeometry(100, 1000, 1000);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: "yellow", });
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
      // this.controls.enablePan = false;

      this.startRendering();
    } else {
      alert("Seu navegador não suporta WebGL. Tente atualizar ou usar outro navegador.");
    }
  }

  startRendering() {
    const animate = () => {
      requestAnimationFrame(animate);

      this.controls.update();
      this.renderer?.render(this.scene, this.camera);
    };
    animate();
  }

  isWebGLAvailable() {
    try {
      const canvas = document.createElement('canvas');
      return !!window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) {
      return false;
    }
  }
}
