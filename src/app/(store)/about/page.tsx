import Image from "next/image";
import Link from "next/link";

export const metadata = { title: "About us" };

export default function About() {
  return (
    <div className="mx-auto max-w-3xl px-5 pb-24 pt-10 text-center">
      <Image src="/brand/logo.png" alt="Hungry Bar" width={140} height={140} className="mx-auto" />
      <h1 className="mt-4 text-3xl font-extrabold md:text-5xl">Fresh. Hot. Hand-tossed.</h1>
      <p className="mx-auto mt-4 max-w-xl text-lg text-char-600">Hungry Bar started in 2021 at Hill Food Square, Dehiwala, with one idea: properly good, 100% halal pizza made fresh to order. Since then we&apos;ve added crispy-edged Detroit squares, The Toast Theory&apos;s subs and sandwiches, home-made lasagna and fresh juices and mojitos.</p>
      <p className="mx-auto mt-3 max-w-xl text-char-600">Our dough is made in-house, our sauce is our own recipe, and every pizza can be built exactly the way you like it.</p>
      <Link href="/menu" className="btn-primary mt-8">See the menu</Link>
    </div>
  );
}
