export const metadata = { title: "Privacy policy" };

export default function Privacy() {
  return (
    <article className="mx-auto max-w-3xl px-5 pb-24 pt-8 [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-extrabold [&_p]:mt-2 [&_p]:text-char-600">
      <h1 className="text-3xl font-extrabold">Privacy policy</h1>
      <p>Hungry Bar collects only what we need to make and deliver your food and run Hungry Rewards.</p>
      <h2>What we collect</h2>
      <p>Your name, mobile number, email (optional), delivery addresses, optional birthday and anniversary, your order history and points, and, if you allow it, your device location for a delivery and a notification token for order updates.</p>
      <h2>How we use it</h2>
      <p>To take and deliver orders, contact you about them, credit and track points, and send birthday bonuses. We don&apos;t sell your data.</p>
      <h2>Who we share it with</h2>
      <p>Our SMS provider (to send login codes), PayHere (for card payments) and our hosting providers, only as needed to provide the service.</p>
      <h2>Your choices</h2>
      <p>You can update your profile and remove saved addresses in My account, turn off notifications in your browser, or ask us to delete your account by calling us.</p>
    </article>
  );
}
