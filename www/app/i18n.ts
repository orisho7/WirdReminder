import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const STORE_LINKS = {
  chrome: 'https://chromewebstore.google.com/detail/%D8%A7%D9%84%D9%88%D8%B1%D8%AF-%D8%A7%D9%84%D9%8A%D9%88%D9%85%D9%8A/pgogfohfgohkfpfifdojhmladlaeceok',
  firefox: 'https://addons.mozilla.org/en-US/firefox/addon/%D8%A7%D9%84%D9%88%D8%B1%D8%AF-%D8%A7%D9%84%D9%8A%D9%88%D9%85%D9%8A/'
};

const resources = {
  ar: {
    translation: {
      common: {
        chrome: 'إضافة كروم',
        firefox: 'إضافة فايرفوكس',
        chrome_url: STORE_LINKS.chrome,
        firefox_url: STORE_LINKS.firefox
      },
      nav: {
        features: 'المميزات',
        screenshots: 'لقطات',
        download: 'تحميل',
        brand: 'مذكّر الورد اليومي'
      },
      hero: {
        badge: 'متاح على جميع المنصات • أندرويد • كروم • ويب',
        title_pre: 'رفيقك اليومي مع',
        title_highlight: 'القرآن الكريم',
        description: 'إضافة أنيقة للمتصفح وتطبيق يساعدك على المحافظة على وردك القرآني بتذكيرات ذكية وقارئ مصحف جميل.',
        feature_free: 'مجاني للأبد',
        feature_no_ads: 'بدون إعلانات',
        feature_open_source: 'مفتوح المصدر',
        reminder_title: 'تذكير',
        reminder_text: 'حان وقت الورد'
      },
      features: {
        title_pre: 'كل ما تحتاجه في',
        title_highlight: 'رحلتك الإيمانية',
        description: 'ميزات صممت بعناية لتجعل بناء عادة قراءة القرآن اليومية سهلة وذات مغزى.',
        list: {
          reminders: {
            title: 'تذكيرات ذكية',
            desc: 'تذكيرات لطيفة وقابلة للتخصيص تتكيف مع جدولك وتساعدك على عدم تفويت وردك اليومي.'
          },
          reader: {
            title: 'قارئ بالخط العثماني',
            desc: 'مصحف أنيق بالخط العثماني الأصيل مع وضوح تام لتوفير أفضل تجربة قراءة.'
          },
          tracking: {
            title: 'متابعة الإنجاز',
            desc: 'شاهد رحلتك مع إحصاءات مفصلة، وسلسلة إنجازات، ورؤى محفزة حول عادات القراءة لديك.'
          },
          privacy: {
            title: 'خصوصية تامة',
            desc: 'بياناتك تبقى معك. لا يوجد تتبع، لا إعلانات، ولا مساومة على خصوصيتك.'
          },
          offline: {
            title: 'متاح بدون إنترنت',
            desc: 'اقرأ وتابع تقدمك حتى بدون اتصال بالإنترنت. يتم المزامنة تلقائياً عند الاتصال.'
          },
          multiplatform: {
            title: 'متعدد المنصات',
            desc: 'يعمل بسلاسة على أندرويد، إضافة كروم، والويب. تقدمك متزامن في كل مكان.'
          }
        }
      },
      screenshots: {
        title_pre: 'صُمم ليكون',
        title_highlight1: 'بسيطاً',
        title_highlight2: 'واضحاً',
        description: 'لمحة عن الواجهة النظيفة والبسيطة التي تجعل قراءتك اليومية للقرآن تجربة هادئة.',
        list: {
          list: {
            title: 'قائمة التذكيرات',
            desc: 'واجهة بسيطة لمتابعة كافة أورادك اليومية'
          },
          reader: {
            title: 'قارئ المصحف',
            desc: 'قراءة مريحة بالخط العثماني مع علامات الحزب والجزء'
          },
          add: {
            title: 'إضافة تذكير',
            desc: 'تخصيص كامل لنوع الورد، الوقت، والتكرار'
          },
          calendar: {
            title: 'تقويم الإنجاز',
            desc: 'متابعة بصرية لسلسلة إنجازاتك والتزامك اليومي'
          },
          settings: {
            title: 'الإعدادات',
            desc: 'تحكم كامل في التنبيهات والنسخ الاحتياطي لبياناتك'
          }
        }
      },
      download: {
        badge: 'ابدأ الآن',
        title_pre: 'حمّل مذكّر الورد',
        title_highlight: 'اليوم',
        description: 'متوفر كإضافة للمتصفح وتطبيق للهاتف. ابدأ رحلتك مع القرآن الكريم بتجربة فريدة.',
        platform_title: 'متوفر الآن في المتاجر الرسمية',
        safe_title: 'تقييم عالي',
        safe_desc: 'حمّل الآن من',
        secure_title: 'إصدار آمن وموثوق',
        secure_update: 'تحديثات أسبوعية'
      },
      footer: {
        brand_desc: 'رفيقك اليومي مع القرآن الكريم. ابدأ ببناء عادات مستدامة من خلال تذكيرات لطيفة وتجربة قراءة ممتعة.',
        download_title: 'التحميل',
        android_app: 'تطبيق أندرويد (قريباً)',
        resources_title: 'المصادر',
        source_code: 'المستودع البرمجي',
        community_title: 'المجتمع',
        twitter: 'تويتر (X)',
        contact_us: 'اتصل بنا',
        made_with: 'صُنع بـ ❤️ لخدمة مجتمع المسلمين',
        data_source: 'بيانات Quran.com',
        free_open_source: 'مجاني ومفتوح المصدر'
      }
    }
  },
  en: {
    translation: {
      common: {
        chrome: 'Add to Chrome',
        firefox: 'Add to Firefox',
        chrome_url: STORE_LINKS.chrome,
        firefox_url: STORE_LINKS.firefox
      },
      nav: {
        features: 'Features',
        screenshots: 'Screenshots',
        download: 'Download',
        brand: 'Wird Reminder'
      },
      hero: {
        badge: 'Available on all platforms • Android • Chrome • Web',
        title_pre: 'Your daily companion with the',
        title_highlight: 'Holy Quran',
        description: 'An elegant browser extension and app that helps you maintain your Quranic reading with smart reminders and a beautiful reader.',
        feature_free: 'Free Forever',
        feature_no_ads: 'No Ads',
        feature_open_source: 'Open Source',
        reminder_title: 'Reminder',
        reminder_text: 'Time for your Wird'
      },
      features: {
        title_pre: 'Everything you need in your',
        title_highlight: 'Spiritual Journey',
        description: 'Features thoughtfully designed to make building a daily Quran habit easy and meaningful.',
        list: {
          reminders: {
            title: 'Smart Reminders',
            desc: 'Gentle and customizable reminders that adapt to your schedule and help you never miss your daily Wird.'
          },
          reader: {
            title: 'Ottoman Script Reader',
            desc: 'Elegant Quran in authentic Ottoman script with perfect clarity for the best reading experience.'
          },
          tracking: {
            title: 'Progress Tracking',
            desc: 'See your journey with detailed stats, achievement streaks, and motivational insights into your reading habits.'
          },
          privacy: {
            title: 'Total Privacy',
            desc: 'Your data stays with you. No tracking, no ads, and no compromise on your privacy.'
          },
          offline: {
            title: 'Offline Mode',
            desc: 'Read and track your progress even without an internet connection. Automatically syncs when connected.'
          },
          multiplatform: {
            title: 'Multi-platform',
            desc: 'Works seamlessly on Android, Chrome extension, and Web. Your progress is synced everywhere.'
          }
        }
      },
      screenshots: {
        title_pre: 'Designed to be',
        title_highlight1: 'Simple',
        title_highlight2: 'Clear',
        description: 'A glimpse of the clean and simple interface that makes your daily Quran reading a peaceful experience.',
        list: {
          list: {
            title: 'Reminder List',
            desc: 'Simple interface to track all your daily readings'
          },
          reader: {
            title: 'Quran Reader',
            desc: 'Comfortable reading in Ottoman script with Hizb and Juz markers'
          },
          add: {
            title: 'Add Reminder',
            desc: 'Full customization of Wird type, time, and repetition'
          },
          calendar: {
            title: 'Success Calendar',
            desc: 'Visual tracking of your success streak and daily commitment'
          },
          settings: {
            title: 'Settings',
            desc: 'Full control over notifications and data backup'
          }
        }
      },
      download: {
        badge: 'Start Now',
        title_pre: 'Download Wird Reminder',
        title_highlight: 'Today',
        description: 'Available as a browser extension and mobile app. Start your journey with the Holy Quran with a unique experience.',
        platform_title: 'Now available in official stores',
        safe_title: 'Top Rated',
        safe_desc: 'Download now from',
        secure_title: 'Safe and Reliable',
        secure_update: 'Weekly Updates'
      },
      footer: {
        brand_desc: 'Your daily companion with the Holy Quran. Start building sustainable habits through gentle reminders and a pleasant reading experience.',
        download_title: 'Download',
        android_app: 'Android App (Soon)',
        resources_title: 'Resources',
        source_code: 'Source Code',
        community_title: 'Community',
        twitter: 'Twitter (X)',
        contact_us: 'Contact Us',
        made_with: 'Made with ❤️ to serve the Muslim community',
        data_source: 'Quran.com data',
        free_open_source: 'Free and Open Source'
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ar',
    interpolation: {
      escapeValue: false
    }
  });

// Handle direction
const updateDocAttributes = (lng: string) => {
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
};

i18n.on('languageChanged', updateDocAttributes);

// Set initial direction
updateDocAttributes(i18n.language);

export default i18n;
