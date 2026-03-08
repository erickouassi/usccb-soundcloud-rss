export default function handler(req, res) {
  res.status(200).json({
    name: "usccb-soundcloud-rss",
    description: "A local‑time USCCB Daily Readings feed that returns only today’s episode.",
    version: "1.0.0",
    endpoints: {
      rss: "/api/rss",
      apiRoot: "/api"
    },
    author: "Eric Kouassi"
  });
}
