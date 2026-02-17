import { motion } from 'framer-motion';
import { Smartphone, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { useTranslation } from 'react-i18next';

export function DownloadSection() {
  const { t } = useTranslation();

  return (
    <section id="download" className="py-24 px-6 bg-white dark:bg-gray-950">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100/50 dark:bg-emerald-900/30 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">{t('download.badge')}</span>
          </div>
          
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            {t('download.title_pre')} <span className="text-emerald-600 dark:text-emerald-500">{t('download.title_highlight')}</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto font-medium">
            {t('download.description')}
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="relative"
        >
          {/* Browser Window Frame Container */}
          <div className="relative mx-auto max-w-4xl" dir="ltr">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl blur-3xl opacity-10"></div>
            
            <div className="relative bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
              {/* Browser Header */}
              <div className="bg-gray-50/80 dark:bg-gray-800/50 backdrop-blur-md px-4 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-6">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400/80 shadow-sm shadow-red-500/10"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400/80 shadow-sm shadow-yellow-500/10"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400/80 shadow-sm shadow-green-500/10"></div>
                </div>
                <div className="flex-1 max-md bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-1.5 flex items-center gap-3">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <span className="text-[11px] text-gray-400 font-mono tracking-wider overflow-hidden text-ellipsis whitespace-nowrap">chrome-extension://pgogfohfgohkfpfifdojhmladlaeceok/install.html</span>
                </div>
              </div>
              
              {/* Browser Content */}
              <div className="relative bg-gradient-to-b from-emerald-50/20 to-white dark:from-emerald-950/10 dark:to-gray-950 px-6 py-16 flex flex-col items-center justify-center min-h-[400px] rtl:dir-rtl ltr:dir-ltr">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-10 text-center">{t('download.platform_title')}</h3>
                
                <div className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl justify-center items-stretch">
                  <a href={t('common.chrome_url')} target="_blank" className="flex-1">
                    <Button variant="outline" className="border-2 border-gray-200 dark:border-gray-800 hover:border-red-500 dark:hover:border-red-900 rounded-2xl px-8 py-10 text-xl font-bold hover:bg-red-50 dark:hover:bg-red-950/30 transition-all dark:text-white w-full flex flex-col items-center gap-4 h-full shadow-lg hover:shadow-red-500/20">
                      <img 
                        src="https://upload.wikimedia.org/wikipedia/commons/e/e1/Google_Chrome_icon_%28February_2022%29.svg" 
                        alt="Chrome" 
                        className="w-10 h-10"
                      />
                      <div className="text-center">
                        <div className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">{t('download.safe_desc')}</div>
                        <div className="text-gray-900 dark:text-white">{t('common.chrome')}</div>
                      </div>
                    </Button>
                  </a>
                  
                  <a href={t('common.firefox_url')} target="_blank" className="flex-1">
                    <Button variant="outline" className="border-2 border-gray-200 dark:border-gray-800 hover:border-orange-500 dark:hover:border-orange-900 rounded-2xl px-8 py-10 text-xl font-bold hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-all dark:text-white w-full flex flex-col items-center gap-4 h-full shadow-lg hover:shadow-orange-500/20">
                      <img 
                        src="https://upload.wikimedia.org/wikipedia/commons/a/a0/Firefox_logo%2C_2019.svg" 
                        alt="Firefox" 
                        className="w-10 h-10"
                      />
                      <div className="text-center">
                        <div className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">{t('download.safe_desc')}</div>
                        <div className="text-gray-900 dark:text-white">{t('common.firefox')}</div>
                      </div>
                    </Button>
                  </a>
                </div>
                
                <div className="mt-16 flex flex-wrap justify-center gap-12 opacity-60">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-bold">5.0 ★ {t('download.safe_title')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-bold">{t('hero.feature_free')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
