declare namespace App {
  interface Locals {
    // Administrador con sesión válida. Lo carga src/middleware.ts en las rutas del panel.
    admin?: import('./lib/auth').Admin;
  }
}
