import { parsePolynomialExpression, polynomialSignature } from './polynomial';
import { asFraction, Fraction } from './rational';

const degree = key => key ? key.split('*').reduce((sum, part) => sum + Number(part.split('^')[1]), 0) : 0;
const entries = poly => [...poly].sort(([a], [b]) => degree(b) - degree(a) || a.localeCompare(b));
export function polynomial(raw) {
  const result = parsePolynomialExpression(String(raw));
  if ([...result.keys()].some(key => key && key.split('*').some(term => !/^[ts]\^[12]$/.test(term)))) throw new Error('symbols');
  return result;
}
export function polynomialText(raw, latex = false) {
  const poly = raw instanceof Map ? raw : polynomial(raw);
  return entries(poly).map(([key, value], index) => {
    const negative = value.numerator < 0n, abs = value.abs();
    const variables = key ? key.split('*').map(term => {
      const [name, power] = term.split('^');
      return power === '1' ? name : latex ? `${name}^{${power}}` : `${name}^${power}`;
    }).join(latex ? '' : '*') : '';
    const coefficient = variables && abs.isOne() ? '' : latex ? abs.toLatex() : abs.denominator === 1n || !variables ? String(abs) : `(${abs})`;
    return `${negative ? index ? ' - ' : '-' : index ? ' + ' : ''}${coefficient}${variables && coefficient && !latex ? '*' : ''}${variables}`;
  }).join('') || '0';
}
export function augmentedLatex(matrix, splitIndex = matrix[0].length - 1) {
  const alignment = `${'c'.repeat(splitIndex)}|${'c'.repeat(matrix[0].length - splitIndex)}`;
  return `\\left(\\begin{array}{${alignment}}${matrix.map(row => row.map(x => polynomialText(x, true)).join(' & ')).join(' \\\\ ')}\\end{array}\\right)`;
}
export function plainMatrixLatex(matrix) {
  return `\\begin{pmatrix}${matrix.map(row => row.map(x => polynomialText(x, true)).join(' & ')).join(' \\\\ ')}\\end{pmatrix}`;
}
export function rowOperation(matrix, op) {
  const result = matrix.map(row => [...row]);
  const { type, target, source } = op;
  if (!Number.isInteger(target) || target < 0 || target >= matrix.length) throw new Error('row');
  if (type !== 'scale' && (!Number.isInteger(source) || source < 0 || source >= matrix.length || source === target)) throw new Error('distinct');
  if (type === 'swap') [result[target], result[source]] = [result[source], result[target]];
  else {
    if (!['add', 'scale'].includes(type)) throw new Error('operation');
    const factor = asFraction(op.factor);
    if (factor.isZero()) throw new Error('zero');
    result[target] = matrix[target].map((cell, column) => {
      const value = type === 'scale' ? new Map() : polynomial(cell);
      const from = polynomial(matrix[type === 'scale' ? target : source][column]);
      for (const [key, coefficient] of from) {
        const next = (value.get(key) ?? Fraction.zero()).add(coefficient.mul(factor));
        if (next.isZero()) value.delete(key); else value.set(key, next);
      }
      if ([...value.values()].some(x => String(x.numerator).length > 60 || String(x.denominator).length > 60)) throw new Error('large');
      return polynomialText(value);
    });
  }
  return result;
}
export function operationLatex(op, { aligned = false } = {}) {
  const target = `L_{${op.target + 1}}`, source = `L_{${op.source + 1}}`;
  const arrow = op.type === 'swap' ? '\\leftrightarrow' : '\\leftarrow';
  const left = aligned ? `${target} & ${arrow} & ` : `${target}${arrow} `;
  if (op.type === 'swap') return left + source;
  const f = asFraction(op.factor), a = f.abs(), coefficient = a.isOne() ? '' : a.toLatex();
  if (op.type === 'scale') return `${left}${f.numerator < 0n ? '-' : ''}${coefficient}${target}`;
  return `${left}${target}${f.numerator < 0n ? '-' : '+'}${coefficient}${source}`;
}
export function reducedForm(input) {
  let matrix = input.map(row => row.map(x => String(asFraction(x))));
  const steps = []; let pivot = 0;
  const apply = operation => { matrix = rowOperation(matrix, operation); steps.push({ operation, matrix }); };
  for (let col = 0; col < matrix[0].length && pivot < matrix.length; col++) {
    const index = matrix.findIndex((row, i) => i >= pivot && !asFraction(row[col]).isZero());
    if (index < 0) continue;
    if (index !== pivot) apply({ type: 'swap', target: pivot, source: index });
    const value = asFraction(matrix[pivot][col]);
    if (!value.isOne()) apply({ type: 'scale', target: pivot, factor: String(Fraction.one().div(value)) });
    for (let i = 0; i < matrix.length; i++) if (i !== pivot && !asFraction(matrix[i][col]).isZero()) {
      apply({ type: 'add', target: i, source: pivot, factor: String(asFraction(matrix[i][col]).neg()) });
    }
    pivot++;
  }
  return { matrix, steps };
}
export function sameMatrix(a, b) {
  return a.length === b.length && a.every((row, i) => row.length === b[i].length && row.every((x, j) => polynomialSignature(polynomial(x)) === polynomialSignature(polynomial(b[i][j]))));
}
function proportional(a, b) {
  if (!a.size || a.size !== b.size) return false;
  const [key, value] = [...b][0], scale = a.get(key)?.div(value);
  return scale && !scale.isZero() && [...b].every(([k, v]) => a.get(k)?.equals(v.mul(scale)));
}
function equation(raw) {
  const sides = raw.split('=');
  if (sides.length !== 2 || sides.some(x => !x.trim())) throw new Error('equation');
  return polynomial(`(${sides[0]})-(${sides[1]})`);
}
export function parameterConditionCorrect(raw, expected) {
  let value = String(raw).trim().replace(/[−–]/g, '-').replace(/\\(?:left|right)/g, '').replace(/\\in/g, '∈');
  if (!value || /[!<>≠≤≥]/.test(value)) return false;
  if (expected.kind === 'line') return proportional(equation(value), polynomial(expected.polynomial));
  if (expected.kind === 'point') {
    const pair = value.match(/^\(?\s*t\s*,\s*s\s*\)?\s*=\s*\(\s*([^,]+),\s*([^,]+)\s*\)$/);
    if (pair) return asFraction(pair[1]).equals(expected.t) && asFraction(pair[2]).equals(expected.s);
    const clauses = value.split(/;|\bet\b|\band\b|\\land|∧|,/i).map(x => x.trim()).filter(Boolean);
    if (clauses.length !== 2) return false;
    const equations = clauses.map(equation);
    if (equations.some(p => [...p.keys()].some(k => !['', 't^1', 's^1'].includes(k)))) return false;
    const coeff = (p, k) => p.get(k) ?? Fraction.zero();
    const [a,b] = equations;
    if (coeff(a,'t^1').mul(coeff(b,'s^1')).sub(coeff(a,'s^1').mul(coeff(b,'t^1'))).isZero()) return false;
    return equations.every(p => coeff(p,'t^1').mul(expected.t).add(coeff(p,'s^1').mul(expected.s)).add(coeff(p,'')).isZero());
  }
  // An equation equivalent to the complete linear/quadratic condition is also valid.
  if (value.includes('=') && !/\bou\b|\bor\b|;|,|∈/i.test(value)) {
    const p = equation(value);
    if (proportional(p, polynomial(expected.polynomial))) return true;
  }
  value = value.replace(/t\s*∈/g, '').replace(/\\[{}]/g, '').replace(/[{}]/g, '');
  const values = value.split(/;|,|\bou\b|\bor\b/i).map(x => x.trim().replace(/^t\s*=\s*/, '')).filter(Boolean).map(asFraction);
  const unique = [...new Map(values.map(x => [String(x), x])).values()];
  return unique.length === expected.roots.length && expected.roots.every(x => unique.some(y => y.equals(x)));
}

/** Format only parseable equations/values; invalid input stays escaped text upstream. */
export function parameterConditionLatex(raw) {
  const text=String(raw).trim().replace(/[−–]/g,'-');
  if(/[!<>≠≤≥]/.test(text))throw new Error('condition');
  const clauses=text.split(/;|\bet\b|\band\b|\\land|∧/i).map(x=>x.trim()).filter(Boolean);
  if(clauses.every(x=>x.includes('='))&&!/\bou\b|\bor\b/i.test(text))return clauses.map(clause=>{
    const sides=clause.split('=');if(sides.length!==2)throw new Error('equation');
    return sides.map(side=>polynomialText(side,true)).join('=');
  }).join(',\\quad ');
  const values=text.replace(/t\s*(?:∈|\\in)/g,'').replace(/\\[{}]/g,'').replace(/[{}]/g,'').split(/;|,|\bou\b|\bor\b/i).map(x=>asFraction(x.trim().replace(/^t\s*=\s*/,'')));
  return values.length===1?values[0].toLatex():`\\left\\{${values.map(x=>x.toLatex()).join(';\\,')}\\right\\}`;
}
