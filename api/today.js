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

    // 1. FETCH USCCB FEED
    const feed = await parser.parseURL(
      "https://feeds.feedburner.com/usccb/zhqs"
    );

    // 2. TODAY (formatted like "March 5, 2026")
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

    // 4. FIND ALL ITEMS FOR TODAY (using extracted date)
    const todaysItems = feed.items.filter(item => {
      const text =
        item.title ||
        item.itunesSummary ||
        item.description ||
        "";
      const extracted = extractDate(text);
      return extracted === todayString;
    });

    // 5. IF NO MATCH → RETURN EMPTY RSS
    if (todaysItems.length === 0) {
      const emptyRSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>No Items Today</title>
    <description>No USCCB items found for ${todayString}</description>
  </channel>
</rss>`;
      res.setHeader("Content-Type", "application/xml");
      return res.status(200).send(emptyRSS);
    }

    // 6. BUILD MULTIPLE <item> BLOCKS
    const itemsXML = todaysItems
      .map(item => {
        return `
    <item>
      <guid>${item.guid}</guid>
      <title>${item.title}</title>
      <pubDate>${item.pubDate}</pubDate>
      <link>${item.link}</link>
      <description><![CDATA[${item.description}]]></description>
      <enclosure url="${item.enclosure.url}" type="audio/mpeg" length="${item.enclosure.length}"/>
    </item>`;
      })
      .join("\n");

    // 7. BUILD FULL RSS FEED WITH CHANNEL METADATA + TODAY'S ITEMS
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
    <description>${feed.description}</description>

${itemsXML}

  </channel>
</rss>`;

    // 8. RETURN XML
    res.setHeader("Content-Type", "application/xml");
    res.status(200).send(xml);

  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch or process USCCB feed",
      details: error.message
    });
  }
}
