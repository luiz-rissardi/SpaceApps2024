import { Component, ElementRef, OnInit, signal, ViewChild } from '@angular/core';
import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PlanetComponent } from "../components/planet/planet.component";
import { fromEvent } from 'rxjs';
import { map, throttleTime, withLatestFrom } from 'rxjs/operators';

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
  protected camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer | null;
  private controls!: OrbitControls;
  private sun!: THREE.Mesh;


  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();


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
      color: signal("gray"),
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
      size: signal(400),
      label: "JUPITER",
      fixedSize: 400
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
      color: signal("cadetblue"),
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
  

  ngOnInit() {
    this.initScene();
    this.initSun();
    this.checkWebGLSupportAndStart();
    this.setupMouseMoveObservable()
    this.setupClickObservable()
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
      this.raycaster.setFromCamera(new THREE.Vector2(mouse.x,mouse.y), this.camera); // Usa a câmera atual
      const intersects = this.raycaster.intersectObjects(this.scene.children);

      if (intersects.length > 0) {
        const hoveredObject = intersects[0].object;
        const planetLabel = hoveredObject.userData['planetName'];
        const planetData = this.planetOrbitalData.find(el => el.label === planetLabel);
        
        if (planetData) {
          planetData.size.set(planetData.fixedSize + (planetData.fixedSize / 100 * 50));
        }
      } else {
        // Reseta o tamanho dos planetas se não houver interseções
        this.planetOrbitalData.forEach(el => el.size.set(el.fixedSize));
      }
    });
  }

  private setupClickObservable(): void {
    const mouseClick$ = fromEvent<MouseEvent>(window, 'click').pipe(
      map(event => ({
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: -(event.clientY / window.innerHeight) * 2 + 1
      }))
    );
  
    mouseClick$.subscribe(mouse => {
      // Atualiza a posição do mouse e o raycaster com a câmera atual
      this.mouse.set(mouse.x, mouse.y);
      this.raycaster.setFromCamera(this.mouse, this.camera);
  
      // Calcula os objetos intersectados
      const intersects = this.raycaster.intersectObjects(this.scene.children);
  
      if (intersects.length > 0) {
        // O primeiro objeto intersectado é o planeta
        const clickedObject = intersects[0].object;
        const planetLabel = clickedObject.userData['planetName'];
          
        console.log(planetLabel); 
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
    const sunGeometry = new THREE.SphereGeometry(50, 1000, 1000);
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
