import {useRef, useEffect, useState} from "react";

export default function useTimeline() {

  const [timelineWidth, setTimelineWidth] = useState(0);
  const timelineMarginLeft = -timelineWidth + 350;
  const timelineRef = useRef(null);

  useEffect(() => {
    if (timelineRef.current)
      setTimelineWidth(timelineRef.current.clientWidth)
  });
  useEffect(() => {
    const resizeListener = () => {
      setTimelineWidth(timelineRef.current.clientWidth)
    };
    window.addEventListener('resize', resizeListener);
    return () => window.removeEventListener('resize', resizeListener);
  }, []);

  return [timelineMarginLeft, timelineRef];
}
