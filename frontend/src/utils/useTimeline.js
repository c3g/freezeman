import {useRef, useEffect, useState} from "react";

const OFFSET = 350

export default function useTimeline() {

  const [timelineWidth, setTimelineWidth] = useState(0);
  const timelineMarginLeft = -timelineWidth + OFFSET;
  const timelineRef = useRef(null);

  useEffect(() => {
    if (timelineRef.current)
      setTimelineWidth(timelineRef.current.clientWidth || window.innerWidth - OFFSET)
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
