import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trigger } from "@/lib/haptics";
import { SparklesLine, FileLine, ChatLine } from "@mingcute/react";

const STORAGE_KEY = "settleup_welcome_seen";

const slides = [
  {
    icon: SparklesLine,
    title: "Welcome to SettleUp",
    subtitle: "Automated invoice follow-up, so you don't have to chase.",
  },
  {
    icon: FileLine,
    title: "Add your invoices",
    subtitle: "Create an invoice for any client and set a due date.",
  },
  {
    icon: ChatLine,
    title: "We handle the reminders",
    subtitle:
      "SettleUp sends automatic WhatsApp and email reminders so you get paid without the awkward follow-ups.",
  },
];

export function WelcomeModal() {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      // Slight delay so it doesn't pop instantly with the page transition
      const t = setTimeout(() => setOpen(true), 350);
      return () => clearTimeout(t);
    }
  }, []);

  const markSeen = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  };

  const handleClose = (next: boolean) => {
    if (!next) {
      markSeen();
    }
    setOpen(next);
  };

  const isLast = index === slides.length - 1;
  const slide = slides[index];
  const Icon = slide.icon;

  const handleNext = () => {
    trigger("light");
    if (isLast) {
      markSeen();
      setOpen(false);
      navigate("/app/add");
      return;
    }
    setIndex((i) => i + 1);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-card border-border rounded-md p-0 overflow-hidden">
        <div className="p-6 pt-8 text-center space-y-5">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="h-7 w-7 text-primary" />
          </div>

          <div className="space-y-2">
            <DialogTitle className="type-h2 text-foreground">{slide.title}</DialogTitle>
            <DialogDescription className="type-body-small text-muted-foreground px-2">
              {slide.subtitle}
            </DialogDescription>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 pt-2">
            {slides.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30",
                )}
              />
            ))}
          </div>

          <div className="pt-2">
            <Button onClick={handleNext} className="w-full" size="lg">
              {isLast ? "Add your first invoice" : "Next"}
            </Button>
            {!isLast && (
              <button
                type="button"
                onClick={() => {
                  markSeen();
                  setOpen(false);
                }}
                className="mt-3 type-metadata text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
