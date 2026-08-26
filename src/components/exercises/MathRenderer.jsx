import RichContent from "../RichContent";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default function MathRenderer({
  as = "div",
  content = "",
  className,
  display = false,
  trustedHtml = false,
  enableMathCopy = false,
}) {
  const raw = String(content ?? "");
  const math = display && !raw.includes("$") && !raw.includes("\\[")
    ? `$$${raw}$$`
    : raw;
  const html = trustedHtml ? math : escapeHtml(math).replaceAll("\n", "<br />");

  return (
    <RichContent
      as={as}
      html={html}
      className={className}
      enableMathCopy={enableMathCopy}
    />
  );
}
