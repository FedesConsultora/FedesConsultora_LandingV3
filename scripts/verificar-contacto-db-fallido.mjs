const base = process.env.VERIFICAR_URL || 'http://127.0.0.1:4324';
const response = await fetch(`${base}/api/contacto`, {
  method: 'POST',
  headers: { Origin: base },
  body: new URLSearchParams({
    nombre: 'Release integration',
    empresa: 'Synthetic test',
    email: 'db-unavailable@example.test',
    tamano: 'Hasta 10 empleados',
    resolver: 'Tecnología',
    privacidad: 'on',
  }),
});
const result = await response.json().catch(() => null);
if (response.status !== 500 || result?.ok !== false || result?.error !== 'save_failed') {
  throw new Error('El formulario indicó éxito aunque no pudo persistir el lead.');
}
console.log('OK   contacto no indica éxito cuando la conexión PostgreSQL local de prueba falla.');
