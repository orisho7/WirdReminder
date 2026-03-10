import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useTranslation } from 'react-i18next';

const swipeConfidenceThreshold = 10000;
const swipePower = (offset: number, velocity: number) =>
  Math.abs(offset) * velocity;

export function ScreenshotsSection() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [[activeIndex, direction], setPage] = useState([0, 0]);

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

  const paginate = useCallback(
    (newDirection: number) => {
      const next = activeIndex + newDirection;
      if (next >= 0 && next < screenshots.length) {
        setPage([next, newDirection]);
      }
    },
    [activeIndex, screenshots.length]
  );

  const goTo = useCallback(
    (index: number) => {
      setPage([index, index > activeIndex ? 1 : -1]);
    },
    [activeIndex]
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setPage(([current]) => {
        const next = (current + 1) % screenshots.length;
        return [next, 1];
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [screenshots.length]);

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -300 : 300,
      opacity: 0,
      scale: 0.9
    })
  };

  const canGoPrev = activeIndex > 0;
  const canGoNext = activeIndex < screenshots.length - 1;

  return (
    <section
      id="screenshots"
      className="py-24 px-6 bg-gradient-to-b from-white to-emerald-50/30 dark:bg-gray-950 dark:bg-none"
    >
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            {t('screenshots.title_pre')}{' '}
            <span className="text-emerald-600 dark:text-emerald-500">
              {t('screenshots.title_highlight1')}
            </span>{' '}
            {t('') || '&'}{' '}
            <span className="text-emerald-600 dark:text-emerald-500">
              {t('screenshots.title_highlight2')}
            </span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto font-medium">
            {t('screenshots.description')}
          </p>
        </motion.div>

        <div className="relative flex items-center justify-center">
          <button
            onClick={() => paginate(isRtl ? 1 : -1)}
            disabled={isRtl ? !canGoNext : !canGoPrev}
            className="absolute start-0 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-white/80 dark:bg-gray-800/80 shadow-lg backdrop-blur-sm text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed -translate-x-2 sm:translate-x-0"
            aria-label="Previous slide"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div className="w-80 overflow-hidden">
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              <motion.div
                key={activeIndex}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: 'spring', stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 },
                  scale: { duration: 0.2 }
                }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={1}
                onDragEnd={(_e, { offset, velocity }) => {
                  const swipe = swipePower(offset.x, velocity.x);
                  if (swipe < -swipeConfidenceThreshold) {
                    paginate(isRtl ? -1 : 1);
                  } else if (swipe > swipeConfidenceThreshold) {
                    paginate(isRtl ? 1 : -1);
                  }
                }}
                className="w-full cursor-grab active:cursor-grabbing"
              >
                <div className="bg-white dark:bg-gray-900 rounded-3xl p-4 shadow-xl">
                  <div className="aspect-[9/16] rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-4">
                    <ImageWithFallback
                      src={screenshots[activeIndex].image}
                      alt={screenshots[activeIndex].title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {screenshots[activeIndex].title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {screenshots[activeIndex].description}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <button
            onClick={() => paginate(isRtl ? -1 : 1)}
            disabled={isRtl ? !canGoPrev : !canGoNext}
            className="absolute end-0 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-white/80 dark:bg-gray-800/80 shadow-lg backdrop-blur-sm text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed translate-x-2 sm:translate-x-0"
            aria-label="Next slide"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 mt-8">
          {screenshots.map((_, index) => (
            <button
              key={index}
              onClick={() => goTo(index)}
              aria-label={`Go to slide ${index + 1}`}
              className={`rounded-full transition-all duration-300 ${
                index === activeIndex
                  ? 'w-8 h-3 bg-emerald-500'
                  : 'w-3 h-3 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
