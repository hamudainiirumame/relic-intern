import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { cn } from "@/lib/utils";

type ToastItem = { id: number; title: string; description?: string };
type Listener = (items: ToastItem[]) => void;

let items: ToastItem[] = [];
const listeners = new Set<Listener>();
let seq = 0;

/** どこからでも呼べるトースト */
export function toast(title: string, description?: string) {
  items = [...items, { id: ++seq, title, description }].slice(-3);
  listeners.forEach((l) => l(items));
}

function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  listeners.forEach((l) => l(items));
}

export function Toaster() {
  const [list, setList] = React.useState<ToastItem[]>(items);
  React.useEffect(() => {
    listeners.add(setList);
    return () => {
      listeners.delete(setList);
    };
  }, []);
  return (
    <ToastPrimitive.Provider swipeDirection="down" duration={3200}>
      {list.map((t) => (
        <ToastPrimitive.Root
          key={t.id}
          onOpenChange={(open) => !open && dismiss(t.id)}
          className={cn(
            "rounded-lg bg-ink px-4 py-3 text-paper shadow-lg data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-4 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
          )}
        >
          <ToastPrimitive.Title className="text-sm font-medium">{t.title}</ToastPrimitive.Title>
          {t.description && <ToastPrimitive.Description className="mt-0.5 text-xs text-paper/75">{t.description}</ToastPrimitive.Description>}
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport className="fixed inset-x-0 bottom-0 z-[100] mx-auto flex w-full max-w-md flex-col gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] outline-none" />
    </ToastPrimitive.Provider>
  );
}
