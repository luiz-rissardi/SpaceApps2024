import { Component, effect, input, WritableSignal } from '@angular/core';
import * as THREE from "three";
import { KeplerianObjectData } from '../../types/KeplerianData';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';

@Component({
  selector: 'app-body-spaces',
  standalone: true,
  imports: [],
  templateUrl: './body-spaces.component.html',
  styleUrl: './body-spaces.component.scss'
})
export class BodySpacesComponent {
  public scene = input<THREE.Scene>(); // Sinal de tipo para a cena
  public camera = input<THREE.Camera>(); // Sinal de tipo para a câmera
  public objectData = input<KeplerianObjectData>(); // Dados do objecte
  public objectColor = input<string>("gray"); // Cor do objecte
  public objectize = input<number>(10); // Tamanho do objecte

  public isShow = input<WritableSignal<boolean>>();
  public isShowLabel = input<WritableSignal<boolean>>();
  public isshowAsteroidesPHA = input<WritableSignal<boolean>>();

  public targetDate: Date = new Date(); // Data alvo
  private startDate: Date = new Date(Date.UTC(2000, 0, 1, 12, 0, 0)); // Data de referência
  private julianDate: number;
  private object!: THREE.Mesh;
  private orbit!: THREE.Line;
  private label!: THREE.Mesh;

  public monthAmmount = input<number>(0)

  constructor() {
    effect(() => {
      this.updateobjectize();

      if (this.object) {
        this.object.visible = this.isShow()();
      }
      if (this.orbit) {
        this.orbit.visible = this.isShow()();
      }
      if (this.label) {
        this.label.visible = this.isShowLabel()();
      }
      
      if (this.isshowAsteroidesPHA()()) {
        if (this.objectData().pHAs == false) {
          if (this.object) {
            this.orbit.visible = false;
            this.object.visible = false;
          }
        } else {
          if (this.object) {
            this.object.visible = true;
            this.orbit.visible = true;
          }
        }
      }
    });

  }

  ngAfterViewInit(): void {
    this.drawobjectOrbit();
    this.initobject();
    this.initLabel();
    this.startAnimation()
  }

  private updateobjectize() {
    if (this.object) {
      // Atualiza a geometria do objecte com o novo tamanho
      const newGeometry = new THREE.SphereGeometry(30, 32, 32);
      this.object.geometry.dispose(); // Libera a geometria antiga
      this.object.geometry = newGeometry; // Substitui pela nova geometria
    }
  }

  private initLabel() {
    const loader = new FontLoader();
    loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', (font) => {
      const textGeometry = new TextGeometry(this.objectData().label, {
        font: font,
        size: 50, // Ajuste o tamanho do texto em relação ao tamanho do planeta
        depth: 50, // Altura do texto (deve ser pequeno para evitar sobreposição)
        curveSegments: 12,
      });

      const textMaterial = new THREE.MeshBasicMaterial({ color: this.objectColor() });
      this.label = new THREE.Mesh(textGeometry, textMaterial);
      this.label.lookAt(this.camera().position);
      this.label.position.y += 50
      this.animatedLabel(this.label);
      this.object.add(this.label); // Adiciona o texto à cena
    });
  }

  private animatedLabel(textMesh: THREE.Mesh) {
    const animate = () => {
      requestAnimationFrame(animate);
      textMesh.lookAt(this.camera().position);
    };
    animate();
  }

  private initobject() {
    const material = new THREE.MeshBasicMaterial({
      color: this.objectColor()
    });
    const geometry = new THREE.SphereGeometry(this.objectize(), 32, 32);
    this.object = new THREE.Mesh(geometry, material);
    this.updateobjectPosition();

    this.scene()?.add(this.object); // Adiciona o objecte à cena
  }

  private drawobjectOrbit() {
    const points: THREE.Vector3[] = [];
    const segments = 128;

    // Calcular pontos ao longo da órbita elíptica
    for (let i = 0; i <= segments; i++) {
      const M = (i * 360) / segments; // Anomalia média em graus
      const E = this.solveKeplerEquation(THREE.MathUtils.degToRad(M), this.objectData().e);
      const v = this.calculateTrueAnomaly(E, this.objectData().e);

      const r = this.calculateEllipticalRadius(this.objectData().a, this.objectData().e, v);
      const x = r * Math.cos(v);
      const y = r * Math.sin(v);

      // Adiciona os pontos da órbita
      let orbitPosition = new THREE.Vector3(x * 1000, y * 1000, 0);

      // Aplicar as mesmas rotações usadas para ajustar a posição do objecte
      orbitPosition = this.applyOrbitRotations(orbitPosition);

      points.push(orbitPosition); // Adiciona o ponto ajustado
    }

    const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const orbitMaterial = new THREE.LineBasicMaterial({ color: this.objectColor() });
    this.orbit = new THREE.Line(orbitGeometry, orbitMaterial);

    this.scene().add(this.orbit); // Adiciona a órbita à cena
  }

  // Função para aplicar as rotações nas posições da órbita
  private applyOrbitRotations(position: THREE.Vector3): THREE.Vector3 {
    const RzOmega = Rz(-this.degToRad(this.objectData().longNode)); // Rz da longitude do nodo ascendente
    const RxI = Rx(-this.degToRad(this.objectData().I));           // Rx da inclinação
    const Rzomega = Rz(-this.degToRad(this.objectData().longPeri)); // Rz da longitude do periélio
    const RzCorrection = Rz(Math.PI);                                  // Rotação adicional de 180 graus

    // Aplicar rotações ao ponto da órbita
    position.applyMatrix4(RzOmega);
    position.applyMatrix4(RxI);
    position.applyMatrix4(Rzomega);

    // Aplicar rotação adicional de 180 graus no plano Z
    position.applyMatrix4(RzCorrection);

    return position;
  }


  private updateobjectPosition() {
    this.julianDate = this.getJulianDate(this.targetDate); // Atualiza a data juliana

    // Calcular o número de dias entre a data de referência e a data alvo
    const daysSinceStart = Math.floor((this.targetDate.getTime() - this.startDate.getTime()) / (1000 * 60 * 60 * 24));

    const position = calculatePosition(
      this.objectData().a,
      this.objectData().e,
      this.degToRad(this.objectData().I),
      this.degToRad(this.objectData().longPeri),
      this.degToRad(this.objectData().longNode),
      this.objectData().L + (this.objectData().n * daysSinceStart), // Adiciona a anomalia média ao longo do tempo
      this.julianDate // Usar a data juliana atualizada
    );

    const updatedPosition = new THREE.Vector3(position.x * 1000, position.y * 1000, position.z * 1000);
    this.object.position.copy(updatedPosition);
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

  private degToRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private getJulianDate(date: Date): number {
    const a = Math.floor((14 - date.getUTCMonth() + 1) / 12);
    const y = date.getUTCFullYear() + 4800 - a;
    const m = date.getUTCMonth() + 1 + 12 * a - 3;

    const julian = date.getUTCDate() + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
    return julian;
  }

  startAnimation() {
    const animate = () => {
      requestAnimationFrame(animate);
      this.targetDate.setMonth(this.targetDate.getMonth() + this.monthAmmount()); // Avança um mês
      this.updateobjectPosition(); // Atualiza a posição do planeta
    };
    animate(); // Chama a função de animação
  }

}

