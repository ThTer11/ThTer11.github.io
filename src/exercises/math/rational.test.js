import { inspectFractionInput, parseExactNumber } from "./rational";

describe("exact rational input", () => {
  test("normalises equivalent exact values", () => {
    expect(parseExactNumber("1/2").equals(parseExactNumber("2/4"))).toBe(true);
    expect(parseExactNumber("0,5").equals(parseExactNumber("1/2"))).toBe(true);
    expect(parseExactNumber(".5").equals(parseExactNumber("1/2"))).toBe(true);
    expect(parseExactNumber("\\frac{3}{6}").toString()).toBe("1/2");
  });

  test("tracks whether the written fraction is reduced", () => {
    expect(inspectFractionInput("3/4").isReduced).toBe(true);
    expect(inspectFractionInput("6/8").isReduced).toBe(false);
  });

  test("rejects malformed values rather than partially parsing them", () => {
    expect(() => parseExactNumber("1.2.3")).toThrow();
    expect(() => parseExactNumber(".")).toThrow();
    expect(() => parseExactNumber("2/0")).toThrow();
  });
});
