import { describe, it, expect } from 'vitest';
import { calculatePlates } from '../plates';

describe('Plate Calculator Domain', () => {
  it('calculates plates correctly for 80kg with a 20kg bar', () => {
    // Total: 80kg, Bar: 20kg -> 60kg total plates -> 30kg per side (25 + 5)
    const result = calculatePlates(80, 20);
    expect(result.weightPerSide).toBe(30);
    expect(result.remainder).toBe(0);
    expect(result.platesPerSide).toEqual([
      { plate: 25, count: 1 },
      { plate: 5, count: 1 },
    ]);
  });

  it('calculates plates correctly for 100kg with 20kg bar', () => {
    // Total: 100kg, Bar: 20kg -> 80kg total plates -> 40kg per side (25 + 15)
    const result = calculatePlates(100, 20);
    expect(result.weightPerSide).toBe(40);
    expect(result.remainder).toBe(0);
    expect(result.platesPerSide).toEqual([
      { plate: 25, count: 1 },
      { plate: 15, count: 1 },
    ]);
  });

  it('handles weights less than or equal to bar weight', () => {
    const result = calculatePlates(20, 20);
    expect(result.weightPerSide).toBe(0);
    expect(result.remainder).toBe(0);
    expect(result.platesPerSide).toEqual([]);

    const underResult = calculatePlates(15, 20);
    expect(underResult.weightPerSide).toBe(0);
    expect(underResult.platesPerSide).toEqual([]);
  });

  it('handles fractional weights with standard available plates', () => {
    // Target 62.5kg with 20kg bar -> 42.5kg total plates -> 21.25kg per side (20 + 1.25)
    const result = calculatePlates(62.5, 20);
    expect(result.weightPerSide).toBe(21.25);
    expect(result.remainder).toBe(0);
    expect(result.platesPerSide).toEqual([
      { plate: 20, count: 1 },
      { plate: 1.25, count: 1 },
    ]);
  });

  it('identifies remainder when weight cannot be matched exactly', () => {
    // Target 21kg with 20kg bar -> 1kg total -> 0.5kg per side. Smallest plate is 1.25kg.
    const result = calculatePlates(21, 20);
    expect(result.weightPerSide).toBe(0);
    expect(result.remainder).toBe(1);
    expect(result.platesPerSide).toEqual([]);
  });
});
