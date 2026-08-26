import { randomNonZeroInteger } from "./random";

describe("exercise random helpers", () => {
  test("selects a non-zero integer without a rejection loop", () => {
    expect(randomNonZeroInteger(-2, 2, () => 0)).toBe(-2);
    expect(randomNonZeroInteger(-2, 2, () => 0.99)).toBe(2);
    expect(randomNonZeroInteger(0, 3, () => 0)).toBe(1);
  });

  test("rejects an interval containing only zero", () => {
    expect(() => randomNonZeroInteger(0, 0, () => 0)).toThrow(/non nul/);
  });
});
