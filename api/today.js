import Parser from "rss-parser";

export default async function handler(req, res) {
  try {
    const parser = new Parser({
      customFields: {
        item: [
          ["itunes:summary", "itunesSummary"],
          ["itunes:subtitle", "itunesSubtitle"],
          ["itunes:author", "itunesAuthor"],
          ["itunes:duration", "itunesDuration"],
          ["itunes:image", "itunesImage", { keepArray: false }]
        ]
      }
    });

    const feed = await parser.parseURL(
      "https://feeds.soundcloud.com/users/soundcloud:users:838970026/sounds.rss"
    );

    // TODAY (local server date)
    const today = new Date();
    const todayString = today.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    }); 
    // Example: "March 5, 2026"

    // FUNCTION: Extract date from text like:
    // "Daily Mass Reading Podcast for March 5, 2026"
    function extractDate(text) {
      const match = text.match(/for ([A-Za-z]+ \d{1,2}, \d{4})/);
      return match ? match[1] : null;
    }

    // FIND TODAY'S ITEM BY MATCHING THE DATE INSIDE THE TEXT
    const todaysItem = feed.items.find(item => {
      const text =
        item.title ||
        item.itunesSummary ||
        item.description ||
        "";

      const extracted = extractDate(text);
      return extracted === todayString;
    });

    // IF NO MATCH → RETURN EMPTY RSS
    if (!todaysItem) {
      const emptyRSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>No Item Today</title>
    <description>No matching SoundCloud item for ${todayString}</description>
  </channel>
</rss>`;

      res.setHeader("Content-Type", "application/xml");
      return res.status(200).send(emptyRSS);
    }

    // BUILD MINIMAL RSS WITH TODAY'S ITEM
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>SoundCloud Daily Feed</title>
    <link>https://soundcloud.com</link>
    <description>Only today's SoundCloud item</description>

    <item>
      <guid isPermaLink="false">${todaysItem.guid}</guid>
      <title>${todaysItem.title}</title>
      <pubDate>${todaysItem.pubDate}</pubDate>
      <link>${todaysItem.link}</link>
      <itunes:duration>${todaysItem.itunesDuration}</itunes:duration>
      <itunes:author>${todaysItem.itunesAuthor}</itunes:author>
      <itunes:explicit>no</itunes:explicit>
      <itunes:summary>${todaysItem.itunesSummary}</itunes:summary>
      <itunes:subtitle>${todaysItem.itunesSubtitle}</itunes:subtitle>
      <description><![CDATA[${todaysItem.description}]]></description>
      <enclosure type="audio/mpeg" url="${todaysItem.enclosure.url}" length="${todaysItem.enclosure.length}"/>
      <itunes:image href="${todaysItem.itunesImage?.href || ""}"/>
    </item>

  </channel>
</rss>`;

    res.setHeader("Content-Type", "application/xml");
    res.status(200).send(xml);

  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch or process RSS feed",
      details: error.message
    });
  }
}
