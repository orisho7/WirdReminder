import { motion } from 'framer-motion';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useTranslation } from 'react-i18next';

export function ScreenshotsSection() {
  const { t } = useTranslation();

  const screenshots = [
    {
      title: t('screenshots.list.list.title'),
      description: t('screenshots.list.list.desc'),
      image: 'assets/screenshots/list.png'
    },
    {
      title: t('screenshots.list.reader.title'),
      description: t('screenshots.list.reader.desc'),
      image: 'assets/screenshots/reader.png'
    },
    {
      title: t('screenshots.list.add.title'),
      description: t('screenshots.list.add.desc'),
      image: 'assets/screenshots/add.png'
    },
    {
      title: t('screenshots.list.calendar.title'),
      description: t('screenshots.list.calendar.desc'),
      image: 'assets/screenshots/calendar.png'
    },
    {
      title: t('screenshots.list.settings.title'),
      description: t('screenshots.list.settings.desc'),
      image: 'assets/screenshots/settings.png'
    }
  ];

  return (
    <section id="screenshots" className="py-24 px-6 bg-gradient-to-b from-white to-emerald-50/30 dark:bg-gray-950 dark:bg-none">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            {t('screenshots.title_pre')}{' '}
            <span className="text-emerald-600 dark:text-emerald-500">{t('screenshots.title_highlight1')}</span>{' '}
            {t('') || '&'}{' '}
            <span className="text-emerald-600 dark:text-emerald-500">{t('screenshots.title_highlight2')}</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto font-medium">
            {t('screenshots.description')}
          </p>
        </motion.div>
        
        <div className="relative overflow-hidden">
          <div className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory scrollbar-hide rtl:dir-rtl ltr:dir-ltr">
            {screenshots.map((screenshot, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex-shrink-0 w-80 snap-center"
              >
                <div className="bg-white dark:bg-gray-900 rounded-3xl p-4 shadow-xl hover:shadow-2xl dark:hover:shadow-emerald-900/10 transition-shadow duration-300">
                  <div className="aspect-[9/16] rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-4">
                    <ImageWithFallback 
                      src={screenshot.image}
                      alt={screenshot.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{screenshot.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{screenshot.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
          
          {/* Gradient Overlays for scroll indication */}
          <div className="absolute right-0 top-0 bottom-8 w-20 bg-gradient-to-l from-emerald-50/30 to-transparent dark:from-gray-950 pointer-events-none" />
          <div className="absolute left-0 top-0 bottom-8 w-20 bg-gradient-to-r from-emerald-50/30 to-transparent dark:from-gray-950 pointer-events-none" />
        </div>
      </div>
    </section>
  );
}
