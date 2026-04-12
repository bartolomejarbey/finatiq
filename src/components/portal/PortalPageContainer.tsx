import * as React from "react";
import { cn } from "@/lib/utils";

type PortalPageContainerProps = React.ComponentProps<"div">;

export function PortalPageContainer({
  children,
  className,
  ...props
}: PortalPageContainerProps) {
  return (
    <div
      className={cn("mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8 lg:px-8", className)}
      {...props}
    >
      {children}
    </div>
  );
}
