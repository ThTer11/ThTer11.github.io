import { useEffect, useRef, useState } from 'react';
import { ArrowPathIcon, ArrowUturnLeftIcon, ArrowUturnRightIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import MathRenderer from './MathRenderer';
import { localize } from '../../exercises/core/localize';
import { rowOperation, operationLatex, augmentedLatex, sameMatrix } from '../../exercises/math/augmentedSystems';
import './augmented-system.css';

export function emptyAugmentedAnswer(type, question) {
  const blank=matrix=>matrix.map(row=>row.map(()=>''));
  if(type==='matrix-writing')return {stage:'matrix-form',A:blank(question.expected.A),B:blank(question.expected.B),matrix:blank(question.initialMatrix)};
  return {matrix:question.initialMatrix.map(row=>[...row]),history:[],future:[],...(type==='parameter-system'?{condition:''}:{})};
}
function MatrixFields({matrix,onChange,onActivate,split,disabled,name,lang,field}) {
  const columns=matrix[0].length;
  const update=(i,j,text)=>onChange(matrix.map((row,r)=>row.map((v,c)=>r===i&&c===j?text:v)));
  return <div className={`system-matrix-fields${split!==undefined?' system-matrix-fields-augmented':''}`} style={{'--system-columns':columns}}>
    <MathRenderer as="span" className="system-matrix-name" content={`$${name}=$`} responsiveMath={false}/>
    <div className="system-matrix-parentheses">
      <div className={`system-matrix-grid${split!==undefined?' system-matrix-grid-augmented':''}`} style={{'--system-split':split}}>
        {matrix.flatMap((row,i)=>row.map((value,j)=><input key={`${i}-${j}`} className="exercise-matrix-cell"
          aria-label={`${split!==undefined?(lang==='en'?'Augmented matrix':'Matrice augmentée'):name}, ${lang==='en'?'row':'ligne'} ${i+1}, ${lang==='en'?'column':'colonne'} ${j+1}`}
          value={value} disabled={disabled} inputMode="numeric" autoComplete="off"
          onFocus={()=>onActivate({field,row:i,column:j})} onChange={e=>update(i,j,e.target.value)}/>))}
      </div>
    </div>
  </div>;
}
function MatrixWriting({value,onChange,question,disabled,lang}) {
  const active=useRef({field:'A',row:0,column:0});
  const augmented=value.stage==='augmented';
  const toggleSign=()=>{
    const position=augmented&&active.current.field!=='matrix'?{field:'matrix',row:0,column:0}:active.current;
    const {field,row,column}=position;
    const previous=value[field][row][column];
    const matrix=value[field].map((line,i)=>line.map((cell,j)=>i===row&&j===column?(previous.startsWith('-')?previous.slice(1):`-${previous}`):cell));
    onChange({...value,[field]:matrix});
  };
  const fieldProps={lang,disabled,onActivate:position=>{active.current=position;}};
  return <div className="system-writing">
    {augmented?<MatrixFields {...fieldProps} matrix={value.matrix} field="matrix" split={question.variables.length} name={"\\hat{A}"} onChange={matrix=>onChange({...value,matrix})}/>:<>
      <div className="system-writing-fields">
        <MatrixFields {...fieldProps} matrix={value.A} name="A" field="A" onChange={A=>onChange({...value,A})}/>
        <MatrixFields {...fieldProps} matrix={value.B} name="B" field="B" onChange={B=>onChange({...value,B})}/>
      </div>
    </>}
    <div className="system-writing-mobile-tools"><button type="button" className="system-sign" disabled={disabled}
      aria-label={lang==='en'?'Toggle minus sign in the selected entry':'Changer le signe du coefficient sélectionné'}
      onMouseDown={e=>e.preventDefault()} onClick={toggleSign}>−</button></div>
  </div>;
}
const texts={
 fr:{add:'Ajouter une ligne',swap:'Échanger',scale:'Multiplier',target:'Ligne à modifier',source:'Autre ligne',scalar:'Scalaire',apply:'Appliquer',undo:'Annuler',redo:'Rétablir',reset:'Repartir du début',zero:'Le scalaire doit être non nul.',distinct:'Choisir deux lignes différentes.',row:'Choisir une ligne de la matrice.',large:'Les coefficients deviennent trop grands. Annuler ou choisir un scalaire plus simple.',number:'Utiliser un nombre ou une fraction, par exemple −1/2.',done:'Forme échelonnée réduite obtenue.',operation:'opération',operations:'opérations',condition:'Condition sur les paramètres',values:'Valeur(s) de $t$',history:'Historique',viewHistory:'Voir l’historique'},
 en:{add:'Add a row',swap:'Swap',scale:'Scale',target:'Row to change',source:'Other row',scalar:'Scalar',apply:'Apply',undo:'Undo',redo:'Redo',reset:'Start over',zero:'The scalar must be nonzero.',distinct:'Choose two different rows.',row:'Choose a row of the matrix.',large:'The entries are getting too large. Undo or choose a simpler scalar.',number:'Use a number or a fraction, for example −1/2.',done:'Reduced row echelon form reached.',operation:'operation',operations:'operations',condition:'Condition on the parameters',values:'Value(s) of $t$',history:'History',viewHistory:'View history'},
};
function OperationHistory({history,value,onChange,question,disabled,t,clearError}) {
  const historyRef=useRef(null);
  const future=value.future??[];
  useEffect(()=>{if(historyRef.current)historyRef.current.scrollTop=historyRef.current.scrollHeight;},[history.length]);
  const entries=history.map((step,i)=><li key={i}><MathRenderer content={`$${operationLatex(step.operation)}$`}/></li>);
  return <aside className="system-history-panel" aria-label={t.history}>
    <div className="system-history-heading"><h3>{t.history}</h3>{history.length>0&&<span aria-label={`${history.length} ${history.length===1?t.operation:t.operations}`}>{history.length}</span>}</div>
    <div className="system-history-actions">
      <button type="button" disabled={disabled||!history.length} title={t.undo} aria-label={t.undo} onClick={()=>{
        const last=history[history.length-1];onChange({...value,matrix:last.before,history:history.slice(0,-1),future:[...future,last]});clearError();
      }}><ArrowUturnLeftIcon aria-hidden="true"/></button>
      <button type="button" disabled={disabled||(!history.length&&!future.length)} title={t.reset} aria-label={t.reset} onClick={()=>{
        onChange({...value,matrix:question.initialMatrix.map(row=>[...row]),history:[],future:[]});clearError();
      }}><ArrowPathIcon aria-hidden="true"/></button>
      <button type="button" disabled={disabled||!future.length} title={t.redo} aria-label={t.redo} onClick={()=>{
        const next=future[future.length-1];
        onChange({...value,matrix:rowOperation(value.matrix,next.operation),history:[...history,next],future:future.slice(0,-1)});clearError();
      }}><ArrowUturnRightIcon aria-hidden="true"/></button>
    </div>
    <ol className="system-history-desktop" ref={historyRef}>{entries}</ol>
    <details className="system-history-mobile"><summary>{t.viewHistory}{history.length>0&&<span>{history.length}</span>}</summary><ol>{entries}</ol></details>
  </aside>;
}
export function RowSelect({label,value,onChange,disabled,count,excluded}) {
  const [open,setOpen]=useState(false);
  const root=useRef(null),trigger=useRef(null),options=useRef([]);
  const close=()=>{setOpen(false);trigger.current?.focus({preventScroll:true});};
  const rows = Array.from({ length: count }, (_, i) => i).filter(i => i !== excluded);
  useEffect(()=>{
    if(!open)return undefined;
    options.current[value]?.focus({preventScroll:true});
    const outside=event=>{if(!root.current?.contains(event.target))setOpen(false);};
    document.addEventListener('pointerdown',outside);
    return ()=>document.removeEventListener('pointerdown',outside);
  },[open,value]);
  useEffect(()=>{if(disabled)setOpen(false);},[disabled]);
  return <div className="system-row-select" ref={root}>
    <button type="button" className="system-row-select-trigger" ref={trigger} aria-label={label} aria-haspopup="listbox" aria-expanded={open} disabled={disabled}
      onClick={()=>setOpen(x=>!x)} onKeyDown={event=>{if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();setOpen(true);}}}>
      <MathRenderer as="span" content={`$L_{${value+1}}$`} responsiveMath={false}/><ChevronDownIcon aria-hidden="true"/>
    </button>
    {open&&<div className="system-row-options" role="listbox" aria-label={label}>
      {rows.map((i, index)=><button type="button" className="system-row-option" key={i} value={i} role="option" aria-selected={i===value}
        ref={node=>{options.current[i]=node;}} onClick={()=>{onChange(i);close();}} onKeyDown={event=>{
          const next=event.key==='ArrowDown'?rows[(index+1)%rows.length]:event.key==='ArrowUp'?rows[(index+rows.length-1)%rows.length]:event.key==='Home'?rows[0]:event.key==='End'?rows.at(-1):null;
          if(next!==null){event.preventDefault();options.current[next]?.focus({preventScroll:true});}
          if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}
          if(event.key==='Tab')close();
        }}><MathRenderer as="span" content={`$L_{${i+1}}$`} responsiveMath={false}/></button>)}
    </div>}
  </div>;
}
function RowWorkspace({value,onChange,onCheck,question,disabled,lang,spec}) {
  const t=texts[lang]??texts.fr;
  const [type,setType]=useState('add'),[target,setTarget]=useState(0),[source,setSource]=useState(1),[factor,setFactor]=useState('1'),[error,setError]=useState('');
  const history=value.history??[];
  const autoCheck = spec.type === 'row-reduction';
  const apply=()=>{
    try{
      if(history.length>=100)throw new Error('large');
      const operation={type,target,source,factor};
      const matrix=rowOperation(value.matrix,operation);
      const next = { ...value, matrix, history: [...history, { before: value.matrix, operation }], future: [] };
      setError('');
      if (autoCheck && onCheck && sameMatrix(matrix, question.expected)) onCheck(next);
      else onChange(next);
    }catch(e){setError(t[e.message]??t.number);}
  };
  const select = (label, current, change, excluded) => (
    <RowSelect label={label} value={current} onChange={change} disabled={disabled} count={value.matrix.length} excluded={excluded}/>
  );
  const done = autoCheck && sameMatrix(value.matrix, question.expected);
  return <div className="system-row-workspace">
    <OperationHistory history={history} value={value} onChange={onChange} question={question} disabled={disabled} t={t} clearError={()=>setError('')}/>
    <div className="system-row-main">
      <MathRenderer className="system-live-matrix" content={`$$${augmentedLatex(value.matrix, question.augmentedSplit)}$$`}/>
      {done && <div className="system-operation-status system-reduced" role="status">✓ {t.done}</div>}
      {!(done && disabled) && <>
        <div className="system-operation-tabs" role="group" aria-label={lang==='en'?'Row operation':'Opération sur les lignes'}>
          {[['add','L_i\\leftarrow L_i+\\lambda L_j'],['scale','L_i\\leftarrow\\lambda L_i'],['swap','L_i\\leftrightarrow L_j']].map(([id,latex])=><button key={id} type="button" aria-pressed={id===type} title={t[id]} aria-label={t[id]} disabled={disabled} onClick={()=>{
            if(id!=='scale' && target===source) setSource((target+1)%value.matrix.length);
            setType(id);setError('');
          }}><MathRenderer as="span" content={`$${latex}$`} responsiveMath={false}/></button>)}
        </div>
        <div className="system-operation-editor" role="group" aria-label={t[type]}>
          {select(t.target, target, nextTarget => {
            setTarget(nextTarget);
            if (type !== 'scale' && nextTarget === source) setSource(target);
          })}
          <MathRenderer as="span" content={type==='swap'?'$\\leftrightarrow$':'$\\leftarrow$'} responsiveMath={false}/>
          {type==='add'&&<MathRenderer as="span" content={`$L_{${target+1}}+$`} responsiveMath={false}/>}
          {type!=='swap'&&<input className="system-scalar-input" aria-label={t.scalar} value={factor} inputMode="decimal" placeholder={lang==='en'?'e.g. 1/2':'ex. 1/2'} disabled={disabled} onChange={e=>setFactor(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();apply();}}}/>}
          {type==='scale'?<MathRenderer as="span" content={`$L_{${target+1}}$`} responsiveMath={false}/>:select(t.source,source,setSource,target)}
        </div>
        <div className="system-operation-footer">
          {type!=='swap'&&<div className="system-scalar-symbols">
            <button type="button" disabled={disabled} aria-label={lang==='en'?'Toggle scalar minus sign':'Changer le signe du scalaire'} onMouseDown={e=>e.preventDefault()} onClick={()=>setFactor(x=>x.startsWith('-')?x.slice(1):`-${x}`)}>−</button>
            <button type="button" disabled={disabled} aria-label={lang==='en'?'Insert scalar fraction bar':'Insérer une barre de fraction dans le scalaire'} onMouseDown={e=>e.preventDefault()} onClick={()=>setFactor(x=>x.includes('/')?x:`${x}/`)}>/</button>
          </div>}
          <button type="button" className="system-apply" disabled={disabled} onClick={apply}>{t.apply}</button>
        </div>
        {error&&<p className="exercise-inline-error" role="alert">{error}</p>}
      </>}
    </div>
    {spec.type==='parameter-system'&&<label className="exercise-field-label system-condition"><MathRenderer as="span" content={question.expected.kind==='roots'?t.values:t.condition}/><input className="exercise-text-input" value={value.condition} onChange={e=>onChange({...value,condition:e.target.value})} disabled={disabled} inputMode="text" autoComplete="off" spellCheck={false} placeholder={localize(spec.placeholder,lang)}/></label>}
  </div>;
}
export default function AugmentedSystemInput(props) {
  return props.spec.type==='matrix-writing'?<MatrixWriting {...props}/>:<RowWorkspace {...props}/>;
}
