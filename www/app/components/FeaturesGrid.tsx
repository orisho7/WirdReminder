import { motion } from 'framer-motion';
import { Bell, BookOpen, Calendar, Lock, Zap, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function FeaturesGrid() {
  const { t } = useTranslation();

  const features = [
    {
      icon: Bell,
      title: t('features.list.reminders.title'),
      description: t('features.list.reminders.desc'),
      color: 'emerald'
    },
    {
      icon: BookOpen,
      title: t('features.list.reader.title'),
      description: t('features.list.reader.desc'),
      color: 'blue'
    },
    {
      icon: Calendar,
      title: t('features.list.tracking.title'),
      description: t('features.list.tracking.desc'),
      color: 'purple'
    },
    {
      icon: Lock,
      title: t('features.list.privacy.title'),
      description: t('features.list.privacy.desc'),
      color: 'pink'
    },
    {
      icon: Zap,
      title: t('features.list.offline.title'),
      description: t('features.list.offline.desc'),
      color: 'amber'
    },
    {
      icon: Globe,
      title: t('features.list.multiplatform.title'),
      description: t('features.list.multiplatform.desc'),
      color: 'teal'
    }
  ];

  const colorClasses = {
    emerald: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400',
    blue: 'bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400',
    purple: 'bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400',
    pink: 'bg-pink-100 dark:bg-pink-950/50 text-pink-600 dark:text-pink-400',
    amber: 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400',
    teal: 'bg-teal-100 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400'
  } as const;

  return (
    <section id="features" className="py-24 px-6 bg-white dark:bg-gray-950">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            {t('features.title_pre')}{' '}
            <span className="text-emerald-600 dark:text-emerald-500">{t('features.title_highlight')}</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto font-medium">
            {t('features.description')}
          </p>
        </motion.div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 text-start">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group"
            >
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-8 hover:shadow-2xl hover:shadow-gray-200/50 dark:hover:shadow-emerald-900/10 transition-all duration-300 h-full hover:-translate-y-1">
                <div className={`w-14 h-14 ${colorClasses[feature.color as keyof typeof colorClasses]} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-7 h-7" />
                </div>
                
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {feature.title}
                </h3>
                
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed font-normal">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}