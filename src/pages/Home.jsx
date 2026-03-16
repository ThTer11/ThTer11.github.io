import Mail from '@heroicons/react/24/outline/EnvelopeIcon';
import GoogleScholar from '../Google_Scholar_logo.svg.png';
import Profile from '../profile.png';
import Eco from '../eco.svg';
import { FaLinkedin, FaGithub } from 'react-icons/fa';
import NavBar from '../components/NavBar';
import { useLang } from '../App';

export default function Home() {
    const { t } = useLang();

    return (
        <div className="min-w-screen min-h-screen bg-gray-50 dark:bg-[#1b1b1b] overflow-hidden">
            <div className="absolute inset-0 flex justify-center items-start pointer-events-none">
            <img 
                src={Eco}
                alt="Background"
                className="max-w-full max-h-full object-contain opacity-20 mt-10"
            />
            </div>

            <NavBar />

            <div className="flex flex-col lg:flex-row justify-center items-start gap-12 pt-24 px-6 lg:px-20">
                
                <div className="flex flex-col items-center text-center bg-white dark:bg-[#252525] border border-gray-200 dark:border-gray-700 p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 lg:max-w-sm w-full animate-defil">
                    <img 
                        src={Profile} 
                        alt="Profile" 
                        className="w-48 h-48 object-cover rounded-full shadow-lg transition-transform duration-500 hover:scale-105"
                    />
                    <h1 className="dark:text-white font-bold text-3xl mt-4">{t.home.name}</h1>
                    <p className="dark:text-gray-400 text-gray-500 mt-1">{t.home.job}</p>
                    <p className="dark:text-gray-400 text-gray-500">{t.home.workplace}</p>

                    <div className="flex justify-center items-center gap-5 mt-5 animate-defil">
                        <a href="mailto:theo.ternier@inria.fr" className="dark:text-white hover:text-black/70 dark:hover:text-white/80 transition">
                            <Mail className="w-7 h-7" />
                        </a>
                        <a href="https://scholar.google.com/citations?user=3i6-KhIAAAAJ&hl=fr" target="_blank" rel="noopener noreferrer" className="transition">
                            <img src={GoogleScholar} alt="GoogleScholar" className="w-7 h-7" />
                        </a>
                        <a href="https://fr.linkedin.com/in/th%C3%A9o-ternier-6bab6726a" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 transition">
                            <FaLinkedin size={28} />
                        </a>
                        <a href="https://github.com/ThTer11" target="_blank" rel="noopener noreferrer" className="dark:text-white hover:text-black/70 dark:hover:text-white/80 transition">
                            <FaGithub size={28} />
                        </a>
                    </div>
                </div>

                <div className="flex flex-col gap-8 w-full max-w-3xl animate-defil">
                    
                    <div className="bg-white dark:bg-[#252525] border border-gray-200 dark:border-gray-700 p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300">
                        <p className="dark:text-white leading-relaxed text-sm lg:text-base text-justify" dangerouslySetInnerHTML={{ __html: t.home.description }}>
                        </p>
                    </div>

                    <div className="bg-white dark:bg-[#252525] border border-gray-200 dark:border-gray-700 p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 mb-12">
                        <h1 className="dark:text-white text-3xl font-bold mb-6 border-b dark:border-gray-700 border-gray-300 pb-2">
                            {t.home.educationTitle}
                        </h1>
                    <div className="space-y-6">
                        {t.home.education.map((edu, index) => (
                        <div key={index}>
                            <h2 className='dark:text-white font-semibold text-sm lg:text-md'>
                                {edu.year} – {edu.title}
                            </h2>
                        <p className='dark:text-gray-400 text-gray-500 italic text-sm lg:text-md'>{edu.school}</p>
                    </div>
                    ))}
                </div>
            </div>


                </div>
            </div>
        </div>
    );
}
