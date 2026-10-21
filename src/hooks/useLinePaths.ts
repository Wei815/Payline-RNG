import { useLayoutEffect, useRef, useState, type DependencyList, type RefObject } from 'react';
import type { SVGPathResult } from '../utils/svgPaths';

/**
 * 贏分線 SVG 路徑（以實際格子 DOM 位置計算）
 *
 * 只監聽 window resize 不夠：側欄寬度動畫、面板收合、字型載入、分頁切換都會改變格子位置卻不觸發 resize。
 * 這裡改用 ResizeObserver 監看盤面容器與每一格，並在 CSS transition 結束後再算一次，
 * 以 requestAnimationFrame 合併同一幀內的多次觸發。
 */
export function useLinePaths(
  containerRef: RefObject<HTMLElement | null>,
  compute: () => SVGPathResult[],
  deps: DependencyList,
): SVGPathResult[] {
  const [paths, setPaths] = useState<SVGPathResult[]>([]);
  const computeRef = useRef(compute);
  computeRef.current = compute;

  useLayoutEffect(() => {
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setPaths(computeRef.current()));
    };
    schedule();

    const el = containerRef.current;
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    if (el && observer) {
      observer.observe(el);
      el.querySelectorAll('[id^="cell-"]').forEach(cell => observer.observe(cell));
    }
    el?.addEventListener('transitionend', schedule);
    window.addEventListener('resize', schedule);
    document.fonts?.ready.then(schedule).catch(() => {});

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      el?.removeEventListener('transitionend', schedule);
      window.removeEventListener('resize', schedule);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return paths;
}
