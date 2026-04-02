import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

interface AppContentProps extends ComponentPropsWithoutRef<"main"> {
  padded?: boolean;
  scrollable?: boolean;
  stacked?: boolean;
}

export const AppScaffold = forwardRef<HTMLElement, ComponentPropsWithoutRef<"section">>(
  function AppScaffold({ className, ...props }, ref) {
    return <section ref={ref} className={cn("app-scaffold", className)} {...props} />;
  }
);

export const AppToolbar = forwardRef<HTMLElement, ComponentPropsWithoutRef<"header">>(
  function AppToolbar({ className, ...props }, ref) {
    return <header ref={ref} className={cn("app-toolbar-shell", className)} {...props} />;
  }
);

export const AppContent = forwardRef<HTMLElement, AppContentProps>(function AppContent(
  { className, padded = false, scrollable = true, stacked = true, ...props },
  ref
) {
  return (
    <main
      ref={ref}
      className={cn(
        "app-content",
        padded && "app-content--padded",
        scrollable && "app-content--scrollable",
        stacked && "app-content--stack",
        className
      )}
      {...props}
    />
  );
});

export const AppFooter = forwardRef<HTMLElement, ComponentPropsWithoutRef<"footer">>(
  function AppFooter({ className, ...props }, ref) {
    return <footer ref={ref} className={cn("app-footer", className)} {...props} />;
  }
);

export const ScrollArea = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<"div">>(
  function ScrollArea({ className, ...props }, ref) {
    return <div ref={ref} className={cn("app-scroll-area", className)} {...props} />;
  }
);
