import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path:"home",
        loadComponent:()=> import("./three-scene/three-scene.component").then(c => c.ThreeSceneComponent)
    },
    {
        path:"**",
        redirectTo:"home"
    }
];
