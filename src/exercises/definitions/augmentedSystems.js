import { pickRandom, randomInteger } from '../core/random';
import { asFraction } from '../math/rational';
import { generateIntegerMatrix, toFractionMatrix } from '../math/linearAlgebra';
import { runGaussianElimination } from '../../utils/gauss';
import { augmentedLatex, plainMatrixLatex, rowOperation, operationLatex, reducedForm, sameMatrix, parameterConditionCorrect, polynomialText } from '../math/augmentedSystems';

const tr = (fr,en) => ({fr,en});
const names = n => ['x','y','z','t'].slice(0,n);
const nz = rng => pickRandom([-2,-1,1,2],rng);
const invalid = (lang,fr,en) => ({status:'invalid',message:lang==='en'?en:fr});
const matrixFilled = matrix => matrix?.every(row=>row.every(x=>String(x).trim()));
const eq = (a,b) => a?.length===b.length && a.every((row,i)=>row?.length===b[i].length && row.every((x,j)=>asFraction(x).equals(b[i][j])));
const system = matrix => {
  const variables=names(matrix[0].length-1);
  const equations=matrix.map(row=>{
    let expression='';
    row.slice(0,-1).forEach((raw,j)=>{
      const value=asFraction(raw);
      if(value.isZero())return;
      expression+=`${value.numerator<0n?'-':expression?'+':''}${value.abs().isOne()?'':value.abs().toLatex()}${variables[j]}`;
    });
    return `${expression||'0'}&=${asFraction(row[row.length-1]).toLatex()}`;
  });
  return `$$\\left\\{\\begin{aligned}${equations.join('\\\\[.35em]')}\\end{aligned}\\right.$$`;
};
const inverse = op => op.type==='swap'?op:{...op,factor:op.type==='scale'?String(asFraction(1).div(op.factor)):String(asFraction(op.factor).neg())};

function formatOperationList(operations) {
  const rows = operations.map((operation) => operationLatex(operation, { aligned: true }));
  return `$$\\begin{array}{rcl}${rows.join('\\\\[.3em]')}\\end{array}$$`;
}

export function generateMatrixWriting({ level = 1, rng = Math.random } = {}) {
  const maxSize = Number(level) === 3 ? 4 : 3;
  const squareSizes = Array.from({ length: maxSize - 1 }, (_, i) => [i + 2, i + 2]);
  const rectangles = Array.from({ length: maxSize }, (_, i) =>
    Array.from({ length: maxSize - 1 }, (_, j) => [i + 1, j + 2]),
  ).flat().filter(([rows, columns]) => rows !== columns);
  const shapes = Number(level) === 1 ? squareSizes : [...squareSizes, ...rectangles];
  const [rows, n] = pickRandom(shapes, rng);
  const A = generateIntegerMatrix(rows, n, { min: -4, max: 4, rng }).map(row => row.map(String));
  // Every equation and every unknown must be visible in the written system.
  A.forEach((row, i) => { if (row.every(x => x === '0')) row[i % n] = '1'; });
  for (let j = 0; j < n; j++) {
    if (A.every(row => row[j] === '0')) A[j % rows][j] = '1';
  }
  const B = Array.from({ length: rows }, () => [String(randomInteger(-6, 6, rng))]);
  const initialMatrix=A.map((row,i)=>[...row,B[i][0]]);
  const X=`\\begin{pmatrix}${names(n).join('\\\\')}\\end{pmatrix}`;
  const form=`${plainMatrixLatex(A)}${X}=${plainMatrixLatex(B)}`;
  return {
    prompt: system(initialMatrix),
    promptUi: {
      label: tr('Écrire le système suivant sous forme matricielle $AX=B$, puis donner la matrice augmentée.','Write the following system in matrix form $AX=B$, then give its augmented matrix.'),
      condition: tr(`On note $X=${X}$.`, `Let $X=${X}$.`),
      mobileLayout: 'matrix-writing',
      icon: false,
    },
    initialMatrix,variables:names(n),expected:{A,B,matrix:initialMatrix},
    answer:{type:'matrix-writing',validator:validateMatrixWriting},
    answerDisplay:tr(`Le système s’écrit sous forme matricielle :
$$${form}$$
La matrice augmentée du système est donc :
$$${augmentedLatex(initialMatrix)}$$`,`The system can be written in matrix form as:
$$${form}$$
Its augmented matrix is:
$$${augmentedLatex(initialMatrix)}$$`),
    summaryAnswerDisplay:`$$${form}$$
$$\\hat{A}=${augmentedLatex(initialMatrix)}$$`,
    dedupeKey:{kind:'writing',initialMatrix},courseHintIds:[],
  };
}
export function validateMatrixWriting(value,{expected,lang='fr'}) {
  if(value?.stage==='matrix-form'){
    if(!matrixFilled(value.A)||!matrixFilled(value.B))return invalid(lang,'Compléter les matrices A et B.','Complete matrices A and B.');
    if(!eq(value.A,expected.A)||!eq(value.B,expected.B))return false;
    return {status:'continue',nextAnswer:{...value,stage:'augmented'}};
  }
  if(!matrixFilled(value?.matrix))return invalid(lang,'Compléter la matrice augmentée.','Complete the augmented matrix.');
  return eq(value.matrix,expected.matrix);
}

