import type { VideoCardData } from "../bilibili/feed";
import { VideoCard } from "./VideoCard";
import "./VideoGrid.css";

interface VideoGridProps {
  items: VideoCardData[];
  ref?: React.Ref<HTMLDivElement>;
}

export function VideoGrid({ items, ref }: VideoGridProps) {
  return (
    <div ref={ref} className="videoGrid">
      {items.map((video) => (
        <VideoCard key={video.bvid} video={video} />
      ))}
    </div>
  );
}
