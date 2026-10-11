import { cn } from "@/lib/utils";

export function MeuMark({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <span
      role="img"
      aria-label="MEU logo"
      className={cn("inline-block shrink-0", className)}
      style={{
        width: size,
        height: size,
        backgroundColor: "currentColor",
        mask: "url('/img/meu-symbol.png') center / 125% no-repeat",
        WebkitMask: "url('/img/meu-symbol.png') center / 125% no-repeat",
      }}
    />
  );
}
