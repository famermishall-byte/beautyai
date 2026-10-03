// Иллюстрации плиток категорий в каталоге: один набор в цветах логотипа (малиновый + белый).
// Общие правила — DESIGN.md, раздел «Category art»: один круг-фон, одна тень, свет слева сверху,
// два материала (малиновый глянец и белый «фарфор»).

// Цвета — токены из globals.css и их промежуточные оттенки для объёма.
const ACCENT = "#c8135f"; // --accent
const ACCENT_STRONG = "#970e49"; // --accent-strong
const ACCENT_SOFT = "#f8dbe9"; // --accent-soft
const BACKGROUND = "#fbe3ec"; // --background
const HIGHLIGHT = "#e5548d"; // светлая сторона малинового
const EDGE = "#f0b9d0"; // контур белых предметов
const ROSE = "#e99bbb"; // тёмная сторона розового

const berry = "url(#ca-berry)";
const berryV = "url(#ca-berry-v)";
const pearl = "url(#ca-pearl)";
const rose = "url(#ca-rose)";
const glass = "url(#ca-glass)";
const outline = { stroke: EDGE, strokeWidth: 0.8 };

function Disc() {
  return <circle cx="60" cy="60" r="46" fill="url(#ca-disc)" />;
}

function Shadow({ cx = 60, rx = 34 }: { cx?: number; rx?: number }) {
  return <ellipse cx={cx} cy="100" rx={rx} ry="6" fill={ACCENT_STRONG} opacity="0.22" filter="url(#ca-soft)" />;
}

