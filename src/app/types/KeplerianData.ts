import { WritableSignal } from "@angular/core";


export type KeplerianData = {
    a: number;  // Semieixo maior em AU
    e: number;     // Excentricidade
    I: number;     // Inclinação em graus
    longPeri: number; // Longitude do periélio
    longNode: number; // Longitude do nodo ascendente
    n: number;
    T: number;
    L: number;
    color:WritableSignal<any>;
    size:WritableSignal<any>;
    label:string
}