export function generateRowReduction({level=1,rng=Math.random}={}) {
  const n=Number(level)===1?2:Number(level)===2?3:4;
  const kind=Number(level)===1?'unique':pickRandom(['unique','unique','infinite','inconsistent'],rng);
  let matrix=Array.from({length:n},(_,i)=>Array.from({length:n+1},(_,j)=>String(j===n?randomInteger(-2,2,rng):Number(i===j))));
  if(kind!=='unique'){
    matrix[n-1]=Array(n+1).fill('0');
    for(let i=0;i<n-1;i++)matrix[i][n-1]=String(randomInteger(-2,2,rng));
    if(kind==='inconsistent'){matrix[n-1][n]='1';for(let i=0;i<n-1;i++)matrix[i][n]='0';}
  }
  for(let i=1;i<n;i++)matrix=rowOperation(matrix,{type:'add',target:i,source:i-1,factor:String(nz(rng))});
  if(Number(level)>=2)for(let i=n-2;i>=0;i--)matrix=rowOperation(matrix,{type:'add',target:i,source:i+1,factor:pickRandom(['-1','1'],rng)});
  matrix=rowOperation(matrix,{type:'scale',target:0,factor:pickRandom(['-2','2','3'],rng)});
  if(Number(level)>=2)matrix=rowOperation(matrix,{type:'swap',target:0,source:n-1});
  const reduction=reducedForm(matrix);
  const solved=runGaussianElimination({variableNames:names(n),augmentedMatrix:toFractionMatrix(matrix)});
  const conclusion=kind==='inconsistent'
    ?tr('Une ligne $0=1$ apparaît : le système n’a aucune solution.','The row $0=1$ shows that the system has no solution.')
    :kind==='infinite'?tr('Les colonnes sans pivot correspondent aux inconnues libres. Le système a une infinité de solutions.','Columns without a pivot correspond to free variables. The system has infinitely many solutions.'):tr('','');
  const referenceOperations = reduction.steps.map(({ operation }) => operation);
  const operationList = formatOperationList(referenceOperations);
  return {
    prompt:`$$${augmentedLatex(matrix)}$$`,promptUi:{label:tr('Obtenir l’échelonnée réduite','Find the reduced row echelon form'),icon:false},rowWorkspace:true,
    initialMatrix:matrix,variables:names(n),expected:reduction.matrix,referenceOperations,
    answer:{type:'row-reduction',validator:validateRowReduction},
    answerDisplay:`$$${augmentedLatex(reduction.matrix)}$$ ${solved.solutionLatex}${kind==='infinite'?' $\\lambda_1\\in\\mathbb R$.':''}`,
    explanation:tr(`Des opérations possibles sont :
${operationList}${conclusion.fr?`
${conclusion.fr}`:''}`,`Possible operations are:
${operationList}${conclusion.en?`
${conclusion.en}`:''}`),
    dedupeKey:{kind:'reduction',matrix},courseHintIds:[],
  };
}
export function validateRowReduction(value,{expected,lang='fr'}) {
  if(!Array.isArray(value?.matrix))return false;
  if(!sameMatrix(reducedForm(value.matrix).matrix,expected))return invalid(lang,'Les opérations doivent conserver le système de départ.','Operations must preserve the original system.');
  if(!sameMatrix(value.matrix,expected))return invalid(lang,'La matrice n’est pas encore échelonnée réduite.','The matrix is not yet in reduced row echelon form.');
  return true;
}

