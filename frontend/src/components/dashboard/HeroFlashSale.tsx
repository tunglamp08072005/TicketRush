import type { HeroCountdown } from '../../data/dashboardMockData';

interface HeroFlashSaleProps {
  title: string;
  subtitle: string;
  countdownLabel: string;
  countdown: HeroCountdown;
  backgroundImage: string;
}

export default function HeroFlashSale({
  title,
  subtitle,
  countdownLabel,
  countdown,
  backgroundImage,
}: HeroFlashSaleProps) {
  return (
    <section className="relative mb-7 overflow-hidden rounded-3xl border border-gray-800 bg-gray-900">
      <img src={backgroundImage} alt="Concert background" className="h-[330px] w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-transparent" />

      <div className="absolute inset-0 flex items-center px-6 md:px-10">
        <div className="max-w-[460px] rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md">
          <h1 className="text-xl font-extrabold leading-tight text-white md:text-2xl">{title}</h1>
          <p className="mt-3 text-sm text-gray-200">{subtitle}</p>

          <div className="my-4 border-t border-white/20" />

          <p className="text-sm text-white">
            {countdownLabel}{' '}
            <span className="text-base font-bold text-red-400">
              {countdown.hours}:{countdown.minutes}:{countdown.seconds}
            </span>
          </p>

          <button
            type="button"
            className="mt-5 w-full rounded-xl bg-gradient-to-r from-red-500 to-orange-500 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Săn vé ngay!
          </button>
        </div>
      </div>
    </section>
  );
}
