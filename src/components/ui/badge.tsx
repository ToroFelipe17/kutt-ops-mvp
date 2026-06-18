import * as React from "react";

import { cn } from "@/lib/utils";
import { badgeVariants, type BadgeVariantsProps } from "./badge-variants";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, BadgeVariantsProps {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

// eslint-disable-next-line react-refresh/only-export-components
export { Badge, badgeVariants };
