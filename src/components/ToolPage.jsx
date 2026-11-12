import { ChevronDownIcon } from "@heroicons/react/24/outline";
import NavBar from "./NavBar";
import PracticeToolsBackLink from "./PracticeToolsBackLink";
import "../research.css";
import "../editorial.css";
import "../tools.css";

export function ToolDetails({ title, children, className = "" }) {
  return (
    <details className={`tool-details ${className}`}>
      <summary>{title}<ChevronDownIcon aria-hidden="true" /></summary>
      <div className="tool-details-content">{children}</div>
    </details>
  );
}

export default function ToolPage({ title, description, className = "", children }) {
  return (
    <div className={`research-page editorial-page tools-page ${className}`}>
      <NavBar />
      <main className="research-shell tool-shell">
        <PracticeToolsBackLink />
        <header className="editorial-heading">
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </header>
        {children}
      </main>
    </div>
  );
}
