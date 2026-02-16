import React from 'react';
import { Box, Typography } from '@mui/material';
import { useLanguage } from '../../contexts/LanguageContext';

const FoodieAbout = () => {
  const { language, isRTL } = useLanguage();

  const COLORS = {
    sectionTitle: '#774931',
    description: '#765944',
  };

  const englishContent = {
    sections: [
      {
        title: 'Our Story',
        text: `Being away isn't just about distance, it's about missing the rhythm, the traditions, and the small details that once felt like home.
Among these, food has a special power. A single dish, with flavors unlike what you're used to, can make you feel even further from home.

Back home, every occasion had its own dish, and every dish carried memories, people, and meaning.

That absence is where El Tekeya began, to bring back the taste, the warmth, and the feeling of gathering.

Because even far from home, when the feeling remains, you're never truly away.`
      },
      {
        title: 'Who We Are',
        text: `El Tekeya is a platform celebrating authentic home-cooked food and the passionate cooks behind it. We don't just look for skill — we seek quality. Every great dish tells the story of a talented cook who deserves recognition.`
      },
      {
        title: 'Our Cooks: Thoughtful Selection and Genuine Support',
        text: `We carefully select home cooks, welcoming anyone with talent and passion. Every cook is guided through a fair, transparent process designed to highlight their best work.`
      },
      {
        title: 'How We Work',
        text: `We review each cook's skills and the quality of their dishes
We assess hygiene, food safety, and commitment
We help serious cooks improve how they present their dishes and their overall experience
We give outstanding cooks the chance to reach an audience that values their work
We are not a platform that excludes — we are a platform for discovery and growth.`
      },
      {
        title: 'Why Join El Tekeya as a Cook?',
        text: `Turn your passion for cooking into real income
Gain exposure to customers who value quality
Receive support in building your reputation and reviews
Get guidance to grow and improve
Join a fair platform that rewards talent and commitment`
      },
      {
        title: 'Our Mission',
        text: `To create a safe, fair environment that connects talented cooks with customers who love authentic home-cooked food, while continuously supporting and encouraging cooks to excel and grow.`
      },
      {
        title: 'Our Vision',
        text: `To be the home for every talented cook, and the trusted destination for anyone seeking an exceptional home-cooked experience.`
      }
    ]
  };

  const arabicContent = {
    sections: [
      {
        title: 'حكايتنا',
        text: `الغربة مش بس مسافة، الغربة هي فقدان الإيقاع، العادات، والتفاصيل الصغيرة اللي كانت بتحسسك بالبيت.
من اهم التفاصيل دي.. الأكل، أكلة واحدة، طعمها مختلف عن اللي اتعودت عليه كفاية تزود احساسك بالغربة. في مصر، كل مناسبة ليها اكلة، وكل اكلة ليها ذكريات، اشخاص، ومعاني. ومن هنا بدأت التكية، عشان نرجع الطعم، الدفئ، وإحساس لمة العيلة.`
      },
      {
        title: 'من نحن',
        text: `التكية، منصة بتحتفي بالأكل البيتي الحقيقي وبالطهاة اللي بيطبخوا بشغف وحب. نحن لا نبحث عن القدرة، بل عن الجودة، ونؤمن أن كل طبق مميز وراءه طاهٍ موهوب يستحق أن يُرى ويُقدَّر.`
      },
      {
        title: 'طهاتنا… اختيار ذكي ودعم حقيقي',
        text: `في التكية، نولي اهتمامًا خاصًا لاختيار الطهاة المنزليين. نحن نرحّب بكل طاهٍ يمتلك الموهبة والشغف، ونرافقه خلال عملية انضمام عادلة وواضحة تهدف إلى إبراز أفضل ما لديه.`
      },
      {
        title: 'كيف نعمل؟',
        text: `نراجع مهارة الطاهي وجودة أطباقه
نقيّم الالتزام والنظافة وسلامة الطعام
نساعد الطهاة الجادين على تحسين عرض أطباقهم وتجربتهم
نمنح الفرصة للمتميزين ليصلوا إلى جمهور يقدّر عملهم
لسنا منصة إقصاء، بل منصة اكتشاف وصقل للمواهب.`
      },
      {
        title: 'لماذا تنضم إلى التكية كطاهٍ؟',
        text: `فرصة لتحويل شغفك بالطبخ إلى دخل حقيقي
الظهور أمام عملاء يبحثون عن الجودة
دعم في بناء سمعتك وتقييماتك
إرشادات تساعدك على التطور والتحسّن
منصة عادلة تقدّر الموهبة والالتزام`
      },
      {
        title: 'رسالتنا',
        text: `خلق بيئة آمنة وعادلة تجمع بين طهاة موهوبين وعملاء يقدّرون الأكل البيتي الحقيقي، مع دعم مستمر للطهاة وتشجيعهم على التميّز والنمو.`
      },
      {
        title: 'رؤيتنا',
        text: `أن نكون البيت الأول لكل طاهٍ موهوب، والوجهة الموثوقة لكل من يبحث عن تجربة أكل بيتية استثنائية.`
      }
    ]
  };

  const content = language === 'ar' ? arabicContent : englishContent;
  const backgroundImage = language === 'ar' 
    ? '/assets/images/A%20About.png' 
    : '/assets/images/E%20About.png';

  return (
    <Box 
      sx={{ 
        direction: isRTL ? 'rtl' : 'ltr',
        width: '100%',
        position: 'relative',
        minHeight: '100vh',
      }}
    >
      {/* Background Image - Natural aspect ratio */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'top center',
          backgroundRepeat: 'no-repeat',
          zIndex: 0,
        }}
      />

      {/* Text Content Overlay */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          paddingLeft: '52px',
          paddingRight: '52px',
          paddingTop: '30%',
          paddingBottom: '24px',
        }}
      >
        {content.sections.map((section, index) => (
          <Box key={index} sx={{ mb: 4 }}>
            {/* Section Title */}
            <Typography
              sx={{
                fontSize: language === 'ar' ? '36px' : '32px',
                fontWeight: 700,
                color: COLORS.sectionTitle,
                mb: 2,
                textAlign: isRTL ? 'right' : 'left',
                fontFamily: 'Inter',
                lineHeight: 1.4,
              }}
            >
              {section.title}
            </Typography>

            {/* Section Description */}
            <Typography
              sx={{
                fontSize: language === 'ar' ? '28px' : '26px',
                fontWeight: 400,
                color: COLORS.description,
                textAlign: isRTL ? 'right' : 'left',
                fontFamily: 'Inter',
                lineHeight: 1.8,
                whiteSpace: 'pre-line',
              }}
            >
              {section.text}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default FoodieAbout;
