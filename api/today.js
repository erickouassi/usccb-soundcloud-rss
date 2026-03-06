import Parser from "rss-parser";

export default async function handler(req, res) {
  try {
    // 1. FETCH XML → PARSE TO JSON
    const parser = new Parser();
    const feed = await parser.parseURL(
      "https://feeds.soundcloud.com/users/soundcloud:users:838970026/sounds.rss"
    );

    // 2. FILTER ONLY TODAY'S ITEM
    const today = new Date().toDateString();

    const todaysItem = feed.items.find(item => {
      const pub = new Date(item.pubDate);
      return pub.toDateString() === today;
    });

    // 3. IF NO ITEM TODAY → RETURN EMPTY RSS FEED
    if (!todaysItem) {
      const emptyRSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>No Item Today</title>
    <description>No SoundCloud item was published today.</description>
  </channel>
</rss>`;

      res.setHeader("Content-Type", "application/xml");
      return res.status(200).send(emptyRSS);
    }

    // 4. CONVERT JSON BACK TO MINIMAL RSS XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>SoundCloud Daily Feed</title>
    <link>https://soundcloud.com</link>
    <description>Only today's SoundCloud item</description>

    <item>
      <title>${todaysItem.title}</title>
      <link>${todaysItem.link}</link>
      <pubDate>${todaysItem.pubDate}</pubDate>
      <description><![CDATA[${todaysItem.description || ""}]]></description>
      <enclosure url="${todaysItem.enclosure?.url || ""}" type="audio/mpeg" />
      <guid>${todaysItem.guid}</guid>
    </item>

  </channel>
</rss>`;

    // 5. RETURN RSS XML
    res.setHeader("Content-Type", "application/xml");
    res.status(200).send(xml);

  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch or process RSS feed",
      details: error.message
    });
  }
}
