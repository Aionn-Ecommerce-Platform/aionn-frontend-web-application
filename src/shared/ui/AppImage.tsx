import Image, { type ImageProps } from "next/image";

type AppImageProps = Omit<ImageProps, "width" | "height"> & {
  width?: ImageProps["width"];
  height?: ImageProps["height"];
};

export default function AppImage({
  width = 256,
  height = 256,
  ...props
}: AppImageProps) {
  return <Image width={width} height={height} {...props} />;
}
