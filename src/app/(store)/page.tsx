import { HeroCarousel } from "@/components/store/Hero";
import { AppBand, ExploreMenu, Favourites, Rail, RewardsBand } from "@/components/store/HomeSections";
import { db } from "@/lib/db";

export default async function Home() {
  const banners = await db.banner.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  return (
    <div className="doodles pb-6">
      <HeroCarousel banners={banners.map((b) => ({ id: b.id, title: b.title, subtitle: b.subtitle, image: b.imageId ? `/media/${b.imageId}` : null, link: b.link, cta: b.cta, theme: b.theme }))} />
      <ExploreMenu />
      <Rail title="Hungry Deals" kind="COMBO" href="/menu?c=deals" />
      <Favourites />
      <Rail title="Our Bestsellers" kind="BEST" href="/menu" />
      <RewardsBand />
      <AppBand />
    </div>
  );
}
