import NavBar from "../components/NavBar";
import { useState } from "react";
import { FaFilePdf } from 'react-icons/fa';
import Tex from '@heroicons/react/24/outline/BookmarkIcon';
import { Link } from "react-router-dom";
import { useLang } from '../App';

export default function Enseignements() {
    const { t } = useLang();
    const [texText, setTexText] = useState("");
    const [showModal, setShowModal] = useState(false);

    const openTeX = async (texfile) => {
        const response = await fetch(`${process.env.PUBLIC_URL}/tex/${texfile}`);
        const text = await response.text();
        setTexText(text);
        setShowModal(true);
    };
        
    return (
        <div className="min-w-screen min-h-screen bg-gray-50 dark:bg-[#1b1b1b] pb-10">
            <NavBar />

            <div className="flex flex-col pt-20 lg:pt-28 px-5 lg:px-20">
                <h1 className="dark:text-white text-4xl font-extrabold tracking-tight text-center lg:text-start">
                    {t.teaching.title}
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
                    
                    {/* Bloc enseignement */}
                    <div className="flex flex-col border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#252525] p-6 rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 space-y-6 animate-defil">
                        <h1 className="dark:text-white text-2xl font-bold border-b border-gray-300 dark:border-gray-600 pb-3">
                            2025-2026
                        </h1>

                        <div>
                            <h2 className="dark:text-white font-semibold text-lg">{t.teaching.teach1.title}</h2>
                            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{t.teaching.teach1.desc1}</p>
                            <p className="text-gray-700 dark:text-gray-300 text-sm mt-1" dangerouslySetInnerHTML={{ __html: t.teaching.teach1.desc11 }}></p>
                            <a target="__blank" href={`${process.env.PUBLIC_URL}/docs/meu102td01sol.pdf`} className="inline-flex items-center mt-3 dark:bg-[#141414] border border-green-500 px-3 py-2 rounded-lg shadow-md transition duration-200 text-green-500 hover:bg-green-500 hover:text-white dark:hover:text-white dark:hover:bg-green-500">
                                <FaFilePdf className="w-5 h-5" /> <span className="text-sm ml-2">Solutions TD1</span>
                            </a>
                        </div>

                        <div>
                            <h2 className="dark:text-white font-semibold text-lg">{t.teaching.teach1.title2}</h2>
                            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{t.teaching.teach1.desc2}</p>
                            <p className="text-gray-700 dark:text-gray-300 text-sm mt-1" dangerouslySetInnerHTML={{ __html: t.teaching.teach1.desc21 }}></p>
                        </div>

                        <div>
                            <h2 className="dark:text-white font-semibold text-lg">{t.teaching.teach1.title3}</h2>
                            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{t.teaching.teach1.desc3}</p>
                        </div>

                        <div>
                            <h2 className="dark:text-white font-semibold text-lg">{t.teaching.teach1.title4}</h2>
                            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1" dangerouslySetInnerHTML={{ __html: t.teaching.teach1.desc4 }}>
                            </p>
                        </div>
                    </div>

                    {/* Bloc enseignement */}
                    <div className="flex flex-col border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#252525] p-6 rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 space-y-6 animate-defil">
                        <h1 className="dark:text-white text-2xl font-bold border-b border-gray-300 dark:border-gray-600 pb-3">
                            2024-2025
                        </h1>

                        <div>
                            <h2 className="dark:text-white font-semibold text-lg">{t.teaching.teach2.title}</h2>
                            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{t.teaching.teach2.desc1}</p>
                        </div>

                        <div>
                            <h2 className="dark:text-white font-semibold text-lg">{t.teaching.teach2.title2}</h2>
                            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{t.teaching.teach2.desc2}</p>
                        </div>

                        <div>
                            <h2 className="dark:text-white font-semibold text-lg">{t.teaching.teach2.title3}</h2>
                            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{t.teaching.teach2.desc3}</p>
                            <a target="__blank" href={`${process.env.PUBLIC_URL}/docs/exercicesterminale.pdf`} className="inline-flex items-center mt-3 dark:bg-[#141414] border border-red-500 px-3 py-2 rounded-lg shadow-md transition duration-200 text-red-500 hover:bg-red-500 hover:text-white dark:hover:text-white dark:hover:bg-red-500">
                                <FaFilePdf className="w-5 h-5" /> <span className="text-sm ml-2">PDF</span>
                            </a>
                        </div>
                    </div>

                    {/* Bloc enseignement */}
                    <div className="flex flex-col border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#252525] p-6 rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 space-y-6 animate-defil">
                        <h1 className="dark:text-white text-2xl font-bold border-b border-gray-300 dark:border-gray-600 pb-3">
                            2023-2024
                        </h1>

                        <div>
                            <h2 className="dark:text-white font-semibold text-lg">{t.teaching.teach3.title}</h2>
                            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1" dangerouslySetInnerHTML={{ __html: t.teaching.teach3.desc }}>
                            </p>
                            <a target="__blank" href={`${process.env.PUBLIC_URL}/docs/metaplansalgebre.pdf`} className="inline-flex items-center mt-3 dark:bg-[#141414] border border-red-500 px-3 py-2 rounded-lg shadow-md transition duration-200 text-red-500 hover:bg-red-500 hover:text-white dark:hover:text-white dark:hover:bg-red-500">
                                <FaFilePdf className="w-5 h-5" /> <span className="text-sm ml-2">{t.teaching.agreg.algebre}</span>
                            </a>
                            <a target="__blank" href={`${process.env.PUBLIC_URL}/docs/metaplansanalyse.pdf`} className="inline-flex items-center mt-3 dark:bg-[#141414] border border-red-500 px-3 py-2 rounded-lg shadow-md transition duration-200 text-red-500 hover:bg-red-500 hover:text-white dark:hover:text-white dark:hover:bg-red-500 ml-3">
                                <FaFilePdf className="w-5 h-5" /> <span className="text-sm ml-2">{t.teaching.agreg.analyse}</span>
                            </a>
                            <button
                                onClick={() => openTeX('packageagreg.tex')}
                                className="inline-flex items-center border border-gray-600 px-3 py-2 ml-3 rounded-lg shadow-md text-gray-600 dark:text-gray-400 dark:bg-[#141414] transition duration-200 hover:bg-gray-600 hover:text-white dark:hover:text-white dark:hover:bg-gray-600"
                            >
                                <Tex className="w-5 h-5" />
                                <span className="text-sm ml-2">Package</span>
                            </button>
                        </div>
                    </div>

                    {showModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                            <div className="bg-white dark:bg-[#252525] p-6 rounded-xl max-w-3xl w-full max-h-[80vh] overflow-auto relative">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="absolute top-3 right-3 text-gray-500 dark:text-gray-400 font-bold text-xl"
                                >
                                    ×
                                </button>
                                <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                                    {texText}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