// Função para calcular a posição em 3D
function calculatePosition(a: number, e: number, I: number, omega: number, Omega: number, L: number, T: number) {
  const aAdjusted = a; // Eixo semi-maior ajustado

  // Cálculo da Anomalia Média (M)
  let M = L - omega; // Subtrair longitude do periélio da longitude média
  M = degToRad((M + 360) % 360); // Converter para radianos e normalizar

  // Cálculo da Anomalia Excêntrica (E)
  const E = keplerEquation(M, e);

  // Coordenadas heliocêntricas no plano orbital
  const xPrime = aAdjusted * (Math.cos(E) - e);
  const yPrime = aAdjusted * Math.sqrt(1 - e ** 2) * Math.sin(E);
  const zPrime = 0;

  // Matrizes de rotação para transformar para o plano eclíptico
  const RzOmega = Rz(-Omega); // Rz da longitude do nodo ascendente
  const RxI = Rx(-I);         // Rx da inclinação
  const Rzomega = Rz(-omega); // Rz da longitude do periélio
  const RzCorrection = Rz(Math.PI); // Rotação adicional de 180 graus (π radianos)

  // Vetor no plano orbital
  const rVector = new THREE.Vector3(xPrime, yPrime, zPrime);

  // Aplicar rotações
  rVector.applyMatrix4(RzOmega);
  rVector.applyMatrix4(RxI);
  rVector.applyMatrix4(Rzomega);

  // Aplicar rotação adicional de 180 graus no plano Z para corrigir inversão
  rVector.applyMatrix4(RzCorrection);

  return rVector;
}


// Resolver a equação de Kepler
function keplerEquation(M: number, e: number): number {
  let E = M; // Chute inicial
  const tolerance = 1e-6; // Critério de convergência
  let delta = 1;

  while (Math.abs(delta) > tolerance) {
    delta = M - (E - e * Math.sin(E));
    E += delta;
  }
  return E;
}

// Converter graus para radianos
function degToRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Matriz de rotação em torno do eixo Z
function Rz(theta: number): THREE.Matrix4 {
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  const matrix = new THREE.Matrix4();
  matrix.set(
    cosTheta, -sinTheta, 0, 0,
    sinTheta, cosTheta, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  );
  return matrix;
}

// Matriz de rotação em torno do eixo X
function Rx(theta: number): THREE.Matrix4 {
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  const matrix = new THREE.Matrix4();
  matrix.set(
    1, 0, 0, 0,
    0, cosTheta, -sinTheta, 0,
    0, sinTheta, cosTheta, 0,
    0, 0, 0, 1
  );
  return matrix;
}
