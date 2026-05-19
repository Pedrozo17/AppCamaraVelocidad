const { generateAdventures } = require('../seedData');

describe('Pruebas en el generador de datos (generateAdventures)', () => {

    test('Debe generar una cantidad de pruebas exacta que se soliciten', () => {
        const total = 15;
        const result = generateAdventures(total);

        expect(result).toHaveLength(total);
    });

    test('Cada aventura debe contener una estructura válida', () => {
        const [adventure] = generateAdventures(1);

        expect(adventure.coords).toHaveProperty('lat');
        expect(adventure.coords).toHaveProperty('lng');
        expect(typeof adventure.coords.lat).toBe('number');
    });

});