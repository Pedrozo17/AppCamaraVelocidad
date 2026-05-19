const { faker } = require('@faker-js/faker');

// Coordenadas reales de Colombia (bounding box)
const colombiaLat = () => faker.number.float({ min: 1.5, max: 12.5, fractionDigits: 6 });
const colombiaLng = () => faker.number.float({ min: -79.0, max: -66.8, fractionDigits: 6 });

// Ciudades y vías colombianas reales
const vias = [
  "Autopista Norte", "Autopista Sur", "Calle 80", "Av. El Dorado",
  "Troncal del Magdalena", "Ruta 45A", "Autopista Medellín-Bogotá",
  "Vía al Llano", "Av. Circunvalar", "Troncal de Occidente",
  "Autopista Barranquilla-Cartagena", "Ruta 25", "Autopista Bogotá-Villavicencio",
  "Vía Panamericana", "Av. 68", "Transversal de las Américas"
];

const ciudades = [
  "Bogotá", "Medellín", "Cali", "Barranquilla", "Cartagena",
  "Bucaramanga", "Manizales", "Pereira", "Cúcuta", "Ibagué",
  "Pasto", "Neiva", "Villavicencio", "Armenia", "Montería"
];

const tipos = ["Fija", "Móvil", "Semafórica"];
const estados = ["Activa", "En mantenimiento", "Inactiva"];

const createCamaraVelocidad = () => {
  const ciudad = faker.helpers.arrayElement(ciudades);
  const via = faker.helpers.arrayElement(vias);

  return {
    id: faker.string.uuid(),
    nombre: `Cámara ${via} - ${ciudad}`,
    via: via,
    ciudad: ciudad,
    departamento: faker.helpers.arrayElement([
      "Cundinamarca", "Antioquia", "Valle del Cauca", "Atlántico",
      "Bolívar", "Santander", "Caldas", "Risaralda", "Norte de Santander"
    ]),
    tipo: faker.helpers.arrayElement(tipos),
    limite_velocidad: faker.helpers.arrayElement([30, 40, 50, 60, 80, 100, 120]),
    estado: faker.helpers.arrayElement(estados),
    coordenadas: {
      lat: colombiaLat(),
      lng: colombiaLng(),
    },
    fecha_instalacion: faker.date.between({
      from: "2015-01-01",
      to: "2024-12-31"
    }).toISOString().split("T")[0],
    infracciones_mes: faker.number.int({ min: 0, max: 500 }),
  };
};

const camaras = faker.helpers.multiple(createCamaraVelocidad, { count: 500 });
console.log(JSON.stringify(camaras, null, 2));