export function generateParameterSystem({level=1,rng=Math.random}={}) {
  const a=randomInteger(-3,3,rng),b=a+randomInteger(1,4,rng),c=randomInteger(-3,3,rng),k=nz(rng);
  let expected,condition;
  if(Number(level)===1){expected={kind:'roots',roots:[a],polynomial:`t-(${a})`};condition=`t=${a}`;}
  else if(Number(level)===2){expected={kind:'roots',roots:[a,b],polynomial:`(t-(${a}))*(t-(${b}))`};condition=`t\\in\\{${a},${b}\\}`;}
  else if(rng()<.5){expected={kind:'point',t:a,s:c};condition=`t=${a}\\text{ et }s=${c}`;}
  else{expected={kind:'line',polynomial:`s-(${k})*t-(${c})`};condition=`s=${polynomialText(`(${k})*t+(${c})`,true)}`;}
  const echelon=[['1',String(pickRandom([k, -k], rng)),String(randomInteger(-3,3,rng))],['0','1',String(randomInteger(-3,3,rng))],['0','0',polynomialText(expected.kind==='point'?`t-(${a})`:expected.polynomial)]];
  if(expected.kind==='point')echelon.push(['0','0',polynomialText(`s-(${c})`)]);
  let matrix=echelon.map(row=>[...row]);const mix=[];
  for(let i=2;i<matrix.length;i++){
    for(const source of [0,1]){const op={type:'add',target:i,source,factor:String(nz(rng))};matrix=rowOperation(matrix,op);mix.push(op);}
  }
  if(Number(level)>1){const op={type:'swap',target:1,source:2};matrix=rowOperation(matrix,op);mix.push(op);}
  const correctionOperations = formatOperationList(mix.slice().reverse().map(inverse));
  const parameters = expected.kind === 'point' ? tr('$t$ et de $s$', '$t$ and $s$') : tr('$t$', '$t$');
  const promptLabel = expected.kind === 'line'
    ? tr('À quelle condition sur $t$ et $s$ le système admet-il des solutions ?', 'What condition must $t$ and $s$ satisfy for the system to have solutions?')
    : tr(`Pour quelles valeurs réelles de ${parameters.fr} le système admet-il des solutions ?`, `For which real values of ${parameters.en} does the system have solutions?`);
  const constraints=echelon.slice(2).map(row=>`${polynomialText(row[2],true)}=0`).join('\\text{ et }');
  const compatibility = lang => {
    const conjunction = lang === 'en' ? ' and ' : ' et ';
    const translate = formula => formula.replaceAll('\\text{ et }', `\\text{${conjunction}}`);
    const conditionText = `$${translate(constraints)}$`;
    const simplified = constraints === condition ? '' : `, ${lang === 'en' ? 'that is' : 'c’est-à-dire'} $${translate(condition)}$`;
    return `${lang === 'en' ? 'The system is consistent if and only if' : 'Le système est compatible si et seulement si'} ${conditionText}${simplified}.`;
  };

  return {
    prompt:`$$${augmentedLatex(matrix)}$$`,promptUi:{label:promptLabel,icon:false},rowWorkspace:true,
    initialMatrix:matrix,variables:['x','y'],expected,
    answer:{type:'parameter-system',validator:validateParameterSystem,placeholder:Number(level)<3?tr('ex. 2,3','e.g. 2,3'):tr(expected.kind==='point'?'ex. t=2 et s=-1':'ex. s=2*t+1',expected.kind==='point'?'e.g. t=2 and s=-1':'e.g. s=2*t+1')},
    answerDisplay:tr(`$$${condition}$$`,`$$${condition.replace('\\text{ et }','\\text{ and }')}$$`),
    explanation:tr(`${Number(level)===3?'$t$ et $s$ sont des paramètres réels fixés.':'$t$ est un paramètre réel fixé.'}
Un échelonnement possible de la matrice est :
$$${augmentedLatex(echelon)}$$
grâce aux opérations :
${correctionOperations}
${compatibility('fr')}`,`${Number(level)===3?'$t$ and $s$ are fixed real parameters.':'$t$ is a fixed real parameter.'}
One possible row echelon form of the matrix is:
$$${augmentedLatex(echelon)}$$
using the operations:
${correctionOperations}
${compatibility('en')}`),
    dedupeKey:{kind:'parameters',matrix,expected},courseHintIds:[],
  };
}
export function validateParameterSystem(value,{expected,lang='fr'}) {
  if(!value?.condition?.trim())return invalid(lang,'Indiquer les valeurs ou la condition sur les paramètres.','Enter the values or the condition on the parameters.');
  try{return Boolean(parameterConditionCorrect(value.condition,expected));}
  catch{return invalid(lang,'Utiliser une valeur, une liste séparée par ; ou une égalité sur t et s.','Use a value, a semicolon-separated list or an equation in t and s.');}
}
export const augmentedSystemsTool={
  id:'systemes-matrices-augmentees',categoryId:'matrices',mode:'practice',
  title:tr('Systèmes et matrices augmentées','Systems and augmented matrices'),
  description:tr('Écrire, réduire et étudier des systèmes linéaires.','Write, reduce and analyse linear systems.'),
  exercises:[
    {id:'writing',label:tr('Savoir déterminer la matrice associée à un système','Determine the matrix associated with a system'),description:tr('Identifier les coefficients et le second membre.','Identify the coefficients and right-hand side.'),levels:[1,2,3],color:'sky'},
    {id:'reduction',label:tr('Pivot de Gauss','Gaussian elimination'),description:tr('Obtenir l’échelonnée réduite par opérations sur les lignes.','Find the reduced row echelon form using row operations.'),levels:[1,2,3],color:'emerald'},
    {id:'parameters',label:tr('Systèmes à paramètres','Systems with parameters'),description:tr('Déterminer les conditions d’existence des solutions.','Determine when solutions exist.'),levels:[1,2,3],color:'violet'},
  ],defaultExercise:'writing',timer:false,score:true,
  series:{questionCount:2,choices:[1,2,5,10],allowQuestionCount:true,allowRestart:true,showSummary:true},
  source:{type:'generator',generate:context=>context.difficulty==='writing'?generateMatrixWriting(context):context.difficulty==='parameters'?generateParameterSystem(context):generateRowReduction(context)},
  answer:{type:'matrix-writing',validator:validateMatrixWriting},
  feedback:{showCorrection:true,showExplanation:true,showSolution:true,showInsight:false,nextQuestion:true},courseHintIds:[],
};
