import NavBar from "../components/NavBar";
import { FaFilePdf } from 'react-icons/fa';
import { Link } from "react-router-dom";
import { useLang } from '../App';

export default function Conferences() {
    const { t } = useLang();

    return (
        <div className="min-w-screen min-h-screen bg-gray-50 dark:bg-[#1b1b1b] pb-10">
            <NavBar />

            <div className="flex flex-col pt-20 lg:pt-28 px-5 lg:px-20">
                <h1 className="dark:text-white text-4xl font-extrabold tracking-tight text-center lg:text-start">
                    {t.conferences.title}
                </h1>


                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
                    
                    {/* Bloc enseignement */}
                    <div className="flex flex-col border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#252525] p-6 rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 space-y-6 animate-defil">
                        <h1 className="dark:text-white text-2xl font-bold border-b border-gray-300 dark:border-gray-600 pb-3">
                            2026
                        </h1>

                        <div>
                            <h2 className="dark:text-white font-semibold text-lg">
                                {t.conferences.conf4Title}
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                                {t.conferences.conf4Desc}
                            </p>
                            <a target="__blank" href={`${process.env.PUBLIC_URL}/docs/jncf_flash_talk.pdf`} className="inline-flex items-center mt-3 dark:bg-[#141414] border border-red-500 px-3 py-2 rounded-lg shadow-md transition duration-200 text-red-500 hover:bg-red-500 hover:text-white dark:hover:text-white dark:hover:bg-red-500">
                                <FaFilePdf className="w-5 h-5" /> <span className="text-sm ml-2">Slides</span>
                            </a>
                        </div>

                        <div>
                            <h2 className="dark:text-white font-semibold text-lg">
                                {t.conferences.conf3Title}
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                                {t.conferences.conf3Desc}
                            </p>
                            <a target="__blank" href={`${process.env.PUBLIC_URL}/docs/sem_dijon.pdf`} className="inline-flex items-center mt-3 dark:bg-[#141414] border border-red-500 px-3 py-2 rounded-lg shadow-md transition duration-200 text-red-500 hover:bg-red-500 hover:text-white dark:hover:text-white dark:hover:bg-red-500">
                                <FaFilePdf className="w-5 h-5" /> <span className="text-sm ml-2">Slides</span>
                            </a>
                        </div>
                    </div>

                    {/* Bloc enseignement */}
                    <div className="flex flex-col border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#252525] p-6 rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 space-y-6 animate-defil">
                        <h1 className="dark:text-white text-2xl font-bold border-b border-gray-300 dark:border-gray-600 pb-3">
                            2025
                        </h1>

                        <div>
                            <h2 className="dark:text-white font-semibold text-lg">
                                {t.conferences.conf2Title}
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                                {t.conferences.conf2Desc}
                            </p>
                            <a target="__blank" href={`${process.env.PUBLIC_URL}/docs/odelix_talk.pdf`} className="inline-flex items-center mt-3 dark:bg-[#141414] border border-red-500 px-3 py-2 rounded-lg shadow-md transition duration-200 text-red-500 hover:bg-red-500 hover:text-white dark:hover:text-white dark:hover:bg-red-500">
                                <FaFilePdf className="w-5 h-5" /> <span className="text-sm ml-2">Slides</span>
                            </a>
                        </div>

                        <div>
                            <h2 className="dark:text-white font-semibold text-lg">
                                {t.conferences.conf1Title}
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                                {t.conferences.conf1Desc}
                            </p>
                            <div className="flex justify-start w-full mt-3 pt-2">
                            <a 
                                target="__blank" 
                                href={`${process.env.PUBLIC_URL}/docs/PrésentationSecondes.pdf`} 
                                className="inline-flex items-center dark:bg-[#141414] border border-red-500 px-3 py-2 rounded-lg shadow-md transition duration-200 text-red-500 hover:bg-red-500 hover:text-white dark:hover:text-white dark:hover:bg-red-500"
                            >
                                <FaFilePdf className="w-5 h-5" /> 
                                <span className="text-sm ml-2">Slides</span>
                            </a>

                            <a 
                                target="__blank" 
                                href={`${process.env.PUBLIC_URL}/docs/ActivitéSecondesArbres.pdf`} 
                                className="inline-flex items-center dark:bg-[#141414] border border-blue-500 px-3 py-2 rounded-lg shadow-md transition duration-200 text-blue-500 hover:bg-blue-500 hover:text-white dark:hover:text-white dark:hover:bg-blue-500 ml-3"
                            >
                                <FaFilePdf className="w-5 h-4" /> 
                                <span className="text-sm ml-2">{t.conferences.conf1Doc1}</span>
                            </a>
                        </div>
                        </div>
                    </div>
                </div>
                
            </div>
        </div>
    );
}
