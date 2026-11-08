import Image, { type ImageProps } from "next/image";

/** next/image + dukungan SVG placeholder lokal (tanpa optimasi) */
export function ProductImage(props: ImageProps) {
  const src = typeof props.src === "string" ? props.src : "";
  return <Image {...props} alt={props.alt} unoptimized={props.unoptimized ?? src.endsWith(".svg")} />;
}
