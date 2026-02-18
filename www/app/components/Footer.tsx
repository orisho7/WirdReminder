import { motion } from 'framer-motion';
import { BookOpen, Github, Heart, Mail, Twitter, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-gray-900 dark:bg-gray-950 text-white py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12 rtl:text-right ltr:text-left">
          {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-4 ltr:justify-start rtl:justify-start">
                <img src="assets/icons/icon48.png" alt="Wird Logo" className="w-10 h-10 rounded-xl" />
                <span className="text-xl font-bold">{t('nav.brand')}</span>
              </div>
              <p className="text-gray-400 leading-relaxed font-medium">
                {t('footer.brand_desc')}
              </p>
            </div>

            {/* Download Links */}
            <div>
              <h4 className="font-bold mb-6 text-lg">{t('footer.download_title')}</h4>
              <ul className="space-y-4">
                <li>
                  <a href={t('common.chrome_url')} target="_blank" className="text-gray-400 hover:text-emerald-400 transition-colors flex items-center gap-2 font-medium">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    {t('common.chrome')}
                  </a>
                </li>
                <li>
                  <a href={t('common.firefox_url')} target="_blank" className="text-gray-400 hover:text-emerald-400 transition-colors flex items-center gap-2 font-medium">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    {t('common.firefox')}
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-emerald-400 transition-colors flex items-center gap-2 font-medium">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    {t('footer.android_app')}
                  </a>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-bold mb-6 text-lg">{t('footer.resources_title')}</h4>
              <ul className="space-y-4">
                <li>
                  <a href="https://github.com/hadealahmad/WirdReminder" target="_blank" className="text-gray-400 hover:text-emerald-400 transition-colors flex items-center gap-2 font-medium">
                    <Github className="w-5 h-5" />
                    {t('footer.source_code')}
                  </a>
                </li>
                <li>
                  <a href="https://quran.com" target="_blank" className="text-gray-400 hover:text-emerald-400 transition-colors flex items-center gap-2 font-medium">
                    <Globe className="w-5 h-5" />
                    Quran.com
                  </a>
                </li>
              </ul>
            </div>

            {/* Community */}
            <div>
              <h4 className="font-bold mb-6 text-lg">{t('footer.community_title')}</h4>
              <ul className="space-y-4">
                <li>
                  <a href="#" className="text-gray-400 hover:text-emerald-400 transition-colors flex items-center gap-2 font-medium">
                    <Twitter className="w-5 h-5" />
                    {t('footer.twitter')}
                  </a>
                </li>
                <li>
                  <a href="mailto:contact@wirdreminder.com" className="text-gray-400 hover:text-emerald-400 transition-colors flex items-center gap-2 font-medium">
                    <Mail className="w-5 h-5" />
                    {t('footer.contact_us')}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
                {t('footer.made_with')} | <a href="https://quran.com" target="_blank" className="hover:text-emerald-400">{t('footer.data_source')}</a>
              </div>
            
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm font-bold">
                {t('footer.free_open_source')}
              </div>
              <p className="text-gray-400 text-sm font-medium">© {new Date().getFullYear()} {t('nav.brand')}</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
