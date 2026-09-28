const tr = (fr, en) => ({ fr, en });
export const differentialEquationsCourseHints = [{
  id: "ode-first-order-method",
  title: tr("Résoudre une équation différentielle linéaire d’ordre 1", "Solving a first-order linear differential equation"),
  blocks: [
    {
      type: "note", title: tr("Le cadre", "Setting"),
      content: tr(
        "Soit $I$ un intervalle réel et $a,b:I\\to\\mathbb R$ deux fonctions continues. On cherche $y$ une fonction dérivable telle que, pour tout $t\\in I$, $$y'(t)+a(t)\\,y(t)=b(t)$$",
        "Let $I$ be a real interval and $a,b:I\\to\\mathbb R$ be continuous functions. One seeks $y$ a differentiable function such that, for every $t\\in I$, $$y'(t)+a(t)\\,y(t)=b(t)$$",
      ),
    },
    {
      type: "formula", title: tr("1. Résoudre l’équation homogène", "1. Solve the homogeneous equation"),
      content: tr(
        "Choisir une primitive $A$ de $a$ sur $I$. Alors l'équation $y'+ay=0$ équivaut à $(e^A\\, y)'=0$. Les solutions homogènes sont donc $$y_H:t\\mapsto C\\,e^{-A(t)},\\qquad C\\in\\mathbb R$$",
        "Choose an antiderivative $A$ of $a$ on $I$. Then $y'+ay=0$ is equivalent to $(e^A\\, y)'=0$. The homogeneous solutions are thus $$y_H:t\\mapsto C\\,e^{-A(t)},\\qquad C\\in\\mathbb R$$",
      ),
    },
    {
      type: "formula", title: tr("2. Trouver une solution particulière par méthode de variation de la constante", "2. Find a particular solution by the method of variation of the constant"),
      content: tr(
        "Soit $u$ une fonction dérivable. On pose $\\varphi:t\\mapsto u(t)e^{-A(t)}$. $$\\begin{array}{rcl} \\varphi\\text{ est solution} & \\iff & \\forall t\\in I, \\quad\\varphi'(t)+a(t)\\varphi(t)=b(t)\\\\ & \\iff & \\forall t\\in I, \\quad u'(t)e^{-A(t)} - a(t)u(t)e^{-A(t)} +a(t)u(t)e^{-A(t)}=b(t)\\\\ \\varphi\\text{ est solution} & \\iff & \\forall t\\in I, \\quad u'(t)=b(t)e^{A(t)} \\end{array}$$ En déterminant une primitive de $u':t\\mapsto b(t)e^{A(t)}$, on obtient une solution particulière $y_P$ de l'équation initiale : $$y_P:t\\mapsto u(t)e^{-A(t)}.$$",
        "Let $u$ be a differentiable function. Define $\\varphi:t\\mapsto u(t)e^{-A(t)}$. $$\\begin{array}{rcl} \\varphi\\text{ is a solution} & \\iff & \\forall t\\in I, \\quad\\varphi'(t)+a(t)\\varphi(t)=b(t)\\\\ & \\iff & \\forall t\\in I, \\quad u'(t)e^{-A(t)} - a(t)u(t)e^{-A(t)} +a(t)u(t)e^{-A(t)}=b(t)\\\\ & \\iff & \\forall t\\in I, \\quad u'(t)=b(t)e^{A(t)} \\end{array}$$ By finding an antiderivative of $u':t\\mapsto b(t)e^{A(t)}$, one obtains a particular solution $y_P$ of the original equation: $$y_P:t\\mapsto u(t)e^{-A(t)}.$$",
      ),
    },
    {
      type: "formula", title: tr("L’ensemble des solutions", "The full solution set"),
      content: tr(
        "L'ensemble des solutions est donné par $$\\mathcal S=\\{t\\mapsto C e^{-A(t)} + y_P(t)\\mid C\\in\\mathbb R\\}$$",
        "The full solution set is given by $$\\mathcal S=\\{t\\mapsto C e^{-A(t)} + y_P(t)\\mid C\\in\\mathbb R\\}$$",
      ),
    },
    {
      type: "formula", title: tr("Condition initiale et unicité", "Initial condition and uniqueness"),
      content: tr(
        "Soit $t_0\\in I$ et $y_0\\in\\mathbb R$. Si on impose de plus que $y(t_0)=y_0$ alors la solution à l'équation différentielle est unique.",
        "Let $t_0\\in I$ and $y_0\\in\\mathbb R$. If one further imposes that $y(t_0)=y_0$, then the solution to the differential equation is unique.",
      ),
    },
  ],
}];
