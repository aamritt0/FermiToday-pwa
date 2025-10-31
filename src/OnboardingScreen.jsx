import React, { useState } from "react";
import { Calendar, Bell, Bookmark, CheckCircle, ChevronRight, ChevronLeft, X } from "lucide-react";

const slides = [
  {
    icon: Calendar,
    title: "Variazioni in Tempo Reale",
    description: "Visualizza le variazioni dell'orario giornaliero della tua classe e dei tuoi professori, sempre aggiornate.",
    color: "#6366f1",
  },
  {
    icon: Bell,
    title: "Notifiche Push",
    description: "Ricevi notifiche istantanee quando vengono pubblicate nuove variazioni per la tua classe o i tuoi professori.",
    color: "#8b5cf6",
  },
  {
    icon: Bookmark,
    title: "Accesso Rapido",
    description: "Salva le tue classi e professori preferiti per un accesso immediato alle loro variazioni.",
    color: "#ec4899",
  },
  {
    icon: CheckCircle,
    title: "Tutto Pronto!",
    description: "Inizia subito a monitorare le variazioni. Inserisci la tua classe o il nome del professore per cominciare.",
    color: "#10b981",
  },
];

export default function OnboardingScreen({ onComplete, isDark = false }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const goToNext = () => {
    if (isAnimating) return;
    if (currentIndex < slides.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
        setIsAnimating(false);
      }, 300);
    } else {
      onComplete();
    }
  };

  const goToPrev = () => {
    if (isAnimating || currentIndex === 0) return;
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex(currentIndex - 1);
      setIsAnimating(false);
    }, 300);
  };

  const skip = () => {
    onComplete();
  };

  const currentSlide = slides[currentIndex];
  const Icon = currentSlide.icon;
  const isLastSlide = currentIndex === slides.length - 1;

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? "bg-zinc-950 text-white" : "bg-white text-gray-900"}`}>
      {/* Skip Button */}
      {!isLastSlide && (
        <div className="absolute top-8 right-6 z-10">
          <button
            onClick={skip}
            className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 hover:scale-105 ${
              isDark ? "text-gray-400 hover:text-white hover:bg-zinc-800" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            Salta
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-16">
        <div
          className={`transition-all duration-300 ${isAnimating ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"}`}
        >
          {/* Icon Circle */}
          <div
            className="w-44 h-44 rounded-full flex items-center justify-center mb-12 mx-auto"
            style={{ backgroundColor: currentSlide.color + "20" }}
          >
            <Icon size={96} style={{ color: currentSlide.color }} strokeWidth={1.5} />
          </div>

          {/* Title */}
          <h1 className="text-4xl font-extrabold text-center mb-6 tracking-tight">
            {currentSlide.title}
          </h1>

          {/* Description */}
          <p
            className={`text-lg text-center leading-relaxed px-4 ${
              isDark ? "text-gray-400" : "text-gray-600"
            }`}
          >
            {currentSlide.description}
          </p>
        </div>
      </div>

      {/* Pagination Dots */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {slides.map((_, index) => (
          <div
            key={index}
            className={`h-2.5 rounded-full transition-all duration-300 ${
              currentIndex === index ? "w-8" : "w-2.5"
            } ${
              currentIndex === index
                ? ""
                : isDark
                ? "bg-zinc-700"
                : "bg-gray-300"
            }`}
            style={{
              backgroundColor: currentIndex === index ? currentSlide.color : undefined,
            }}
          />
        ))}
      </div>

      {/* Navigation Buttons */}
      <div className="px-6 pb-8 flex gap-3">
        {currentIndex > 0 && (
          <button
            onClick={goToPrev}
            disabled={isAnimating}
            className={`flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg ${
              isDark ? "bg-zinc-800 text-white hover:bg-zinc-700" : "bg-gray-100 text-gray-900 hover:bg-gray-200"
            }`}
          >
            <ChevronLeft size={24} />
          </button>
        )}

        <button
          onClick={goToNext}
          disabled={isAnimating}
          className="flex-1 flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-white transition-all duration-200 hover:scale-105 active:scale-95 shadow-xl"
          style={{ backgroundColor: currentSlide.color }}
        >
          <span className="text-lg">{isLastSlide ? "Inizia" : "Avanti"}</span>
          {isLastSlide ? <CheckCircle size={24} /> : <ChevronRight size={24} />}
        </button>
      </div>

      <style jsx>{`
        @keyframes fade-slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}