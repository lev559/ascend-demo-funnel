import CaseStudy from "./CaseStudy";

export const metadata = {
  title: "Case study: an adaptive AI-coach funnel · Lev Ryazanov",
  description: "How I built a web2app relaunch funnel for an AI coach: research, positioning, an adaptive AI quiz, conversion mechanics with guardrails, and five experiments.",
  openGraph: { images: [{ url: "/og.png", width: 1200, height: 630 }] },
};

export default function Page() {
  return <CaseStudy v="rist" />;
}
