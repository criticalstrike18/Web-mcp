import * as React from "react";
import styles from "./style.module.css";

export function PageLoader({ progress }: { progress: number }) {
  const [show, setShow] = React.useState(true);
  const [minTimeElapsed, setMinTimeElapsed] = React.useState(false);
  const visualRef = React.useRef(0);
  const [visualProgress, setVisualProgress] = React.useState(0);

  React.useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), 1200);
    // Hard safety timeout: loader will always dismiss after 2.8s maximum,
    // guaranteeing no white screen freeze on slow networks or stalled asset loads
    const safetyTimer = setTimeout(() => {
      setShow(false);
    }, 2800);

    return () => {
      clearTimeout(timer);
      clearTimeout(safetyTimer);
    };
  }, []);

  React.useEffect(() => {
    let raf: number;

    const animate = () => {
      const diff = progress - visualRef.current;

      if (diff > 0.1) {
        // Lerp toward target, faster when further behind
        visualRef.current += diff * 0.08;
        setVisualProgress(visualRef.current);
        raf = requestAnimationFrame(animate);
      } else {
        // Snap when close enough
        visualRef.current = progress;
        setVisualProgress(progress);
      }
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [progress]);

  const isComplete = (minTimeElapsed && (progress >= 95 || visualProgress >= 95)) || progress === 100;

  React.useEffect(() => {
    if (minTimeElapsed && (progress >= 95 || visualProgress >= 95)) {
      const t = setTimeout(() => setShow(false), 300);
      return () => clearTimeout(t);
    }
  }, [minTimeElapsed, progress, visualProgress]);

  if (!show) {
    return null;
  }

  const isHidden = isComplete && minTimeElapsed;

  return (
    <div className={`${styles.overlay} ${isHidden ? styles.hidden : styles.visible}`}>
      <div className={styles.progressBarContainer}>
        <div className={styles.progressBarFill} style={{ transform: `scaleX(${visualProgress / 100})` }} />
      </div>
    </div>
  );
}
