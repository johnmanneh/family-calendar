import { useEffect, useState } from "react";

// true below 768px wide — switches the dashboard to the phone layout
const QUERY = "(max-width: 767px)";

export default function useIsPhone() {
  const [isPhone, setIsPhone] = useState(
    typeof window !== "undefined" && window.matchMedia(QUERY).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = e => setIsPhone(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isPhone;
}
