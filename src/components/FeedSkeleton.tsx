import "./VideoGrid.css";

const SKELETON_COUNT = 12;

export function FeedSkeleton() {
  return (
    <div className="videoGrid">
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <div key={index} className="videoSkeleton" />
      ))}
    </div>
  );
}
