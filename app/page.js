import { LandingPage } from "@/components/landing-page";
import { getFeaturedLesson } from "@/lib/lessons";

// Rendered per request so the build never queries the database at prerender time.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const featuredLesson = await getFeaturedLesson();
  return <LandingPage featuredLessonId={featuredLesson?.id} />;
}
