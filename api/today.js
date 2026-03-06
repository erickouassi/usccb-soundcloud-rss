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
        ],
        feed: [
          ["itunes:subtitle", "itunesSubtitle"],
          ["itunes:author", "itunesAuthor"],
          ["itunes:image", "itunesImage", { keepArray: false }],
          ["itunes:category", "itunesCategory", { keepArray: false }],
          ["itunes:owner", "itunesOwner", { keepArray: false }]
        ]
      }
    });

    // 1. FETCH RSS
    const feed = await parser.parseURL(
      "https://feeds.soundcloud.com/users/soundcloud:users:838970026/sounds.rss"
    );

    // 2. TODAY'S DATE (formatted like "March 5, 2026")
    const today = new Date();
    const todayString = today.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    // 3. Extract date from text like:
    // "Daily Mass Reading Podcast for March 5, 2026"
    function extractDate(text) {
      const match = text.match(/for ([A-Za-z]+ \d{1,2}, \d{4})/);
      return match ? match[1] : null;
    }

    // 4. FIND TODAY'S ITEM
    const todaysItem = feed.items.find(item => {
      const text =
        item.title ||
        item.itunesSummary ||
        item.description ||
        "";
      const extracted = extractDate(text);
      return extracted === todayString;
    });

    // 5. IF NO MATCH → RETURN EMPTY RSS
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

    // 6. BUILD FULL RSS FEED WITH CHANNEL METADATA + TODAY'S ITEM
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
     xmlns:atom="http://www.w3.org/2005/Atom">

  <channel>
    <atom:link href="${feed.link}" rel="self" type="application/rss+xml"/>
    <title>${feed.title}</title>
    <link>${feed.link}</link>
    <pubDate>${feed.pubDate}</pubDate>
    <lastBuildDate>${feed.lastBuildDate}</lastBuildDate>
    <ttl>${feed.ttl}</ttl>
    <language>${feed.language}</language>
    <copyright>${feed.copyright}</copyright>
    <webMaster>${feed.webMaster}</webMaster>
    <description>${feed.description}</description>
    <itunes:subtitle>${feed.itunesSubtitle}</itunes:subtitle>
    <itunes:author>${feed.itunesAuthor}</itunes:author>
    <itunes:explicit>no</itunes:explicit>
    <itunes:image href="${feed.itunesImage?.href || ""}"/>
    <itunes:category text="${feed.itunesCategory?.text || ""}"/>

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
      <enclosure type="audio/mpeg"
                 url="${todaysItem.enclosure.url}"
                 length="${todaysItem.enclosure.length}"/>
      <itunes:image href="${todaysItem.itunesImage?.href || ""}"/>
    </item>

  </channel>
</rss>`;

    // 7. RETURN XML
    res.setHeader("Content-Type", "application/xml");
    res.status(200).send(xml);

  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch or process RSS feed",
      details: error.message
    });
  }
}
