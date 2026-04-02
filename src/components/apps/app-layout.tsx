import { Search } from "lucide-react";
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

interface AppContentProps extends ComponentPropsWithoutRef<"main"> {
  padded?: boolean;
  scrollable?: boolean;
  stacked?: boolean;
}

interface ScrollAreaProps extends ComponentPropsWithoutRef<"div"> {
  padded?: boolean;
}

interface GridViewProps extends ComponentPropsWithoutRef<"div"> {
  minItemWidth?: number;
  gap?: number | string;
}

interface EmptyStateProps extends Omit<ComponentPropsWithoutRef<"div">, "title"> {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

interface ButtonProps extends ComponentPropsWithoutRef<"button"> {
  variant?: "ghost" | "panel" | "danger";
  size?: "compact" | "regular";
  block?: boolean;
  align?: "center" | "start";
}

interface SearchInputProps extends Omit<ComponentPropsWithoutRef<"input">, "size"> {
  containerClassName?: string;
  icon?: ReactNode;
}

export const AppScaffold = forwardRef<HTMLElement, ComponentPropsWithoutRef<"section">>(
  function AppScaffold({ className, ...props }, ref) {
    return <section ref={ref} className={cn("app-scaffold", className)} {...props} />;
  }
);

export const AppToolbar = forwardRef<HTMLElement, ComponentPropsWithoutRef<"header">>(
  function AppToolbar({ className, ...props }, ref) {
    return <header ref={ref} className={cn("app-toolbar-shell app-toolbar", className)} {...props} />;
  }
);

export const AppSidebar = forwardRef<HTMLElement, ComponentPropsWithoutRef<"aside">>(
  function AppSidebar({ className, ...props }, ref) {
    return <aside ref={ref} className={cn("app-sidebar", className)} {...props} />;
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

export const StatusBar = forwardRef<HTMLElement, ComponentPropsWithoutRef<"footer">>(
  function StatusBar({ className, ...props }, ref) {
    return <footer ref={ref} className={cn("app-footer status-bar", className)} {...props} />;
  }
);

export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(function ScrollArea(
  { className, padded = false, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn("app-scroll-area", padded && "app-scroll-area--padded", className)}
      {...props}
    />
  );
});

export const GridView = forwardRef<HTMLDivElement, GridViewProps>(function GridView(
  { className, gap, minItemWidth, style, ...props },
  ref
) {
  const nextStyle = {
    ...style,
    ...(gap !== undefined ? { ["--grid-gap" as string]: typeof gap === "number" ? `${gap}px` : gap } : {}),
    ...(minItemWidth !== undefined
      ? { ["--grid-item-min" as string]: `${minItemWidth}px` }
      : {}),
  } as CSSProperties;

  return <div ref={ref} className={cn("grid-view", className)} style={nextStyle} {...props} />;
});

export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(function EmptyState(
  { className, title, description, actions, children, ...props },
  ref
) {
  return (
    <div ref={ref} className={cn("empty-state", className)} {...props}>
      {title || description ? (
        <div className="empty-state__copy">
          {title ? <strong>{title}</strong> : null}
          {description ? <p>{description}</p> : null}
        </div>
      ) : null}
      {children}
      {actions ? <div className="empty-state__actions">{actions}</div> : null}
    </div>
  );
});

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "ghost", size = "compact", block = false, align = "center", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        "button",
        `button--${variant}`,
        `button--${size}`,
        block && "button--block",
        align === "start" && "button--start",
        className
      )}
      {...props}
    />
  );
});

export const IconButton = forwardRef<HTMLButtonElement, ButtonProps>(function IconButton(
  { className, variant = "ghost", size = "compact", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn("icon-button", `icon-button--${variant}`, `icon-button--${size}`, className)}
      {...props}
    />
  );
});

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { className, containerClassName, icon, type = "search", ...props },
  ref
) {
  return (
    <label className={cn("search-input", containerClassName)}>
      <span className="search-input__icon" aria-hidden="true">
        {icon ?? <Search size={14} />}
      </span>
      <input ref={ref} type={type} className={cn("search-input__field", className)} {...props} />
    </label>
  );
});
