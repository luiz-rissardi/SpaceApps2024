import { AfterViewInit, Component, input } from '@angular/core';
import * as THREE from "three";
import { KeplerianData } from '../../types/KeplerianData';


@Component({
  selector: 'app-planet',
  standalone: true,
  imports: [],
  templateUrl: './planet.component.html',
  styleUrl: './planet.component.scss'
})
export class PlanetComponent implements AfterViewInit {
  public scene = input<THREE.Scene>(); // this is a signal type
  public keplerianData = input<KeplerianData>()
  public planetLabel = input<string>();
  public planetSize = input<number>(30);
  public planetColor = input<string>("white");
  public date = input<Date>(new Date());

  private planet !: THREE.Mesh

  ngAfterViewInit(): void {
    this.initPlanet()
    this.drawPlanetOrbit()
  }

  initPlanet() {
    const material = new THREE.MeshBasicMaterial({
      color: this.planetColor()
    });
    const geometry = new THREE.SphereGeometry(this.planetSize(), 100, 100);
    this.planet = new THREE.Mesh(geometry, material);
    this.planet.position.copy(this.calculateOrbitalPosition(this.date())); // Data ajustada
    this.scene()?.add(this.planet);
  }

  private drawPlanetOrbit() {
    const points: THREE.Vector3[] = [];
    const segments = 128; // Increase the number of segments for a smoother orbit

    // Calculate points along the elliptical orbit
    for (let i = 0; i <= segments; i++) {
      const M = i * (360 / segments); // Mean anomaly in degrees
      const E = this.solveKeplerEquation(THREE.MathUtils.degToRad(M), this.keplerianData().e);
      const v = this.calculateTrueAnomaly(E, this.keplerianData().e);

      const r = this.calculateEllipticalRadius(this.keplerianData().a, this.keplerianData().e, v);
      const x = r * Math.cos(v);
      const y = r * Math.sin(v);

      points.push(new THREE.Vector3(x * 1000, y * 1000, 0)); // Scale for visualization
    }

    const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const orbitMaterial = new THREE.LineBasicMaterial({ color: this.planetColor() });
    const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);

    this.scene().add(orbitLine); // Add orbit to the scene
  }

  protected calculateOrbitalPosition(currentDate: Date): THREE.Vector3 {
    const jd = this.getJulianDate(currentDate);
    const M = this.calculateMeanAnomaly(this.keplerianData().n, this.keplerianData().T, jd);
    const E = this.solveKeplerEquation(M, this.keplerianData().e);
    const v = this.calculateTrueAnomaly(E, this.keplerianData().e);

    // Calculate radius and orbital position
    const r = this.calculateEllipticalRadius(this.keplerianData().a, this.keplerianData().e, v);
    const x = r * Math.cos(v);
    const y = r * Math.sin(v);

    return new THREE.Vector3(x * 1000, y * 1000, 0); // Scale adjustment
  }

  private getJulianDate(date: Date): number {
    const time = date.getTime();
    return time / 86400000 + 2440587.5;
  }

  private calculateMeanAnomaly(n: number, T: number, jd: number): number {
    return THREE.MathUtils.degToRad(n * (jd - T));
  }

  private solveKeplerEquation(M: number, e: number): number {
    let E = M;
    for (let i = 0; i < 10; i++) {
      E = M + e * Math.sin(E);
    }
    return E;
  }

  private calculateTrueAnomaly(E: number, e: number): number {
    return 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
  }

  private calculateEllipticalRadius(a: number, e: number, v: number): number {
    return a * (1 - e * e) / (1 + e * Math.cos(v));
  }

}

