import { LandingPage } from "@/components/landing-page";
import { getFeaturedLesson } from "@/lib/lessons";

export default async function HomePage() {
  const featuredLesson = await getFeaturedLesson();
  return <LandingPage featuredLessonId={featuredLesson?.id} />;
}
