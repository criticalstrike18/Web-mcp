import * as React from "react";
import manifest from "../artworks/manifest.json";
import { Frame } from "../frame";
import { InfiniteCanvas } from "../infinite-canvas";
import type { MediaItem } from "../infinite-canvas/types";
import { PageLoader } from "../loader";
import { initWebMCP } from "../webmcp";

export function App() {
  const [media] = React.useState<MediaItem[]>(manifest);
  const [textureProgress, setTextureProgress] = React.useState(0);

  React.useEffect(() => {
    if (media.length) {
      initWebMCP(media);
    }
  }, [media]);

  if (!media.length) {
    return <PageLoader progress={0} />;
  }

  return (
    <>
      <Frame />
      <PageLoader progress={textureProgress} />
      <InfiniteCanvas media={media} onTextureProgress={setTextureProgress} />
    </>
  );
}
