import Image, { ImageProps } from "next/image";
import { cn } from "@/lib/utils";

interface UserAvatarProps extends Omit<
  ImageProps,
  "src" | "alt" | "width" | "height"
> {
  src: string;
  alt: string;
  size?: number;
  className?: string;
}

export function UserAvatar({
  src,
  alt,
  size = 32,
  className,
  ...props
}: UserAvatarProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn("rounded-full object-cover", className)}
      style={{ width: size, height: size }}
      {...props}
    />
  );
}
