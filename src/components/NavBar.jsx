import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Bars3Icon, XMarkIcon, MoonIcon, SunIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { useLang } from "../App";
import { isPracticePath, practiceHref } from "../practice/catalog";
import "../navbar.css";

const navClass = ({ isActive }) => `nav-main-link${isActive ? " nav-main-link-active" : ""}`;

export default function NavBar() {
  const [menu, setMenu] = useState(false);
  const [teachingMenu, setTeachingMenu] = useState(false);
  const { t, lang, setLang } = useLang();
  const navigate = useNavigate();
  const location = useLocation();
  const rootRef = useRef(null);
  const menuButtonRef = useRef(null);
  const teachingButtonRef = useRef(null);
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("theme") || "dark"; } catch { return "dark"; }
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try { localStorage.setItem("theme", theme); } catch { /* Theme works without storage. */ }
  }, [theme]);

  useEffect(() => {
    setMenu(false);
    setTeachingMenu(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key !== "Escape") return;
      if (menu) menuButtonRef.current?.focus();
      else if (teachingMenu) teachingButtonRef.current?.focus();
      setMenu(false);
      setTeachingMenu(false);
    };
    const closeOutside = (event) => {
      if (rootRef.current?.contains(event.target)) return;
      setMenu(false);
      setTeachingMenu(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOutside);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOutside);
    };
  }, [menu, teachingMenu]);

  const toggleTheme = () => setTheme((value) => value === "dark" ? "light" : "dark");
  const changeLang = (newLang) => {
    setLang(newLang);
    setMenu(false);
    const pathParts = location.pathname.split("/").filter(Boolean);
    if (pathParts[0] === "website") pathParts.splice(1, 1, newLang);
    else if (pathParts.length > 0) pathParts[0] = newLang;
    else pathParts.push(newLang);
    navigate(`/${pathParts.join("/")}${location.search}${location.hash}`);
  };

  const teachingLinks = [
    { to: `/${lang}/enseignements#activities`, label: t.teaching.sectionActivities },
    { to: `/${lang}/enseignements#resources`, label: t.teaching.sectionResources },
  ];
  const practiceActive = isPracticePath(location.pathname, lang);
  const teachingActive = location.pathname === `/${lang}/enseignements`;
  const ThemeIcon = theme === "dark" ? SunIcon : MoonIcon;
  const themeAction = theme === "dark" ? t.nav.light : t.nav.dark;
  const practiceClass = `nav-practice-link${practiceActive ? " nav-practice-link-active" : ""}`;

  return (
    <header ref={rootRef} className="site-navigation">
      <nav className="site-nav" aria-label={t.nav.menu}>
        <Link to={`/${lang}/`} className="nav-brand">Théo Ternier</Link>
        <div className="nav-desktop-links">
          <NavLink to={`/${lang}/`} end className={navClass}>{t.nav.home}</NavLink>
          <NavLink to={`/${lang}/recherche`} className={navClass}>{t.nav.research}</NavLink>
          <div className={`nav-teaching-group${teachingActive ? " nav-teaching-group-active" : ""}`}
            onMouseEnter={() => setTeachingMenu(true)} onMouseLeave={() => setTeachingMenu(false)}
            onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setTeachingMenu(false); }}>
            <NavLink to={`/${lang}/enseignements`} className={navClass}>{t.nav.teaching}</NavLink>
            <button ref={teachingButtonRef} type="button" className="nav-icon-button nav-caret"
              aria-label={t.nav.teaching} aria-expanded={teachingMenu} aria-controls="nav-teaching-links"
              onClick={() => setTeachingMenu((value) => !value)}><ChevronDownIcon aria-hidden="true" /></button>
            {teachingMenu && <div id="nav-teaching-links" className="nav-submenu">
              {teachingLinks.map((link) => <Link key={link.to} to={link.to} className="nav-submenu-link">{link.label}</Link>)}
            </div>}
          </div>
          <NavLink to={`/${lang}/conferences`} className={navClass}>{t.nav.conferences}</NavLink>
          <Link to={practiceHref(lang)} className={practiceClass} aria-current={practiceActive ? "page" : undefined}>{t.nav.practice}</Link>
        </div>
        <div className="nav-desktop-controls">
          <button type="button" className="nav-icon-button" onClick={toggleTheme} aria-label={themeAction} title={themeAction}>
            <ThemeIcon aria-hidden="true" />
          </button>
          <div className="nav-language-options" role="group" aria-label={t.nav.language}>
            <button type="button" lang="fr" aria-pressed={lang === "fr"} onClick={() => changeLang("fr")}>FR</button>
            <button type="button" lang="en" aria-pressed={lang === "en"} onClick={() => changeLang("en")}>EN</button>
          </div>
        </div>
        <Link to={practiceHref(lang)} className={`nav-mobile-practice ${practiceClass}`} aria-current={practiceActive ? "page" : undefined}>
          {t.nav.practice}
        </Link>
        <button ref={menuButtonRef} type="button" className="nav-mobile-toggle nav-icon-button"
          onClick={() => setMenu((value) => !value)} aria-label={menu ? t.nav.closeMenu : t.nav.menu}
          aria-expanded={menu} aria-controls="nav-mobile-menu">
          {menu ? <XMarkIcon aria-hidden="true" /> : <Bars3Icon aria-hidden="true" />}
        </button>
      </nav>
      {menu && <nav id="nav-mobile-menu" className="nav-mobile-menu" aria-label={t.nav.menu}
        onClick={(event) => { if (event.target.closest("a")) setMenu(false); }}>
        <NavLink to={`/${lang}/`} end className={navClass}>{t.nav.home}</NavLink>
        <NavLink to={`/${lang}/recherche`} className={navClass}>{t.nav.research}</NavLink>
        <NavLink to={`/${lang}/enseignements`} className={navClass}>{t.nav.teaching}</NavLink>
        <div className="nav-mobile-submenu">
          {teachingLinks.map((link) => <Link key={link.to} to={link.to} className="nav-submenu-link">{link.label}</Link>)}
        </div>
        <NavLink to={`/${lang}/conferences`} className={navClass}>{t.nav.conferences}</NavLink>
        <Link to={practiceHref(lang)} className={practiceClass} aria-current={practiceActive ? "page" : undefined}>{t.nav.practice}</Link>
        <div className="nav-mobile-settings">
          <button type="button" className="nav-theme-button" onClick={toggleTheme}><ThemeIcon aria-hidden="true" />{themeAction}</button>
          <div className="nav-language-options" role="group" aria-label={t.nav.language}>
            <button type="button" lang="fr" aria-pressed={lang === "fr"} onClick={() => changeLang("fr")}>FR</button>
            <button type="button" lang="en" aria-pressed={lang === "en"} onClick={() => changeLang("en")}>EN</button>
          </div>
        </div>
      </nav>}
    </header>
  );
}
