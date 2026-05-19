import { faker } from '@faker-js/faker';

const vias = [
  "Autopista Norte", "Autopista Sur", "Calle 80", "Av. El Dorado",
  "Troncal del Magdalena", "Ruta 45A", "Autopista Medellín-Bogotá",
  "Vía al Llano", "Av. Circunvalar", "Troncal de Occidente",
  "Autopista Barranquilla-Cartagena", "Ruta 25", "Vía Panamericana",
  "Av. 68", "Transversal de las Américas"
];

const ciudades = [
  "Bogotá", "Medellín", "Cali", "Barranquilla", "Cartagena",
  "Bucaramanga", "Manizales", "Pereira", "Cúcuta", "Ibagué",
  "Pasto", "Neiva", "Villavicencio", "Armenia", "Montería"
];

const departamentos = [
  "Cundinamarca", "Antioquia", "Valle del Cauca", "Atlántico",
  "Bolívar", "Santander", "Caldas", "Risaralda", "Norte de Santander"
];

const tipos = ["Fija", "Móvil", "Semafórica"];
const estados = ["Activa", "En mantenimiento", "Inactiva"];
const limites = [30, 40, 50, 60, 80, 100, 120];

// Generamos UNA SOLA VEZ al importar
export const CAMARAS_COLOMBIA = Array.from({ length: 1000 }, () => {
  const ciudad = faker.helpers.arrayElement(ciudades);
  const via = faker.helpers.arrayElement(vias);

  return {
    id: faker.string.uuid(),
    latitude: faker.number.float({ min: 1.5, max: 12.5, fractionDigits: 6 }),
    longitude: faker.number.float({ min: -79.0, max: -66.8, fractionDigits: 6 }),
    street: `${via} - ${ciudad}`,
    description: `${faker.helpers.arrayElement(tipos)} · Límite: ${faker.helpers.arrayElement(limites)} km/h · ${faker.helpers.arrayElement(estados)}`,
    speed_limit: faker.helpers.arrayElement(limites),
    reported_by: `Cámara ${via}`,
    timestamp: faker.date.between({ from: '2020-01-01', to: '2024-12-31' }).toISOString(),
  };
});