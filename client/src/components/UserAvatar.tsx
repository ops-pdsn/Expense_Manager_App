import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getUserInitials, getUserAvatarColor } from "@/lib/userUtils";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  user: any; // Can be Supabase auth user or our User type
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base", 
  xl: "h-12 w-12 text-lg",
};

export function UserAvatar({ user, size = "lg", className }: UserAvatarProps) {
  const initials = getUserInitials(user);
  const colorClass = getUserAvatarColor(initials);
  
  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarFallback 
        className={`bg-gradient-to-r ${colorClass} text-white font-semibold border-0`}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}