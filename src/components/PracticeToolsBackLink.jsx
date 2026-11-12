import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import { useLang } from "../App";
import { practiceHref } from "../practice/catalog";
import "../practice.css";

export default function PracticeToolsBackLink() {
  const { t, lang } = useLang();
  return (
    <Link className="practice-back-link" to={practiceHref(lang, "outils")}>
      <ArrowLeftIcon aria-hidden="true" />
      {t.practice.backTools}
    </Link>
  );
}
