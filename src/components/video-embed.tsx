import { useRef, useState } from "react";
import ReactPlayer from "react-player";
import { Progress } from "@/components/ui/progress";

interface Props {
  url: string;
  onComplete?: () => void;
  minWatchPercent?: number;
}

export function VideoEmbed({ url, onComplete, minWatchPercent = 80 }: Props) {
  const [pct, setPct] = useState(0);
  const fired = useRef(false);
  return (
    <div className="space-y-2">
      <div className="aspect-video overflow-hidden rounded-lg bg-black">
        <ReactPlayer
          src={url}
          width="100%"
          height="100%"
          controls
          onTimeUpdate={(e) => {
            const v = e.currentTarget as HTMLVideoElement;
            if (!v.duration) return;
            const p = Math.round((v.currentTime / v.duration) * 100);
            setPct(p);
            if (!fired.current && p >= minWatchPercent) {
              fired.current = true;
              onComplete?.();
            }
          }}
          onEnded={() => {
            if (!fired.current) {
              fired.current = true;
              onComplete?.();
            }
          }}
        />
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Progress value={pct} className="h-1.5 flex-1" />
        <span>{pct}%</span>
      </div>
    </div>
  );
}