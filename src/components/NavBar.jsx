import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useLang } from "../App";
import ReactCountryFlag from "react-country-flag";
import Language from "@heroicons/react/24/outline/GlobeAltIcon";
import Menu from "@heroicons/react/24/outline/Bars3Icon";
import Moon from "@heroicons/react/24/outline/MoonIcon";
import ChevronDown from "@heroicons/react/24/outline/ChevronDownIcon";
import "../navbar.css";

export default function NavBar() {
  const [menu, setMenu] = useState(false);
  const [translationsOpen, setTranslationsOpen] = useState(false);
  const [teachingMenu, setTeachingMenu] = useState(false);
  const { t, lang, setLang } = useLang();
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    setMenu(false);
    setTeachingMenu(false);
  }, [location.pathname, location.hash]);

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  const changeLang = (newLang) => {
    setLang(newLang);
    setTranslationsOpen(false);

    const pathParts = location.pathname.split("/").filter(Boolean);

    if (pathParts.length === 0) {
      navigate(`/${newLang}/${location.search}${location.hash}`);
      return;
    }

    if (pathParts[0] === "website") {
      pathParts.splice(1, 1, newLang);
      navigate(`/${pathParts.join("/")}${location.search}${location.hash}`);
      return;
    }

    pathParts[0] = newLang;
    navigate(`/${pathParts.join("/")}${location.search}${location.hash}`);
  };

  const teachingLinks = useMemo(
    () => [
      {
        to: `/${lang}/enseignements#activities`,
        label: t.teaching.sectionActivities,
      },
      {
        to: `/${lang}/enseignements#resources`,
        label: t.teaching.sectionResources,
      },
    ],
    [lang, t.teaching.sectionActivities, t.teaching.sectionResources],
  );

  const teachingActive = location.pathname === `/${lang}/enseignements`;

  return (
    <div>
      <div className="site-nav fixed flex items-center justify-between w-full top-0 left-0 px-9 py-3 border-b border-gray-700 bg-white/20 dark:bg-[#252525]/20 backdrop-blur-sm rounded-xl shadow-lg z-50">
        <Menu
          onClick={() => setMenu((prev) => !prev)}
          className="dark:text-white cursor-pointer w-6 lg:hidden"
        />
        <Link to={`/${lang}/`} className="dark:text-white font-mono text-xl font-semibold cursor-pointer">
          Théo Ternier
        </Link>

        <div className="hidden items-center lg:flex">
          <NavLink
            to={`/${lang}/`}
            end
            className={({ isActive }) =>
              `transition mx-2 p-2 rounded-lg ${
                isActive
                  ? "text-white dark:text-black bg-black/80 dark:bg-white/80"
                  : "text-gray-500 dark:hover:text-white hover:text-black"
              }`
            }
          >
            {t.nav.home}
          </NavLink>
          <NavLink
            to={`/${lang}/recherche`}
            className={({ isActive }) =>
              `transition mx-2 p-2 rounded-lg ${
                isActive
                  ? "text-white dark:text-black bg-black/80 dark:bg-white/80"
                  : "text-gray-500 dark:hover:text-white hover:text-black"
              }`
            }
          >
            {t.nav.research}
          </NavLink>

          <div
            className="nav-teaching-group"
            onMouseEnter={() => setTeachingMenu(true)}
            onMouseLeave={() => setTeachingMenu(false)}
          >
            <NavLink
              to={`/${lang}/enseignements`}
              className={() =>
                `transition mx-2 p-2 rounded-lg ${
                  teachingActive
                    ? "text-white dark:text-black bg-black/80 dark:bg-white/80"
                    : "text-gray-500 dark:hover:text-white hover:text-black"
                }`
              }
            >
              {t.nav.teaching}
            </NavLink>
            <button
              type="button"
              className={teachingActive ? "nav-caret nav-caret-active" : "nav-caret"}
              onClick={() => setTeachingMenu((prev) => !prev)}
              aria-label={t.nav.teaching}
            >
              <ChevronDown className="w-4 h-4" />
            </button>

            {teachingMenu && (
              <div className="nav-submenu">
                {teachingLinks.map((link) => (
                  <Link key={link.to} to={link.to} className="nav-submenu-link">
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <NavLink
            to={`/${lang}/conferences`}
            className={({ isActive }) =>
              `transition mx-2 p-2 rounded-lg ${
                isActive
                  ? "text-white dark:text-black bg-black/80 dark:bg-white/80"
                  : "text-gray-500 dark:hover:text-white hover:text-black"
              }`
            }
          >
            {t.nav.conferences}
          </NavLink>
        </div>

        <div className="flex items-center">
          <Moon onClick={toggleTheme} className="dark:text-white cursor-pointer w-6 mx-3" />
          <Language
            onClick={() => setTranslationsOpen((prev) => !prev)}
            className="dark:text-white cursor-pointer w-6 mx-3"
          />
        </div>
      </div>

      {translationsOpen && (
        <div className="fixed flex flex-col justify-between top-[56px] right-7 p-6 bg-white/20 dark:bg-[#252525]/20 backdrop-blur-sm z-[1000] border border-gray-400 rounded-lg shadow-md">
          <button onClick={() => changeLang("fr")}>
            <ReactCountryFlag countryCode="FR" svg />
          </button>
          <button onClick={() => changeLang("en")}>
            <ReactCountryFlag countryCode="GB" svg />
          </button>
        </div>
      )}

      {menu && (
        <div className="fixed top-[53px] left-0 w-full border-b bg-white/50 dark:bg-[#252525]/50 border-gray-700 backdrop-blur-sm lg:hidden flex flex-col animate-deroule overflow-hidden shadow-xl z-[1000]">
          <NavLink
            to={`/${lang}/`}
            end
            className={({ isActive }) =>
              `transition m-2 ${
                isActive
                  ? "dark:text-white text-black"
                  : "text-gray-500 dark:hover:text-white hover:text-black"
              }`
            }
          >
            {t.nav.home}
          </NavLink>
          <NavLink
            to={`/${lang}/recherche`}
            className={({ isActive }) =>
              `transition m-2 ${
                isActive
                  ? "dark:text-white text-black"
                  : "text-gray-500 dark:hover:text-white hover:text-black"
              }`
            }
          >
            {t.nav.research}
          </NavLink>
          <NavLink
            to={`/${lang}/enseignements`}
            className={({ isActive }) =>
              `transition m-2 ${
                isActive
                  ? "dark:text-white text-black"
                  : "text-gray-500 dark:hover:text-white hover:text-black"
              }`
            }
          >
            {t.nav.teaching}
          </NavLink>
          <div className="nav-mobile-submenu">
            {teachingLinks.map((link) => (
              <Link key={link.to} to={link.to} className="nav-mobile-submenu-link">
                {link.label}
              </Link>
            ))}
          </div>
          <NavLink
            to={`/${lang}/conferences`}
            className={({ isActive }) =>
              `transition m-2 ${
                isActive
                  ? "dark:text-white text-black"
                  : "text-gray-500 dark:hover:text-white hover:text-black"
              }`
            }
          >
            {t.nav.conferences}
          </NavLink>
        </div>
      )}
    </div>
  );
}
