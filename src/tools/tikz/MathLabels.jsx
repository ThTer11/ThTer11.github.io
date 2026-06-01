import RichContent from "../../components/RichContent";
import { escapeHtml } from "./figureModel";

export function MathLabel({ value }) {
  return (
    <span className="tikz-math-label">
      <RichContent as="span" html={escapeHtml(value)} enableMathCopy={false} />
    </span>
  );
}

export function ButtonMathLabel({ value }) {
  const content = value || "";
  const hasMath = content.includes("$") || content.includes("\\(") || content.includes("\\[");

  if (!hasMath) {
    return <span className="tikz-button-math-label">{content}</span>;
  }

  return (
    <span className="tikz-button-math-label">
      <RichContent as="span" html={escapeHtml(content)} enableMathCopy={false} />
    </span>
  );
}
