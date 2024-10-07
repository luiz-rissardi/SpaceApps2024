import { AfterViewInit, Component, effect, input, WritableSignal } from '@angular/core';
import * as THREE from "three";
import { KeplerianData } from '../../types/KeplerianData';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';


@Component({
  selector: 'app-planet',
  standalone: true,
  imports: [],
  templateUrl: './planet.component.html',
  styleUrls: ['./planet.component.scss']
})
export class PlanetComponent implements AfterViewInit {
  public scene = input<THREE.Scene>(); // this is a signal type
  public camera = input<THREE.Camera>(); // this is a signal type
  public keplerianData = input<KeplerianData>();
  public planetColor = input<string>("white");
  public monthAmmount = input<number>(0)
  public dateCurrent = input<WritableSignal<Date>>()

  public isShow = input<WritableSignal<boolean>>();
  public isShowLabel = input<WritableSignal<boolean>>();

  // Data alvo que pode ser alterada
  public targetDate: Date = new Date("2024/10/05"); // Data inicial
  private startDate: Date = new Date(Date.UTC(2000, 0, 1, 12, 0, 0)); // Data de referência para calcular o tempo
  private julianDate: number;
  private planet!: THREE.Mesh;
  private orbit !: THREE.Line;
  private label !: THREE.Mesh;

  constructor() {
    effect(() => {
    
      this.updatePlanetSize();
      this.planet.visible = this.isShow()()
      this.orbit.visible = this.isShow()()
      this.label.visible = this.isShowLabel()()

    });
  }

  ngAfterViewInit(): void {
    this.drawPlanetOrbit();
    this.initPlanet();
    this.initLabel()
    this.startAnimation(); 
  }

  private updatePlanetSize() {
    if (this.planet) {
      // Atualizar a geometria do planeta com o novo tamanho
      const newGeometry = new THREE.SphereGeometry(this.keplerianData().size(), 100, 100);
      this.planet.geometry.dispose();  // Liberar a geometria antiga
      this.planet.geometry = newGeometry;  // Substituir pela nova geometria
    }
  }

  startAnimation() {
    const animate = () => {
      // Define as datas mínima e máxima
      const minDate = new Date(1989, 11, 31); // 31 de dezembro de 1989
      const maxDate = new Date(2033, 11, 31); // 31 de dezembro de 2033

      requestAnimationFrame(animate);
      
      
      // Calcula a nova data
      const newDate = new Date(this.targetDate);
      newDate.setDate(newDate.getDate() + this.monthAmmount()); // Avança pelos meses
    
      // Verifica se a nova data está dentro dos limites
      if (newDate >= minDate && newDate <= maxDate) {
        this.targetDate = newDate; // Atualiza a data se estiver dentro dos limites
        this.dateCurrent().set(newDate)
        this.updatePlanetPosition(); // Atualiza a posição do planeta
      }
    };
    
    animate(); // Chama a função de animação
  }

