const tr = (fr, en) => ({ fr, en });
export const differentialEquationsCourseHints = [{
  id: "ode-first-order-method",
  title: tr("Résoudre une équation différentielle linéaire d’ordre 1", "Solving a first-order linear differential equation"),
  blocks: [
    {
      type: "note", title: tr("Le cadre", "Setting"),
      content: tr(
        "Soit $I$ un intervalle réel et $a,b:I\\to\\mathbb R$ deux fonctions continues. On cherche une fonction dérivable $y$ telle que, pour tout $t\\in I$, $$y^{\\prime}(t)=a(t)y(t)+b(t).$$",
        "Let $I$ be a real interval and let $a,b:I\\to\\mathbb R$ be continuous functions. We seek a differentiable function $y$ such that, for every $t\\in I$, $$y^{\\prime}(t)=a(t)y(t)+b(t).$$",
      ),
    },
    {
      type: "formula", title: tr("1. Résoudre l’équation homogène", "1. Solve the homogeneous equation"),
      content: tr(
        "L’équation homogène associée est $$y_H^{\\prime}(t)=a(t)y_H(t).$$ Choisir une primitive $A$ de $a$ sur $I$. Les solutions homogènes sont alors $$y_H:t\\mapsto C e^{A(t)},\\qquad C\\in\\mathbb R.$$",
        "The associated homogeneous equation is $$y_H^{\\prime}(t)=a(t)y_H(t).$$ Choose an antiderivative $A$ of $a$ on $I$. The homogeneous solutions are then $$y_H:t\\mapsto C e^{A(t)},\\qquad C\\in\\mathbb R.$$",
      ),
    },
    {
      type: "formula", title: tr("2. Trouver une solution particulière par variation de la constante", "2. Find a particular solution by variation of constants"),
      content: tr(
        "Soit $u$ une fonction dérivable. On pose $\\varphi:t\\mapsto u(t)e^{A(t)}$. $$\\begin{array}{rcl} \\varphi\\text{ est solution} & \\iff & \\forall t\\in I,\\quad \\varphi^{\\prime}(t)=a(t)\\varphi(t)+b(t)\\\\ & \\iff & \\forall t\\in I,\\quad u^{\\prime}(t)e^{A(t)}+a(t)u(t)e^{A(t)}=a(t)u(t)e^{A(t)}+b(t)\\\\ & \\iff & \\forall t\\in I,\\quad u^{\\prime}(t)=b(t)e^{-A(t)}. \\end{array}$$ En déterminant une primitive de $u^{\\prime}:t\\mapsto b(t)e^{-A(t)}$, on obtient une solution particulière de l’équation initiale : $$y_P:t\\mapsto u(t)e^{A(t)}.$$",
        "Let $u$ be a differentiable function and set $\\varphi:t\\mapsto u(t)e^{A(t)}$. $$\\begin{array}{rcl} \\varphi\\text{ is a solution} & \\iff & \\forall t\\in I,\\quad \\varphi^{\\prime}(t)=a(t)\\varphi(t)+b(t)\\\\ & \\iff & \\forall t\\in I,\\quad u^{\\prime}(t)e^{A(t)}+a(t)u(t)e^{A(t)}=a(t)u(t)e^{A(t)}+b(t)\\\\ & \\iff & \\forall t\\in I,\\quad u^{\\prime}(t)=b(t)e^{-A(t)}. \\end{array}$$ By finding an antiderivative of $u^{\\prime}:t\\mapsto b(t)e^{-A(t)}$, we obtain a particular solution of the original equation: $$y_P:t\\mapsto u(t)e^{A(t)}.$$",
      ),
    },
    {
      type: "formula", title: tr("L’ensemble des solutions", "The full solution set"),
      content: tr(
        "L’ensemble des solutions est donné par $$\\mathcal S=\\{t\\mapsto C e^{A(t)}+y_P(t)\\mid C\\in\\mathbb R\\}.$$",
        "The full solution set is $$\\mathcal S=\\{t\\mapsto C e^{A(t)}+y_P(t)\\mid C\\in\\mathbb R\\}.$$",
      ),
    },
    {
      type: "formula", title: tr("Condition initiale et unicité", "Initial condition and uniqueness"),
      content: tr(
        "Soit $t_0\\in I$ et $y_0\\in\\mathbb R$. Si on impose de plus $y(t_0)=y_0$, alors la solution de l’équation différentielle est unique.",
        "Let $t_0\\in I$ and $y_0\\in\\mathbb R$. If we also impose $y(t_0)=y_0$, then the solution of the differential equation is unique.",
      ),
    },
  ],
}];
