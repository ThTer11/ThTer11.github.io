import {
  arePolynomialExpressionsEquivalent,
  hasDevelopedForm,
  hasFactorizedForm,
  parsePolynomialExpression,
  polynomialSignature,
} from "./polynomial";

describe("polynomial expressions", () => {
  test("recognises exact expanded and factorised equivalents", () => {
    expect(arePolynomialExpressionsEquivalent("(x+1)(x-1)", "x^2-1")).toBe(true);
    expect(arePolynomialExpressionsEquivalent("(x-1)*(x+1)", "x²−1")).toBe(true);
    expect(arePolynomialExpressionsEquivalent("2x+2x", "4*x")).toBe(true);
  });

  test("keeps rational coefficients exact", () => {
    expect(arePolynomialExpressionsEquivalent("x/2+x/3", "5x/6")).toBe(true);
    expect(arePolynomialExpressionsEquivalent("0.1x+0.2x", "3x/10")).toBe(true);
  });

  test("accepts simple LaTeX fractions", () => {
    expect(arePolynomialExpressionsEquivalent("\\frac{x}{2}", "x/2")).toBe(true);
  });

  test("distinguishes genuinely different expressions", () => {
    expect(arePolynomialExpressionsEquivalent("(x+1)^2", "x^2+1")).toBe(false);
  });

  test("detects requested presentation forms", () => {
    expect(hasFactorizedForm("(x-1)(x+1)")).toBe(true);
    expect(hasFactorizedForm("3x(x-2)")).toBe(true);
    expect(hasDevelopedForm("x^2-1")).toBe(true);
    expect(hasDevelopedForm("(x-1)(x+1)")).toBe(false);
  });

  test("rejects unsupported or excessive syntax safely", () => {
    expect(() => parsePolynomialExpression("window.alert(1)")).toThrow();
    expect(() => parsePolynomialExpression("x^1000")).toThrow();
    expect(() => parsePolynomialExpression("x/(x+1)")).toThrow();
  });

  test("has a stable canonical signature", () => {
    expect(polynomialSignature(parsePolynomialExpression("y+x")))
      .toBe(polynomialSignature(parsePolynomialExpression("x+y")));
  });
});