  private initLabel() {
    const loader = new FontLoader();
    loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', (font) => {
      const textGeometry = new TextGeometry(this.keplerianData().label, {
        font: font,
        size: this.keplerianData().size() * 1, // Ajuste o tamanho do texto em relação ao tamanho do planeta
        depth: this.keplerianData().size() * 1, // Altura do texto (deve ser pequeno para evitar sobreposição)
        curveSegments: 12,
      });

      const textMaterial = new THREE.MeshBasicMaterial({ color: this.planetColor() });
      this.label = new THREE.Mesh(textGeometry, textMaterial);
      this.label.lookAt(this.camera().position);
      this.label.position.y += 1.5 * this.keplerianData().size()
      this.animatedLabel(this.label);
      this.planet.add(this.label); // Adiciona o texto à cena
    });
  }

  private animatedLabel(textMesh: THREE.Mesh) {
    const animate = () => {
      requestAnimationFrame(animate);
      textMesh.lookAt(this.camera().position);
    };
    animate();
  }

  initPlanet() {
    const material = new THREE.MeshBasicMaterial({
      color: this.planetColor()
    });
    const geometry = new THREE.SphereGeometry(this.keplerianData().size(), 100, 100);
    this.planet = new THREE.Mesh(geometry, material);
    // Inicializa a posição do planeta
    this.updatePlanetPosition();

    let clickableGeometry = null;
    if (["JUPITER", "SATURN"].includes(this.keplerianData().label)) {
      clickableGeometry = new THREE.SphereGeometry(this.keplerianData().size() * 3, 100, 100); // Aumenta o tamanho
    } else {

    }
    clickableGeometry = new THREE.SphereGeometry(this.keplerianData().size() * 3, 100, 100); // Aumenta o tamanho
    const clickableMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }); // Torna o material invisível
    const clickableMesh = new THREE.Mesh(clickableGeometry, clickableMaterial);
    clickableMesh.userData = { planetName: this.keplerianData().label, isPlanet:true }

    this.planet.add(clickableMesh);

    this.scene()?.add(this.planet);
  }

  private drawPlanetOrbit() {
    const points: THREE.Vector3[] = [];
    const segments = 128;

    // Calcular pontos ao longo da órbita elíptica
    for (let i = 0; i <= segments; i++) {
      const M = (i * 360) / segments; // Anomalia média em graus
      const E = this.solveKeplerEquation(THREE.MathUtils.degToRad(M), this.keplerianData().e);
      const v = this.calculateTrueAnomaly(E, this.keplerianData().e);

      const r = this.calculateEllipticalRadius(this.keplerianData().a, this.keplerianData().e, v);
      const x = r * Math.cos(v);
      const y = r * Math.sin(v);

      points.push(new THREE.Vector3(x * 1000, y * 1000, 0)); // Escala para visualização
    }

    const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const orbitMaterial = new THREE.LineBasicMaterial({ color: this.planetColor() });
    this.orbit = new THREE.Line(orbitGeometry, orbitMaterial);

    this.scene().add(this.orbit); // Adicionar órbita à cena
  }

  // Método para atualizar a posição do planeta
  updatePlanetPosition() {
    this.julianDate = this.getJulianDate(this.targetDate); // Atualiza a data juliana

    // Calcular o número de dias entre a data de referência e a data alvo
    const daysSinceStart = Math.floor((this.targetDate.getTime() - this.startDate.getTime()) / (1000 * 60 * 60 * 24));

    const position = calculatePosition(
      this.keplerianData().a,
      this.keplerianData().e,
      this.degToRad(this.keplerianData().I),
      this.degToRad(this.keplerianData().longPeri),
      this.degToRad(this.keplerianData().longNode),
      this.keplerianData().L + (this.keplerianData().n * daysSinceStart), // Adiciona a anomalia média ao longo do tempo
      this.julianDate // Usar a data juliana atualizada
    );

    const updatedPosition = new THREE.Vector3(position.x * 1000, position.y * 1000, 0);
    this.planet.position.copy(updatedPosition);
  }

  private solveKeplerEquation(M: number, e: number): number {
    let E = M; // Chute inicial
    const tolerance = 1e-6; // Tolerância para convergência
    let delta = 1;

    while (Math.abs(delta) > tolerance) {
      delta = M - (E - e * Math.sin(E));
      E += delta;
    }
    return E;
  }

  private calculateTrueAnomaly(E: number, e: number): number {
    return 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
  }

  private calculateEllipticalRadius(a: number, e: number, v: number): number {
    return a * (1 - e * e) / (1 + e * Math.cos(v));
  }

  // Função para converter graus para radianos
  private degToRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Função para calcular a data juliana
  private getJulianDate(date: Date): number {
    const a = Math.floor((14 - date.getUTCMonth() + 1) / 12);
    const y = date.getUTCFullYear() + 4800 - a;
    const m = date.getUTCMonth() + 1 + 12 * a - 3;

    const julian = date.getUTCDate() + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
    return julian;
  }
}

// Função para calcular a posição em 3D
function calculatePosition(a: number, e: number, I: number, omega: number, Omega: number, L: number, T: number) {
  const aAdjusted = a; // a0 inicial (pode ser ajustado conforme necessário)

  // Cálculo da Anomalia Média (M)
  let M = L - omega; // Calcule M
  M = degToRad(M % 360); // Converter para radianos e manter no intervalo [-180°, +180°]

  // Cálculo da Anomalia Excêntrica (E)
  const E = keplerEquation(M, e);

  // Coordenadas heliocêntricas no plano orbital
  const xPrime = aAdjusted * (Math.cos(E) - e);
  const yPrime = aAdjusted * Math.sqrt(1 - e ** 2) * Math.sin(E);
  const zPrime = 0;

  // Funções de rotação
  const Rz = (angle: number) => {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return [
      [c, -s, 0],
      [s, c, 0],
      [0, 0, 1]
    ];
  };

  const Rx = (angle: number) => {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return [
      [1, 0, 0],
      [0, c, -s],
      [0, s, c]
    ];
  };

  // Transformações de coordenadas para o plano eclíptico
  const rotate = (vec: number[], rotMatrix: number[][]) => {
    const [x, y, z] = vec;
    return [
      rotMatrix[0][0] * x + rotMatrix[0][1] * y + rotMatrix[0][2] * z,
      rotMatrix[1][0] * x + rotMatrix[1][1] * y + rotMatrix[1][2] * z,
      rotMatrix[2][0] * x + rotMatrix[2][1] * y + rotMatrix[2][2] * z,
    ];
  };

  const xOrbital = [xPrime, yPrime, zPrime];

  // Aplicar rotações
  let xEcliptic = rotate(xOrbital, Rz(-degToRad(Omega)));
  xEcliptic = rotate(xEcliptic, Rx(-degToRad(I)));
  xEcliptic = rotate(xEcliptic, Rz(-degToRad(omega)));

  return {
    x: xEcliptic[0],
    y: xEcliptic[1],
    z: xEcliptic[2],
  };
}

// Função para resolver a Equação de Kepler
function keplerEquation(M: number, e: number): number {
  let E = M; // Chute inicial
  const tolerance = 1e-6; // Tolerância
  let delta = 1;

  while (Math.abs(delta) > tolerance) {
    delta = M - (E - e * Math.sin(E));
    E += delta;
  }
  return E;
}

// Função para converter graus para radianos
function degToRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
