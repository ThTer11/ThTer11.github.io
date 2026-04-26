import { Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { createContext, useContext, useState, useEffect } from "react";
import translations from "./translations";
import Home from "./pages/Home";
import Recherche from "./pages/Recherche";
import Enseignements from "./pages/Enseignements";
import Conferences from "./pages/Conferences";
import Gauss from "./pages/Gauss";
import Inverse from "./pages/Inverse";
import LinearMap from "./pages/LinearMap";
import TikzEditor from "./pages/TikzEditor";

const LangContext = createContext();
export const useLang = () => useContext(LangContext);

function LangWrapper({ children }) {
  const { lang } = useParams();
  const [currentLang, setLang] = useState(lang && translations[lang] ? lang : "fr");

  useEffect(() => {
    if (lang && translations[lang] && lang !== currentLang) {
      setLang(lang);
    }
  }, [lang, currentLang]);

  if (!translations[currentLang]) {
    return <Navigate to="/fr/" replace />;
  }

  return (
    <LangContext.Provider value={{ lang: currentLang, setLang, t: translations[currentLang] }}>
      {children}
    </LangContext.Provider>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}

function PageBackground() {
  const { pathname } = useLocation();

  useEffect(() => {
    const classes = [
      "site-background-home",
      "site-background-teaching",
      "site-background-conferences",
      "site-background-default",
    ];
    const nextClass = pathname.includes("/conferences")
      ? "site-background-conferences"
      : pathname.includes("/enseignements") ||
          pathname.includes("/gauss") ||
          pathname.includes("/inverse") ||
          pathname.includes("/application-lineaire") ||
          pathname.includes("/tikz")
        ? "site-background-teaching"
        : pathname.includes("/recherche")
          ? "site-background-default"
          : "site-background-home";

    document.body.classList.remove(...classes);
    document.body.classList.add(nextClass);

    return () => {
      document.body.classList.remove(nextClass);
    };
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <PageBackground />
      <Routes>
        <Route path="/" element={<Navigate to="/fr/" replace />} />
        <Route path="/:lang" element={<LangWrapper><Home /></LangWrapper>} />
        <Route path="/:lang/recherche" element={<LangWrapper><Recherche /></LangWrapper>} />
        <Route path="/:lang/enseignements" element={<LangWrapper><Enseignements /></LangWrapper>} />
        <Route path="/:lang/gauss" element={<LangWrapper><Gauss /></LangWrapper>} />
        <Route path="/:lang/inverse" element={<LangWrapper><Inverse /></LangWrapper>} />
        <Route path="/:lang/application-lineaire" element={<LangWrapper><LinearMap /></LangWrapper>} />
        <Route path="/:lang/tikz" element={<LangWrapper><TikzEditor /></LangWrapper>} />
        <Route path="/:lang/conferences" element={<LangWrapper><Conferences /></LangWrapper>} />
        <Route path="*" element={<Navigate to="/fr/" replace />} />
      </Routes>
    </>
  );
}