/** Ключи — `CategoryGroup.key` (см. src/lib/categories.ts) и `new` для плитки «Новинки». */
const ART: Record<string, React.ReactNode> = {
  // Уход за лицом: баночка крема и капля
  Smile: (
    <>
      <Disc />
      <Shadow cx={62} />
      <rect x="29" y="58" width="62" height="38" rx="13" fill={pearl} {...outline} />
      <rect x="29" y="74" width="62" height="10" fill={ACCENT} opacity="0.12" />
      <rect x="25" y="43" width="70" height="20" rx="9" fill={berry} />
      <rect x="31" y="46" width="40" height="4" rx="2" fill="#fff" opacity="0.45" />
      <path d="M36 66q-3 12 0 22" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.9" />
      <path d="M92 26c5 7 8 11 8 15a8 8 0 0 1-16 0c0-4 3-8 8-15z" fill={berry} />
      <ellipse cx="89.5" cy="40" rx="1.8" ry="3" fill="#fff" opacity="0.6" />
    </>
  ),
  // Уход за телом: тюбик крема и бомбочка для ванны
  PersonStanding: (
    <>
      <Disc />
      <Shadow />
      <path d="M38 84 45 30h20l7 54z" fill={pearl} {...outline} />
      <path d="M40.1 68 42.2 52h25.600L69.900 68z" fill={berry} />
      <rect x="43" y="25" width="24" height="7" rx="2.5" fill={rose} />
      <path d="M47 36 44 78" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
      <rect x="43" y="84" width="24" height="14" rx="3.5" fill={berryV} />
      <circle cx="88" cy="86" r="12" fill={berry} />
      <ellipse cx="84" cy="81" rx="4" ry="2.500" fill="#fff" opacity="0.5" />
    </>
  ),
  // Волосы: флакон с дозатором и пена
  Scissors: (
    <>
      <Disc />
      <Shadow />
      <rect x="36" y="48" width="38" height="50" rx="12" fill={pearl} {...outline} />
      <rect x="36" y="64" width="38" height="20" fill={berry} />
      <rect x="36" y="64" width="38" height="5" fill="#fff" opacity="0.22" />
      <path d="M41 54v38" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
      <rect x="50" y="36" width="10" height="14" rx="2" fill={berryV} />
      <path d="M46 28h26a4 4 0 0 1 4 4v2h-8v-1H46a2.500 2.500 0 0 1 0-5z" fill={berry} />
      <circle cx="88" cy="86" r="11" fill={pearl} {...outline} />
      <circle cx="97" cy="72" r="6.5" fill={pearl} {...outline} />
      <circle cx="84" cy="68" r="4" fill={rose} />
      <ellipse cx="84" cy="82" rx="3.5" ry="2" fill="#fff" />
    </>
  ),
  // Макияж: помада и пудра
  Brush: (
    <>
      <Disc />
      <Shadow />
      <path d="M40 54V36q0-9 18-14v32z" fill={berry} />
      <path d="M44 50V37q0-5 6-8" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.55" />
      <rect x="37" y="52" width="24" height="13" rx="3" fill={pearl} {...outline} />
      <rect x="34" y="63" width="30" height="35" rx="6" fill={berryV} />
      <rect x="38" y="66" width="4" height="28" rx="2" fill="#fff" opacity="0.35" />
      <ellipse cx="85" cy="90" rx="17" ry="9" fill={pearl} {...outline} />
      <ellipse cx="85" cy="87" rx="17" ry="9" fill={pearl} {...outline} />
      <ellipse cx="85" cy="86.5" rx="12" ry="5.8" fill={rose} />
      <ellipse cx="81" cy="85" rx="4" ry="1.6" fill="#fff" opacity="0.6" />
    </>
  ),
  // Парфюм: флакон
  SprayCan: (
    <>
      <Disc />
      <Shadow cx={62} rx={30} />
      <rect x="35" y="50" width="50" height="48" rx="13" fill={glass} stroke={EDGE} strokeWidth="1" />
      <rect x="40" y="64" width="40" height="29" rx="9" fill={berry} />
      <rect x="40" y="64" width="40" height="7" rx="3.5" fill="#fff" opacity="0.25" />
      <path d="M41 58v30" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
      <rect x="52" y="40" width="16" height="12" rx="3" fill={pearl} {...outline} />
      <circle cx="60" cy="30" r="11" fill={berry} />
      <ellipse cx="56" cy="26" rx="4" ry="2.5" fill="#fff" opacity="0.5" />
      <path d="m96 34 2.200 6 6 2.200-6 2.200-2.200 6-2.200-6-6-2.200 6-2.200z" fill="#fff" />
      <path d="m24 70 1.400 3.800 3.800 1.400-3.800 1.400-1.400 3.800-1.400-3.800-3.800-1.400 3.800-1.400z" fill={ACCENT} opacity="0.7" />
    </>
  ),
  // Аптечная косметика: флакон с пипеткой и капсула
  FlaskConical: (
    <>
      <Disc />
      <Shadow />
      <rect x="38" y="56" width="38" height="42" rx="10" fill={berry} />
      <path d="M43 62v30" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
      <rect x="47" y="67" width="24" height="22" rx="4" fill={pearl} />
      <rect x="57" y="71" width="4" height="14" rx="1.5" fill={ACCENT} />
      <rect x="52" y="76" width="14" height="4" rx="1.5" fill={ACCENT} />
      <rect x="46" y="46" width="22" height="11" rx="3" fill={pearl} {...outline} />
      <rect x="50" y="23" width="14" height="25" rx="7" fill={rose} />
      <path d="M54 28v12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
      <path d="M86 85h7v11h-7a5.500 5.500 0 0 1 0-11z" fill={berry} />
      <path d="M93 85h7a5.500 5.500 0 0 1 0 11h-7z" fill={pearl} {...outline} />
    </>
  ),
  // Личная гигиена: шариковый дезодорант и ватные диски
  ShieldCheck: (
    <>
      <Disc />
      <Shadow />
      <rect x="37" y="50" width="32" height="48" rx="11" fill={pearl} {...outline} />
      <rect x="37" y="70" width="32" height="9" fill={ACCENT} opacity="0.14" />
      <path d="M42 60v32" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
      <path d="M37 54V42a16 16 0 0 1 32 0v12z" fill={berry} />
      <path d="M43 44a10 10 0 0 1 8-10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.5" />
      <ellipse cx="89" cy="93" rx="14" ry="5.500" fill={pearl} {...outline} />
      <ellipse cx="89" cy="88" rx="14" ry="5.500" fill={pearl} {...outline} />
      <ellipse cx="89" cy="83" rx="14" ry="5.500" fill={pearl} {...outline} />
      <ellipse cx="89" cy="83" rx="9" ry="3.200" fill="none" stroke={ROSE} strokeWidth="0.8" strokeDasharray="1.5 2" />
    </>
  ),
  // Нижнее бельё: бюстгальтер с бантиком
  Heart: (
    <>
      <Disc />
      <Shadow rx={30} />
      <path d="M38 62 46 30M82 62 74 30" stroke={ACCENT_STRONG} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M28 60q16-9 32 2 16-11 32-2-2 22-16 22-12 0-16-16-4 16-16 16-14 0-16-22z" fill={berry} />
      <path d="M30 61q15-7 30 3 15-10 30-3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="0.5 3.5" fill="none" opacity="0.9" />
      <path d="M36 66q2 10 9 12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.45" />
      <path d="M60 64 52 58v12zM60 64l8-6v12z" fill={pearl} {...outline} />
      <circle cx="60" cy="64" r="2.800" fill={rose} />
    </>
  ),
  // Мыломоющие средства: брусок мыла и пузыри
  Droplets: (
    <>
      <Disc />
      <Shadow cx={56} />
      <ellipse cx="56" cy="92" rx="32" ry="8" fill={rose} />
      <ellipse cx="56" cy="90" rx="32" ry="8" fill={pearl} {...outline} />
      <rect x="29" y="60" width="54" height="28" rx="12" fill={berry} />
      <rect x="39" y="68" width="34" height="12" rx="6" fill="none" stroke="#fff" strokeWidth="1.6" opacity="0.55" />
      <path d="M35 68q0-4 6-4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.6" />
      <circle cx="92" cy="56" r="11" fill={glass} stroke={ROSE} strokeWidth="1" />
      <path d="M86 52a7 7 0 0 1 5-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="100" cy="76" r="6" fill={glass} stroke={ROSE} strokeWidth="1" />
      <circle cx="78" cy="42" r="5" fill={berry} />
      <ellipse cx="76.500" cy="40.500" rx="1.600" ry="1" fill="#fff" opacity="0.6" />
    </>
  ),
  // Для дома: флакон с распылителем
  House: (
    <>
      <Disc />
      <Shadow cx={58} />
      <rect x="38" y="58" width="38" height="40" rx="10" fill={pearl} {...outline} />
      <rect x="38" y="72" width="38" height="14" fill={berry} />
      <rect x="38" y="72" width="38" height="4" fill="#fff" opacity="0.22" />
      <path d="M43 64v28" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
      <rect x="51" y="47" width="12" height="12" rx="2" fill={berryV} />
      <path d="M45 33h26a4 4 0 0 1 4 4v11H45z" fill={berry} />
      <rect x="36" y="35" width="10" height="7" rx="2" fill={ACCENT_STRONG} />
      <path d="M53 48q-1 8-8 10" stroke={ACCENT_STRONG} strokeWidth="3.2" strokeLinecap="round" fill="none" />
      <path d="M49 37h18" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" opacity="0.4" />
      <g fill={ACCENT} opacity="0.65">
        <circle cx="29" cy="33" r="1.700" />
        <circle cx="29" cy="44" r="1.700" />
        <circle cx="25" cy="38.500" r="1.700" />
        <circle cx="20" cy="31" r="1.400" />
        <circle cx="20" cy="46" r="1.400" />
      </g>
      <path d="m92 58 1.800 5 5 1.800-5 1.800-1.800 5-1.800-5-5-1.800 5-1.800z" fill="#fff" />
    </>
  ),
  // Для детей: бутылочка и сердечко
  Baby: (
    <>
      <Disc />
      <Shadow cx={58} rx={30} />
      <rect x="40" y="54" width="34" height="44" rx="11" fill={glass} stroke={EDGE} strokeWidth="1" />
      <rect x="43" y="70" width="28" height="25" rx="8" fill={rose} />
      <path d="M45 60v30" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
      <path d="M64 64h5M66 72h3M64 80h5M66 88h3" stroke={ACCENT} strokeWidth="1.6" strokeLinecap="round" />
      <rect x="38" y="45" width="38" height="11" rx="4.500" fill={berryV} />
      <path d="M46 45q0-9 6-11-1-9 5-9t5 9q6 2 6 11z" fill={rose} stroke={EDGE} strokeWidth="0.8" />
      <path d="M92 94c-10-6.500-12-12-8.500-16 2.700-3 7-2 8.500 1 1.500-3 5.800-4 8.500-1 3.500 4 1.500 9.500-8.500 16z" fill={berry} />
      <ellipse cx="87.500" cy="81" rx="2.200" ry="1.400" fill="#fff" opacity="0.6" />
    </>
  ),
  // Аксессуары: зеркальце и резинка для волос
  Gem: (
    <>
      <Disc />
      <Shadow cx={62} />
      <rect x="46" y="68" width="13" height="30" rx="6.5" fill={berryV} />
      <circle cx="52.500" cy="48" r="24" fill={berry} />
      <circle cx="52.500" cy="48" r="18.500" fill={glass} />
      <path d="M42 50a11 11 0 0 1 9-13" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M58 60l8-8" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" opacity="0.8" />
      <circle cx="88" cy="87" r="9.500" fill="none" stroke={ROSE} strokeWidth="7.500" />
      <circle cx="88" cy="87" r="9.500" fill="none" stroke={ACCENT_SOFT} strokeWidth="5" />
      <path d="M80 82a10 10 0 0 1 6-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" />
    </>
  ),
  // Мерч: сумка-шопер со знаком магазина
  Shirt: (
    <>
      <Disc />
      <Shadow />
      <path d="M46 54V44a14 14 0 0 1 28 0v10" stroke={ACCENT_STRONG} strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M35 52h50l5 44a3 3 0 0 1-3 3.500H33a3 3 0 0 1-3-3.500z" fill={berry} />
      <path d="M40 58 36.500 92" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
      <circle cx="60" cy="76" r="11" fill="none" stroke="#fff" strokeWidth="4" />
      <path d="M57 72.500 61 70v12" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  // Подарки: коробка с бантом
  Gift: (
    <>
      <Disc />
      <Shadow />
      <rect x="33" y="58" width="54" height="40" rx="6" fill={pearl} {...outline} />
      <rect x="55" y="58" width="10" height="40" fill={berryV} />
      <path d="M38 66v26" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
      <rect x="28" y="47" width="64" height="15" rx="5" fill={berry} />
      <rect x="55" y="47" width="10" height="15" fill={rose} />
      <rect x="33" y="50" width="18" height="3.500" rx="1.700" fill="#fff" opacity="0.4" />
      <path d="M60 47c-7-16-25-15-20-4 2.500 5.500 11 5 20 4z" fill={berry} />
      <path d="M60 47c7-16 25-15 20-4-2.500 5.500-11 5-20 4z" fill={berry} />
      <path d="M45 37q4-4 9 0M75 37q-4-4-9 0" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
      <circle cx="60" cy="46" r="4.500" fill={rose} stroke={EDGE} strokeWidth="0.8" />
    </>
  ),
  // Новинки: звезда-блик
  new: (
    <>
      <Disc />
      <Shadow cx={58} rx={26} />
      <path d="M58 24c3 21 12 30 33 33-21 3-30 12-33 33-3-21-12-30-33-33 21-3 30-12 33-33z" fill={berry} />
      <path d="M52 44c-3 6-8 10-14 12" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.5" />
      <path d="m92 26 2.400 6.600 6.600 2.400-6.600 2.400-2.400 6.600-2.400-6.600-6.600-2.400 6.600-2.400z" fill="#fff" />
      <path d="m30 80 2 5.400 5.400 2-5.400 2-2 5.400-2-5.400-5.400-2 5.400-2z" fill={rose} />
      <path d="m92 80 1.600 4.400 4.400 1.600-4.400 1.600-1.600 4.400-1.600-4.400-4.400-1.600 4.400-1.600z" fill={ACCENT} />
    </>
  ),
};

/** Общие градиенты и сами рисунки. Рендерится один раз рядом с плитками. */
export function CategoryArtDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
      <defs>
        <radialGradient id="ca-disc" cx="38%" cy="30%" r="80%">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.55" stopColor={ACCENT_SOFT} />
          <stop offset="1" stopColor="#f1bfd5" />
        </radialGradient>
        <linearGradient id="ca-berry" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={HIGHLIGHT} />
          <stop offset="0.45" stopColor={ACCENT} />
          <stop offset="1" stopColor={ACCENT_STRONG} />
        </linearGradient>
        <linearGradient id="ca-berry-v" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#df4582" />
          <stop offset="0.5" stopColor={ACCENT} />
          <stop offset="1" stopColor="#8f0d45" />
        </linearGradient>
        <linearGradient id="ca-pearl" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.6" stopColor="#fdeef4" />
          <stop offset="1" stopColor="#f0c3d6" />
        </linearGradient>
        <linearGradient id="ca-rose" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={BACKGROUND} />
          <stop offset="1" stopColor={ROSE} />
        </linearGradient>
        <linearGradient id="ca-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#f6cfe0" stopOpacity="0.9" />
        </linearGradient>
        <filter id="ca-soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        {Object.entries(ART).map(([key, art]) => (
          <symbol key={key} id={`ca-${key}`} viewBox="0 0 120 120">
            {art}
          </symbol>
        ))}
      </defs>
    </svg>
  );
}

/** Картинка плитки; декоративная — название категории стоит рядом текстом. */
export function CategoryArt({ name, className }: { name: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden focusable="false">
      <use href={`#ca-${name in ART ? name : "new"}`} />
    </svg>
  );
}
